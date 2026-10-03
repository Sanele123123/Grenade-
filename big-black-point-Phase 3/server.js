const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bbp-data.json');
const KEY_FILE = path.join(DATA_DIR, '.dev-encryption-key');
const SITES_DIR = path.join(DATA_DIR, 'sites');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const ADMIN_TOKEN = process.env.BBP_ADMIN_TOKEN || 'bbp-local-admin';
const CALLBACK_URL = process.env.BBP_CALLBACK_URL || `http://${HOST}:${PORT}/api/callback`;
const REAL_OUTBOUND = process.env.BBP_ENABLE_REAL_OUTBOUND === 'true';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SITES_DIR, { recursive: true });

// Safety net: an unexpected error anywhere that isn't already caught should never
// take the whole server down — that would break every in-progress job for every
// user at once, not just the one request that hit the bug. Log it and keep running.
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception (server kept running):', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (server kept running):', reason);
});

function loadEncryptionKey() {
  if (process.env.BBP_ENCRYPTION_KEY) {
    return crypto.createHash('sha256').update(process.env.BBP_ENCRYPTION_KEY).digest();
  }
  if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('base64'), { mode: 0o600 });
  return Buffer.from(fs.readFileSync(KEY_FILE, 'utf8').trim(), 'base64');
}

const ENCRYPTION_KEY = loadEncryptionKey();
const SECRET_KEYS = new Set(['apiKey', 'signingSecret', 'accessToken', 'password']);

function emptyData() {
  return { settings: {}, sites: [], jobs: [], deliveries: [] };
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return emptyData();
  try { return { ...emptyData(), ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; }
  catch { return emptyData(); }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function encrypt(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `enc:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(value) {
  if (!value || !String(value).startsWith('enc:')) return value || '';
  try {
    const [, iv, tag, encrypted] = String(value).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

function storeSettings(value) {
  if (Array.isArray(value)) return value.map(storeSettings);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SECRET_KEYS.has(key) ? encrypt(item) : storeSettings(item),
  ]));
}

function exposeSettings(value) {
  if (Array.isArray(value)) return value.map(exposeSettings);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SECRET_KEYS.has(key) ? (decrypt(item) ? '********' : '') : exposeSettings(item),
  ]));
}

function mergeSettings(existing, incoming) {
  const merged = structuredClone(existing || {});
  for (const [section, fields] of Object.entries(incoming || {})) {
    merged[section] ||= {};
    for (const [key, value] of Object.entries(fields || {})) {
      if (SECRET_KEYS.has(key) && (value === '' || value === '********')) continue;
      merged[section][key] = SECRET_KEYS.has(key) ? encrypt(value) : value;
    }
  }
  return merged;
}

function publicJob(job) {
  const { timerIds, brief, aiResult, generatedFiles, uploads, ...visible } = job;
  return visible;
}

function publicSite(site) {
  const { deployToken, ...visible } = site;
  return { ...visible, credentialsStored: Boolean(decrypt(deployToken || '')) };
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 30_000_000) reject(new Error('Request body too large (30MB limit)'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function requireAdmin(req, res) {
  if ((req.headers.authorization || '') !== `Bearer ${ADMIN_TOKEN}`) {
    json(res, 401, { error: 'Admin authorization required' });
    return false;
  }
  return true;
}

function webhookSecret(data) {
  return decrypt(data.settings?.webhooks?.signingSecret || '');
}

function signPayload(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function sendWebhook(data, event, body) {
  const url = data.settings?.webhooks?.outgoingUrl;
  const secret = webhookSecret(data);
  const delivery = { id: crypto.randomUUID(), event, url: url || '', createdAt: new Date().toISOString(), status: 'simulated' };
  data.deliveries.unshift(delivery);
  data.deliveries = data.deliveries.slice(0, 30);
  saveData(data);
  if (!REAL_OUTBOUND || !url) return delivery;
  const payload = JSON.stringify({ event, ...body });
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BBP-Signature': signPayload(secret, payload) },
    body: payload,
  });
  delivery.status = response.ok ? 'delivered' : `http-${response.status}`;
  saveData(data);
  return delivery;
}

// ── AI provider config & test ──────────────────────────────────────────────

function aiConfig(data, provider) {
  const settings = data.settings?.[provider] || {};
  const apiKey = decrypt(settings.apiKey || '');
  if (!apiKey) throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Claude'} API key is required`);
  return { apiKey, model: settings.model || (provider === 'openai' ? 'gpt-5.5' : 'claude-sonnet-5') };
}

async function testAiProvider(data, provider) {
  const cfg = aiConfig(data, provider);
  const label = provider === 'openai' ? 'OpenAI Responses API' : 'Claude Messages API';
  if (!REAL_OUTBOUND) {
    return {
      ok: true,
      provider,
      simulated: true,
      message: `${label} configuration saved. Enable real outbound mode to perform a live model request.`,
      checks: [
        { label: 'API key', status: 'ok', detail: 'Saved encrypted' },
        { label: 'Model', status: 'ok', detail: cfg.model },
        { label: 'Live model call', status: 'warn', detail: 'Simulation mode' },
      ],
    };
  }
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, input: 'Return only: ok', max_output_tokens: 8 }),
    });
    if (!response.ok) throw new Error(`OpenAI test failed with HTTP ${response.status}`);
  } else {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, max_tokens: 8, messages: [{ role: 'user', content: 'Return only: ok' }] }),
    });
    if (!response.ok) throw new Error(`Claude test failed with HTTP ${response.status}`);
  }
  return {
    ok: true,
    provider,
    simulated: false,
    checks: [
      { label: 'API key', status: 'ok', detail: 'Accepted' },
      { label: 'Model', status: 'ok', detail: cfg.model },
      { label: 'Live model call', status: 'ok', detail: 'Connected' },
    ],
  };
}

// ── Recraft logo generation adapter ─────────────────────────────────────
// Docs: https://www.recraft.ai/docs/api-reference/endpoints
// Bearer auth, base https://external.api.recraft.ai/v1. Logos are requested
// from the /images/generations/vector endpoint so results come back as
// scalable vector art rather than raster images, which is what a proper
// logo actually needs.

function recraftConfig(data) {
  const settings = data.settings?.recraft || {};
  const apiKey = decrypt(settings.apiKey || '');
  if (!apiKey) throw new Error('Recraft API key is required');
  return { apiKey };
}

async function testRecraftProvider(data) {
  const cfg = recraftConfig(data);
  if (!REAL_OUTBOUND) {
    return {
      ok: true,
      provider: 'recraft',
      simulated: true,
      message: 'Recraft configuration saved. Enable real outbound mode to check the account and generate real logos.',
      checks: [
        { label: 'API key', status: 'ok', detail: 'Saved encrypted' },
        { label: 'Account check', status: 'warn', detail: 'Simulation mode' },
      ],
    };
  }
  const response = await fetch('https://external.api.recraft.ai/v1/users/me', {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Recraft test failed with HTTP ${response.status}: ${body?.message || JSON.stringify(body).slice(0, 200)}`);
  return {
    ok: true,
    provider: 'recraft',
    simulated: false,
    checks: [
      { label: 'API key', status: 'ok', detail: 'Accepted' },
      { label: 'Account', status: 'ok', detail: body.email || body.name || 'Connected' },
      { label: 'Credits remaining', status: 'ok', detail: body.credits != null ? String(body.credits) : 'n/a' },
    ],
  };
}

async function generateLogo(data, prompt) {
  const cfg = recraftConfig(data);
  const response = await fetch('https://external.api.recraft.ai/v1/images/generations/vector', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, n: 1, style: 'vector_illustration' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Recraft logo generation failed with HTTP ${response.status}: ${body?.message || JSON.stringify(body).slice(0, 300)}`);
  const url = body.data?.[0]?.url;
  if (!url) throw new Error('Recraft did not return an image URL');
  return url;
}

// Two distinct prompts (icon+text combination mark, text-only wordmark) need two
// separate Recraft calls — the API generates n variations of one prompt, not one
// variation per prompt in a single request.
async function generateLogoSet(data, prompts) {
  recraftConfig(data); // throws early with a clear error if the key is missing, before any network calls
  if (!REAL_OUTBOUND) {
    return { ok: true, simulated: true, logos: [] };
  }
  const logos = await Promise.all(prompts.map(prompt => generateLogo(data, prompt)));
  return { ok: true, simulated: false, logos };
}

// Photos (not vector art) — one prompt, n variations, using Recraft's raster
// endpoint with a photographic style so results look like real photography
// rather than illustration.
async function generateImage(data, prompt) {
  const cfg = recraftConfig(data);
  const response = await fetch('https://external.api.recraft.ai/v1/images/generations/raster', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, n: 1, style: 'realistic_image' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Recraft image generation failed with HTTP ${response.status}: ${body?.message || JSON.stringify(body).slice(0, 300)}`);
  const url = body.data?.[0]?.url;
  if (!url) throw new Error('Recraft did not return an image URL');
  return url;
}

// Four genuinely distinct prompts, not one prompt asking for 4 things at once —
// Recraft's `n` parameter generates variations of a single prompt, not one
// result per listed item, so a single "give me 4 different shots" prompt
// reliably produces 4 near-duplicates of whichever shot dominates the text.
async function generateImageSet(data, prompts) {
  recraftConfig(data); // throws early with a clear error if the key is missing, before any network calls
  if (!REAL_OUTBOUND) {
    return { ok: true, simulated: true, images: [] };
  }
  const images = await Promise.all(prompts.map(prompt => generateImage(data, prompt)));
  return { ok: true, simulated: false, images };
}

function hasSecret(value) {
  return Boolean(decrypt(value || ''));
}

// ── Netlify hosting adapter ────────────────────────────────────────────────
// Production deploys use the Netlify API (https://docs.netlify.com/api/get-started/).
// A Personal Access Token is required; sites are created/updated and a ZIP or
// digest deploy is pushed. In simulation mode (default) no network calls are made.

function netlifyConfig(data) {
  const hosting = data.settings?.hosting || {};
  const accessToken = decrypt(hosting.accessToken || '');
  if (!accessToken) throw new Error('Netlify access token is required');
  return { accessToken, siteId: hosting.siteId || '', teamSlug: hosting.teamSlug || '' };
}

async function netlifyRequest(data, method, endpoint, body, isFormData) {
  const cfg = netlifyConfig(data);
  const url = `https://api.netlify.com/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (!REAL_OUTBOUND) {
    return { ok: true, simulated: true, method, url, body: isFormData ? '<binary deploy payload>' : (body || null) };
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      Accept: 'application/json',
      ...(isFormData ? { 'Content-Type': 'application/zip' } : (body ? { 'Content-Type': 'application/json' } : {})),
    },
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!response.ok) throw new Error(`Netlify ${method} ${endpoint} failed with HTTP ${response.status}: ${typeof parsed === 'string' ? parsed.slice(0, 300) : JSON.stringify(parsed).slice(0, 300)}`);
  return { ok: true, simulated: false, status: response.status, data: parsed };
}

async function testHostingProvider(data) {
  const provider = data.settings?.hosting?.provider || 'netlify';
  if (provider !== 'netlify') {
    return {
      ok: true,
      provider: 'hosting',
      selectedProvider: provider,
      simulated: true,
      message: 'Configuration accepted. Enable real outbound mode to perform a live provider request.',
      checks: [
        { label: 'Provider selected', status: provider ? 'ok' : 'warn', detail: provider || 'Missing' },
        { label: 'Live API test', status: 'warn', detail: 'Simulation mode' },
      ],
    };
  }
  const cfg = netlifyConfig(data);
  const simulatedChecks = [
    { label: 'Netlify API base', status: 'ok', detail: 'https://api.netlify.com/api/v1' },
    { label: 'Access token', status: 'ok', detail: 'Saved encrypted' },
    { label: 'Site target', status: cfg.siteId ? 'ok' : 'warn', detail: cfg.siteId || 'New site created per job' },
    { label: 'Deploy call', status: REAL_OUTBOUND ? 'ok' : 'warn', detail: REAL_OUTBOUND ? 'Ready to call Deploy API' : 'Simulated until live mode' },
  ];
  if (!REAL_OUTBOUND) {
    return { ok: true, provider: 'hosting', selectedProvider: 'netlify', simulated: true, message: 'Netlify credentials saved. Enable real outbound mode to test the account endpoint.', checks: simulatedChecks };
  }
  const result = await netlifyRequest(data, 'GET', '/user');
  return { ok: true, provider: 'hosting', selectedProvider: 'netlify', simulated: false, result, checks: simulatedChecks };
}

function buildPreflight(data) {
  const hosting = data.settings?.hosting || {};
  const webhooks = data.settings?.webhooks || {};
  const aiProvider = webhooks.aiProvider || 'claude';
  const providerSettings = data.settings?.[aiProvider] || {};
  const checks = [
    {
      key: 'admin',
      label: 'Admin authorization',
      status: 'ok',
      detail: 'Bearer token accepted',
    },
    {
      key: 'ai',
      label: `${aiProvider === 'openai' ? 'OpenAI' : 'Claude'} provider`,
      status: hasSecret(providerSettings.apiKey) ? 'ok' : 'fail',
      detail: hasSecret(providerSettings.apiKey) ? `${providerSettings.model || 'model'} saved` : 'API key missing',
    },
    {
      key: 'hosting',
      label: 'Hosting provider',
      status: hosting.provider ? 'ok' : 'fail',
      detail: hosting.provider || 'No hosting provider selected',
    },
    {
      key: 'netlify-auth',
      label: 'Netlify access token',
      status: hosting.provider === 'netlify'
        ? (hasSecret(hosting.accessToken) ? 'ok' : 'fail')
        : 'warn',
      detail: hosting.provider === 'netlify' ? 'Personal access token' : 'Not using Netlify',
    },
    {
      key: 'delivery',
      label: 'Delivery mode',
      status: (webhooks.mode || 'direct') === 'direct' || /^https?:\/\//.test(webhooks.outgoingUrl || '') ? 'ok' : 'warn',
      detail: (webhooks.mode || 'direct') === 'direct' ? 'Direct build' : (webhooks.outgoingUrl || 'Webhook URL missing'),
    },
    {
      key: 'outbound',
      label: 'External requests',
      status: REAL_OUTBOUND ? 'warn' : 'ok',
      detail: REAL_OUTBOUND ? 'Live production mode' : 'Simulation mode',
    },
  ];
  const fails = checks.filter(item => item.status === 'fail').length;
  const warns = checks.filter(item => item.status === 'warn').length;
  return {
    ok: fails === 0,
    mode: REAL_OUTBOUND ? 'live' : 'simulation',
    missing: fails,
    warnings: warns,
    checks,
    summary: fails === 0 ? (warns ? 'Ready with warnings' : 'Ready to build') : `${fails} required item${fails === 1 ? '' : 's'} missing`,
  };
}

// ── Build pipeline: Claude/OpenAI -> static HTML/CSS/JS -> Netlify ─────────

function siteSlugFromJob(job) {
  const raw = job.domain || job.name || `bbp-${job.id}`;
  const base = String(raw)
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'bbp-site';
  // Append a short suffix from the job id so retrying/rerunning a job with the
  // same project name never collides with a site already created by an earlier attempt.
  const suffix = String(job.id).replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase();
  return suffix ? `${base}-${suffix}` : base;
}

function siteOutputDir(job) {
  return path.join(SITES_DIR, job.id);
}

// System-level instructions sent with every build request — establishes how the model
// should behave as a website builder, separate from buildAiInstruction() below, which
// carries the specific per-job JSON brief. Kept as one constant so it's consistent and
// easy to tune in one place.
const SYSTEM_PROMPT_DEFAULT = `{
  "role": "You are the website build engine for Big Black Point (BBP), a service that builds simple, professional websites for South African small and medium businesses from a structured client intake brief. Your output is a real, ready-to-launch website for a specific small business — not a demo, template, or mockup.",
  "audience": {
    "context": "Most visitors will be on mobile phones, browsing from South Africa, often arriving via WhatsApp, word of mouth, or a local Google search.",
    "build_priorities": [
      "mobile-first",
      "fast-loading",
      "clear"
    ]
  },
  "design_translation": {
    "note": "The brief's look_feel section gives structured signals to interpret, not literal instructions.",
    "personality": "e.g. \\"Friendly — Approachable\\", \\"Prestigious — Luxurious\\" — should shape both the visual tone and the actual words written. A \\"Craft — Artisanal\\" bakery should read differently from a \\"Prestigious — Luxurious\\" real estate agency.",
    "theme": "Heritage / Retro / Contemporary / Modern — should inform typography, spacing, and imagery treatment, not just be a label.",
    "color_palette": "Gives a palette family (e.g. \\"Warm\\", \\"Ocean\\") — choose specific hex values within that family; don't fall back to generic grey placeholders.",
    "typography": "Gives a style direction (Serif, Rounded, Slab Serif, etc.) — pick an actual web-safe or Google Fonts font that matches, and use it consistently.",
    "layout": "Describes the structural pattern (Card-based, Magazine Editorial, Single-column Longform, etc.) — build the actual page structure to match.",
    "visual_density": "Balanced / Rich / Dense — should affect how much content and how many sections appear per page."
  },
  "copy_rules": [
    "Write real, specific marketing copy from the brief — never lorem ipsum or \\"[insert text here]\\" placeholders.",
    "Use the business's actual name, what it does, its signature products, and any trust signals or testimonials given.",
    "If a section has no source content in the brief (e.g. no testimonials given), omit that section — never invent fake customer quotes, reviews, statistics, or awards."
  ],
  "calls_to_action": {
    "whatsapp": "If a WhatsApp number is present in business.contact_details.whatsapp, make the WhatsApp-related button a real clickable link in the form https://wa.me/<number in international format, digits only>. Convert a local South African 0-prefixed number to the 27 country code (e.g. \\"082 123 4567\\" becomes \\"27821234567\\").",
    "buttons": "Make sure the buttons and hero section actually drive toward cta.main_goal and use cta.primary_button_text."
  },
  "pages_and_structure": [
    "Build every page listed in pages.selected_pages, cross-linked with a consistent navigation menu and footer across all pages.",
    "Reflect trust.signals content (reviews, testimonials, awards & certificates, guarantees, statistics) wherever it's given, ideally in a dedicated section on the homepage or About page.",
    "If final.additional_languages includes more than the primary language, add a visible language switcher in the header, but only generate content in final.primary_language for now — the switcher can be structurally present without full translations yet."
  ],
  "technical_conventions": [
    "Plain HTML5, CSS, and vanilla JS only. No build tools, no npm packages, no frameworks (React, Vue, Bootstrap, Tailwind, etc.), no WordPress.",
    "Fully responsive, mobile-first CSS.",
    "Semantic HTML (nav, header, main, section, footer, correct heading hierarchy) and basic accessibility (alt text on every image, sufficient color contrast, visible focus states).",
    "Include a <title> and a <meta name=\\"description\\"> on every page, tailored to that page's content.",
    "Keep JS minimal — small interactive touches only (mobile nav toggle, smooth scroll, basic form validation). No animation libraries.",
    "Reference uploaded assets (logos, photos) by the filename given in the brief (e.g. <img src=\\"assets/logo.png\\" alt=\\"...\\">). You do not have the actual image files, so never describe or invent their visual contents — just reference them correctly by name, with sensible fallback styling in case the file is missing.",
    "The header must be built as three clearly separate groups in one row, left to right: the logo, then the navigation links, then the CTA buttons (e.g. Book Now, WhatsApp Us). Use a flex layout (e.g. justify-content: space-between) so each group has its own space. The logo must always be the leftmost element, standing alone \u2014 it must never sit underneath, behind, inside, or visually merged with a nav link; if this ever happens, it is a bug and must be fixed by giving the logo its own separate container distinct from the nav list.",
    "The logo image itself must be genuinely prominent and legible, not a small icon that's barely visible \u2014 target roughly 40-56px tall on desktop (and no smaller than about 32px on mobile), scaled to keep its aspect ratio. Don't wrap it in a container with its own padding, background box, or border that shrinks the visible mark further \u2014 the logo file itself should be what fills that height, edge to edge.",
    "The header bar itself must be at least 76-96px tall on desktop (at least 64px on mobile) with generous vertical padding \u2014 a short, cramped header is the main reason a correctly-sized logo still ends up looking small, since it has no room to breathe.",
    "Buttons such as Book Now or WhatsApp Us must always fit their full label on a single line \u2014 never let a button's own text wrap onto two lines inside a pill or rounded shape. Size each button's width and horizontal padding to comfortably fit its own label (white-space: nowrap), don't force it into a small fixed width."
  ],
  "never_do": [
    "Don't produce a generic, could-be-any-business template — every design decision should trace back to something specific in the brief.",
    "Don't invent testimonials, statistics, awards, or reviews that weren't provided.",
    "Don't add pages, sections, or content types that weren't requested in the brief.",
    "Don't leave placeholder text like \\"Lorem ipsum\\" or \\"[Your text here]\\" anywhere in the output."
  ]
}`;

// Returns whichever system prompt is actually in force right now — a saved
// custom override if one exists, otherwise the built-in default above. This is
// what every real build actually sends to Claude, so an edit made in the
// Integrations UI takes effect on the very next build with no code change needed.
function getActiveSystemPrompt(data) {
  const custom = data.settings?.claude?.systemPrompt;
  return typeof custom === 'string' && custom.trim() ? custom : SYSTEM_PROMPT_DEFAULT;
}

function buildAiInstruction(job) {
  const pages = job.brief?.pages?.selected_pages || [];
  const pageList = pages.length ? pages : ['home', 'about'];
  const assetFiles = job.assetFiles || {};
  const uploads = assetFiles.uploads || [];
  const hasRealAssets = Boolean(assetFiles.logo) || (assetFiles.images && assetFiles.images.length) || uploads.length;
  const assetNote = hasRealAssets
    ? {
        status: 'These real image files already exist and will be deployed alongside your HTML — use these exact paths, do not invent different filenames or paths.',
        logo_file: assetFiles.logo || null,
        image_files: assetFiles.images || [],
        uploaded_files: uploads.length ? uploads.map(u => ({ file: u.file, what_it_is: u.description || 'A real uploaded file from the client.' })) : undefined,
        uploaded_files_instruction: uploads.length ? 'Every file listed in uploaded_files is real and must be genuinely displayed on the site somewhere appropriate (using its exact path in an <img> tag), not just referenced or described in text. For example, an uploaded certificate/award image must actually appear as an image on the page, not just be mentioned in a sentence.' : undefined,
      }
    : 'Any uploaded images, logos, or photos referenced in the brief are given only as filenames, not as actual image files — you do not have their real contents. Reference them by filename in the HTML (e.g. <img src="assets/logo.png">) so the client can drop the real files in later, and do not invent a visual description of what they contain.';
  const isRevision = Boolean(job.pendingFeedback);
  const payload = {
    task: isRevision
      ? 'Revise the previously generated website based on the feedback below. This is a revision, not a fresh rebuild — keep everything that the feedback did not mention exactly the same as it was.'
      : 'Generate a complete static website for this business from the structured JSON brief provided.',
    output_format: {
      languages: 'Plain HTML5, CSS, and vanilla JS only — no build step, no framework, no WordPress.',
      generation_order: 'Generate styles.css and app.js FIRST, before any HTML page. These two shared files are required — every page links to them, so a page with no CSS is broken. Only generate the HTML pages after both shared files are complete.',
      pages: `One HTML file per page listed in pages_to_build below. Name the homepage index.html, and every other page <page-name>.html (e.g. about.html, contact.html), using the same page names given.`,
      pages_to_build: pageList,
      shared_files: 'A single shared styles.css and a single shared app.js, linked from every page. These are mandatory and must be returned in full — do not omit or abbreviate them even if running low on space; shorten page content instead if needed.',
      return_format: 'Return each file as its own fenced code block, with the exact filename immediately after the language tag on the same line, e.g. ```html index.html ... ``` — no commentary outside the code blocks. Return every file (all pages, styles.css, app.js) in full even on a revision — do not omit files that did not change.',
    },
    asset_note: assetNote,
    brief: job.brief || {},
  };
  if (isRevision) {
    payload.feedback = job.pendingFeedback;
    payload.previous_files = job.generatedFiles || {};
  }
  return JSON.stringify(payload, null, 2);
}

// Best-effort extraction of fenced code blocks (```html ... ```, ```css ... ```, ```js ... ```)
// from a model's text response into a { filename: contents } map. Falls back to a single
// index.html containing the raw response if no fenced blocks are found.
function extractFilesFromAiText(text) {
  const files = {};
  // The closing ``` must start its own line — this stops an inline/mid-sentence
  // triple-backtick inside generated page copy (e.g. a code example a tech
  // business's page might legitimately show) from being mistaken for the real
  // closing fence and silently truncating that file's content.
  const fenceRe = /```(\w+)?\s*([^\n]*)\n([\s\S]*?)\n```(?=\n|$)/g;
  let match;
  let found = false;
  while ((match = fenceRe.exec(text))) {
    found = true;
    const lang = (match[1] || '').toLowerCase();
    const hint = (match[2] || '').trim();
    const ext = lang === 'html' ? 'html' : lang === 'css' ? 'css' : lang === 'js' || lang === 'javascript' ? 'js' : null;
    let filename = hint.split(/\s+/).pop() || '';
    if (!filename || !/\.\w+$/.test(filename)) {
      filename = ext === 'html' ? 'index.html' : ext === 'css' ? 'styles.css' : ext === 'js' ? 'app.js' : null;
    }
    if (!filename) continue;
    files[filename] = match[3];
  }
  if (!found) files['index.html'] = text;
  return files;
}

// Appended to every generated stylesheet as a hard guarantee that the logo is
// genuinely visible, regardless of what CSS Claude actually wrote — repeated
// prompt-only attempts at this weren't reliable enough on their own.
const LOGO_CSS_OVERRIDE = `
/* Enforced by Big Black Point \u2014 keeps the header logo genuinely visible */
img[src*="logo" i], header img:first-of-type, nav img:first-of-type {
  height: 56px !important;
  width: auto !important;
  max-width: none !important;
  max-height: none !important;
}
@media (max-width: 640px) {
  img[src*="logo" i], header img:first-of-type, nav img:first-of-type {
    height: 40px !important;
  }
}
`;

function enforceLogoSizing(files) {
  if (files['styles.css']) files['styles.css'] += '\n' + LOGO_CSS_OVERRIDE;
  return files;
}

async function callAiBuildProvider(data, job) {
  const provider = job.provider || data.settings?.webhooks?.aiProvider || 'claude';
  const cfg = aiConfig(data, provider);
  const instruction = buildAiInstruction(job);
  if (!REAL_OUTBOUND) {
    return {
      ok: true,
      simulated: true,
      provider,
      model: cfg.model,
      summary: 'Simulated AI build: a static HTML/CSS/JS site would be generated from the JSON brief.',
      files: { 'index.html': '<!-- simulated build: enable BBP_ENABLE_REAL_OUTBOUND to generate real files -->' },
    };
  }
  let text;
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, instructions: getActiveSystemPrompt(data), input: instruction, max_output_tokens: 64000 }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`OpenAI build failed with HTTP ${response.status}: ${body.slice(0, 300)}`);
    text = body;
  } else {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, max_tokens: 64000, system: getActiveSystemPrompt(data), messages: [{ role: 'user', content: instruction }] }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`Claude build failed with HTTP ${response.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 300)}`);
    text = (body.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n');
  }
  const files = enforceLogoSizing(extractFilesFromAiText(text));
  const missingShared = ['styles.css', 'app.js'].filter(name => !files[name]);
  if (missingShared.length) {
    throw new Error(`AI build response is missing required shared file(s): ${missingShared.join(', ')}. This usually means the response was cut off before finishing (too many pages/too much content for one generation). Try reducing the number of pages, or retry this step.`);
  }
  if (!files['index.html']) {
    throw new Error('AI build response did not include index.html — the homepage is required.');
  }
  return { ok: true, simulated: false, provider, model: cfg.model, summary: `Generated ${Object.keys(files).length} file(s) from the JSON brief.`, files };
}

// A lightweight Claude call for small in-wizard text requests (e.g. suggesting a
// services/products list) — separate from callAiBuildProvider, which is for the
// full website build and always uses the much larger token budget/system prompt.
async function generateTextWithClaude(data, prompt) {
  const cfg = aiConfig(data, 'claude');
  if (!REAL_OUTBOUND) {
    return { ok: true, simulated: true, text: '' };
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Claude request failed with HTTP ${response.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 300)}`);
  const text = (body.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n');
  return { ok: true, simulated: false, text };
}

// Downloads one selected Recraft-hosted image and saves it as a real file in the
// job's site directory, so the final deployed site doesn't depend on Recraft's
// URL staying valid indefinitely — the actual bytes become part of the build.
async function downloadAsset(url, destDir, baseName) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download asset from Recraft: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  let ext = 'png';
  if (contentType.includes('svg')) ext = 'svg';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
  else if (contentType.includes('webp')) ext = 'webp';
  else if (contentType.includes('png')) ext = 'png';
  else {
    const match = url.match(/\.(svg|png|jpe?g|webp)(\?|$)/i);
    if (match) ext = match[1].toLowerCase().replace('jpeg', 'jpg');
  }
  const filename = `${baseName}.${ext}`;
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, filename), buffer);
  return `assets/${filename}`;
}

// Downloads whichever logo/images the client selected in the wizard (if any).
// Runs before ai-build so Claude can be told the exact real filenames to
// reference, rather than a placeholder path that may not match.
function guessExtFromMime(mimeType) {
  const map = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif' };
  return map[mimeType] || '';
}

async function downloadSelectedAssets(job) {
  const assets = job.brief?.assets || {};
  const logoUrl = assets.selected_logo_url || '';
  const imageUrls = Array.isArray(assets.selected_image_urls) ? assets.selected_image_urls : [];
  const uploads = job.uploads || {};
  const destDir = path.join(siteOutputDir(job), 'assets');

  // Save real uploaded files first — this is a purely local operation (decoding
  // base64 the client already sent), so it works even in simulation mode, unlike
  // the Recraft downloads below which need a real outbound network call.
  const uploadedAssets = [];
  for (const [key, upload] of Object.entries(uploads)) {
    if (!upload || !upload.base64) continue;
    try {
      const buffer = Buffer.from(upload.base64, 'base64');
      const ext = (upload.name && path.extname(upload.name)) || guessExtFromMime(upload.mimeType) || '.bin';
      const filename = `upload-${key}${ext}`;
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, filename), buffer);
      uploadedAssets.push({ field: key, file: `assets/${filename}`, description: upload.description || null });
    } catch (error) {
      // Skip a single bad/corrupt upload rather than failing the whole build over it.
    }
  }

  const hasRecraftSelections = Boolean(logoUrl) || imageUrls.length > 0;
  if (!REAL_OUTBOUND) {
    // Uploads (if any) were genuinely saved above regardless of REAL_OUTBOUND — only
    // flag this as "simulated" if there were Recraft selections that got skipped.
    return { ok: true, simulated: hasRecraftSelections, logo: null, images: [], uploads: uploadedAssets };
  }
  if (!hasRecraftSelections) {
    return { ok: true, simulated: false, logo: null, images: [], uploads: uploadedAssets };
  }
  const logo = logoUrl ? await downloadAsset(logoUrl, destDir, 'logo') : null;
  const images = [];
  for (let i = 0; i < imageUrls.length; i++) {
    images.push(await downloadAsset(imageUrls[i], destDir, `photo-${i + 1}`));
  }
  return { ok: true, simulated: false, logo, images, uploads: uploadedAssets };
}

function writeSiteFiles(job, files) {
  const dir = siteOutputDir(job);
  fs.mkdirSync(dir, { recursive: true });
  for (const [filename, contents] of Object.entries(files || {})) {
    const target = path.join(dir, filename);
    if (!target.startsWith(dir)) continue; // guard against path traversal in filenames
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents ?? '');
  }
  return { ok: true, simulated: !REAL_OUTBOUND, dir, fileCount: Object.keys(files || {}).length };
}

// Builds a minimal ZIP (stored, uncompressed entries) from the site's output directory
// so it can be pushed to Netlify's zip-deploy endpoint without an external dependency.
function buildZipBuffer(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
    return table;
  })();
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crc32Table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  for (const file of files) {
    const nameBuf = Buffer.from(file.rel, 'utf8');
    const crc = crc32(file.data);
    const size = file.data.length;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuf, file.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + file.data.length;
  }
  const centralStart = offset;
  const centralBuf = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralBuf, end]);
}

function zipSiteDirectory(dir) {
  const files = [];
  function walk(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else files.push({ rel, data: fs.readFileSync(full) });
    }
  }
  if (fs.existsSync(dir)) walk(dir, '');
  return buildZipBuffer(files);
}

// Zips an in-memory {filename: textContent} object directly — used for the
// "download all generated files" button, without needing them written to disk.
function zipFilesObject(filesObj) {
  const files = Object.entries(filesObj || {}).map(([rel, content]) => ({ rel, data: Buffer.from(String(content), 'utf8') }));
  return buildZipBuffer(files);
}

async function deployToNetlify(data, job) {
  const cfg = netlifyConfig(data);
  const dir = siteOutputDir(job);
  if (!REAL_OUTBOUND) {
    return { ok: true, simulated: true, provider: 'netlify', siteUrl: `https://${siteSlugFromJob(job)}.netlify.app` };
  }
  const zip = zipSiteDirectory(dir);
  let siteId = cfg.siteId;
  let adminUrl = null;
  if (!siteId) {
    const createEndpoint = cfg.teamSlug ? `/${cfg.teamSlug}/sites` : '/sites';
    const created = await netlifyRequest(data, 'POST', createEndpoint, { name: siteSlugFromJob(job) });
    siteId = created.data?.id;
    adminUrl = created.data?.admin_url || null;
    if (!siteId) throw new Error('Netlify did not return a site id when creating the site');
  }
  const deploy = await netlifyRequest(data, 'POST', `/sites/${siteId}/deploys`, zip, true);
  const siteUrl = deploy.data?.ssl_url || deploy.data?.url || `https://${siteSlugFromJob(job)}.netlify.app`;
  if (!adminUrl) adminUrl = deploy.data?.admin_url || null;
  return { ok: true, simulated: false, provider: 'netlify', siteId, siteUrl, adminUrl, deploy: deploy.data };
}

function ensureDeployedSiteRecord(data, job, siteUrl) {
  if (data.sites.some(site => site.jobId === job.id)) return;
  data.sites.unshift({
    id: crypto.randomUUID(),
    jobId: job.id,
    provider: 'netlify',
    name: job.name,
    url: siteUrl,
    adminUrl: job.adminUrl || null,
    status: 'live',
    lastCheckedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}

async function runBuildOperation(data, job, operation) {
  if (operation === 'download-assets') return downloadSelectedAssets(job);
  if (operation === 'ai-build') return callAiBuildProvider(data, job);
  if (operation === 'write-files') return writeSiteFiles(job, job.generatedFiles || {});
  if (operation === 'netlify-deploy') return deployToNetlify(data, job);
  return { ok: true, simulated: true, endpoint: null };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runStages(jobId, stages) {
  for (const next of stages) {
    await delay(1200);
    const data = loadData();
    const job = data.jobs.find(item => item.id === jobId);
    if (!job || job.status === 'cancelled' || job.status === 'failed') return;
    job.status = next.status;
    job.stage = next.stage;
    job.updatedAt = new Date().toISOString();
    if (next.operation) {
      try {
        const result = await runBuildOperation(data, job, next.operation);
        job.operations ||= [];
        job.operations.push({ name: next.operation, simulated: result.simulated, completedAt: new Date().toISOString() });
        if (next.operation === 'download-assets') {
          job.assetFiles = { logo: result.logo || null, images: result.images || [], uploads: result.uploads || [] };
        }
        if (next.operation === 'ai-build') {
          job.aiResult = result.summary || '';
          job.generatedFiles = result.files || {};
          job.pendingFeedback = null; // consumed, if this was a revision
        }
        if (next.operation === 'netlify-deploy') { job.site = result.siteUrl || null; job.adminUrl = result.adminUrl || null; }
      } catch (error) {
        job.status = 'failed';
        job.stage = error.message;
        job.updatedAt = new Date().toISOString();
        saveData(data);
        if (data.settings?.webhooks?.evFailure !== false) await sendWebhook(data, 'build.failed', { job: publicJob(job) });
        return; // stop the chain — later stages must not run after a failure
      }
    }
    if (next.status === 'done' && job.site) ensureDeployedSiteRecord(data, job, job.site);
    saveData(data);
    if (next.status === 'done' && data.settings?.webhooks?.evComplete !== false) {
      await sendWebhook(data, 'build.completed', { job: publicJob(job) });
    }
  }
}

// Builds the site and stops before Netlify — nothing gets deployed (no credits
// spent) until the client explicitly approves the preview.
async function runJob(jobId) {
  await runStages(jobId, [
    { status: 'building', stage: 'Downloading selected logo/images', operation: 'download-assets' },
    { status: 'building', stage: 'Calling AI build provider', operation: 'ai-build' },
    { status: 'building', stage: 'Writing static site files', operation: 'write-files' },
    { status: 'awaiting_approval', stage: 'Ready for review \u2014 approve to publish, or request changes' },
  ]);
}

// Runs once the client clicks Approve — this is the only path that ever calls Netlify.
async function runJobPublish(jobId) {
  await runStages(jobId, [
    { status: 'building', stage: 'Deploying to Netlify', operation: 'netlify-deploy' },
    { status: 'done', stage: 'Review ready' },
  ]);
}

// Runs when the client requests changes instead of approving — regenerates with
// their feedback plus the previously generated files, then returns to the same
// approval checkpoint (never touches Netlify).
async function runJobRevision(jobId, feedback) {
  const data = loadData();
  const job = data.jobs.find(item => item.id === jobId);
  if (!job) return;
  job.pendingFeedback = feedback;
  saveData(data);
  await runStages(jobId, [
    { status: 'building', stage: 'Calling AI build provider', operation: 'ai-build' },
    { status: 'building', stage: 'Writing static site files', operation: 'write-files' },
    { status: 'awaiting_approval', stage: 'Ready for review \u2014 approve to publish, or request changes' },
  ]);
}

async function retryJobStep(jobId, operation) {
  const data = loadData();
  const job = data.jobs.find(item => item.id === jobId);
  if (!job) throw new Error('Job not found');
  job.status = 'building';
  job.stage = `Retrying ${operation}`;
  job.updatedAt = new Date().toISOString();
  job.operations = (job.operations || []).filter(item => item.name !== operation);
  saveData(data);
  const fresh = loadData();
  const retryJob = fresh.jobs.find(item => item.id === jobId);
  try {
    const result = await runBuildOperation(fresh, retryJob, operation);
    retryJob.operations ||= [];
    retryJob.operations.push({ name: operation, simulated: result.simulated, retried: true, completedAt: new Date().toISOString() });
    if (operation === 'download-assets') retryJob.assetFiles = { logo: result.logo || null, images: result.images || [], uploads: result.uploads || [] };
    if (operation === 'ai-build') {
      retryJob.aiResult = result.summary || '';
      retryJob.generatedFiles = result.files || {};
    }
    if (operation === 'netlify-deploy') retryJob.site = result.siteUrl || retryJob.site;
    retryJob.status = 'done';
    retryJob.stage = 'Step retried successfully';
    retryJob.updatedAt = new Date().toISOString();
    saveData(fresh);
    return retryJob;
  } catch (error) {
    retryJob.status = 'failed';
    retryJob.stage = error.message;
    retryJob.updatedAt = new Date().toISOString();
    saveData(fresh);
    throw error;
  }
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/preview.html' : pathname;
  const file = path.join(ROOT, decodeURIComponent(requested));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  const ext = path.extname(file);
  const contentType = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(file).pipe(res);
  return true;
}

const PREVIEW_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
};

// Serves a job's generated site straight from our own server, before Netlify is
// ever involved — this is what the client reviews to decide Approve or Make
// changes. No admin token required, since this link is meant to be shared/viewed
// freely, but it's strictly confined to that one job's own directory.
// Injected into every HTML page served via /preview/<jobId>/ — lets the client
// click into text on the actual page and edit it directly, no separate editor.
// The Save action posts the page's real HTML back to the server; the button
// itself is always present, but the server enforces "only before publishing"
// when the save actually happens (see the preview-edit route below).
const PREVIEW_EDIT_SCRIPT = `
<script>
(function(){
  var TEXT_TAGS = ['h1','h2','h3','h4','h5','h6','p','span','a','button','li','td','th','blockquote','figcaption','label','strong','em','small'];
  var editing = false, dirty = false, undoStack = [];
  function isLeafTextEl(el){
    if(!el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    if(TEXT_TAGS.indexOf(tag)===-1) return false;
    var directText = Array.prototype.filter.call(el.childNodes, function(n){return n.nodeType===3;}).map(function(n){return n.textContent;}).join('').trim();
    var hasBlockChild = Array.prototype.some.call(el.children||[], function(c){return TEXT_TAGS.indexOf(c.tagName.toLowerCase())!==-1;});
    return directText.length>0 && !hasBlockChild;
  }
  function allTextEls(){ return Array.prototype.filter.call(document.body.querySelectorAll(TEXT_TAGS.join(',')), isLeafTextEl); }
  function setDirty(v){ dirty=v; var b=document.getElementById('__bbpSaveBtn'); if(b) b.style.display = v?'inline-block':'none'; }
  function removeEmptyEl(el){
    var parent = el.parentNode, next = el.nextSibling;
    undoStack.push({ html: el.outerHTML, parent: parent, next: next });
    parent.removeChild(el);
    setDirty(true);
    showUndoHint();
  }
  function showUndoHint(){
    var u=document.getElementById('__bbpUndoBtn'); if(u) u.style.display='inline-block';
  }
  function undoLast(){
    var last = undoStack.pop();
    if(!last) return;
    var wrap = document.createElement('div'); wrap.innerHTML = last.html;
    var restored = wrap.firstChild;
    if(last.next) last.parent.insertBefore(restored, last.next); else last.parent.appendChild(restored);
    bindOne(restored);
    if(!undoStack.length){ var u=document.getElementById('__bbpUndoBtn'); if(u) u.style.display='none'; }
  }
  function bindOne(el){
    el.addEventListener('blur', function(){
      var text = el.textContent.replace(/\\u00a0/g,' ').trim();
      if(!text){ removeEmptyEl(el); return; }
      setDirty(true);
    });
  }
  function toggleEdit(){
    editing = !editing;
    var els = allTextEls();
    els.forEach(function(el){
      el.setAttribute('contenteditable', editing ? 'true' : 'false');
      el.classList.toggle('__bbpEditable', editing);
      if(editing) bindOne(el);
    });
    var btn = document.getElementById('__bbpEditBtn');
    if(btn) btn.textContent = editing ? 'Editing text (click to stop)' : 'Edit text';
  }
  async function saveEdits(){
    var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    var parts = location.pathname.split('/').filter(Boolean);
    var jobId = parts[1];
    var file = parts.slice(2).join('/') || 'index.html';
    var btn = document.getElementById('__bbpSaveBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Saving\\u2026'; }
    try{
      var res = await fetch('/api/jobs/'+encodeURIComponent(jobId)+'/preview-edit', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ file: file, html: html })
      });
      var body = await res.json();
      if(!res.ok) throw new Error(body.error||'Save failed');
      if(btn){ btn.textContent = 'Saved'; setTimeout(function(){ setDirty(false); btn.disabled=false; btn.textContent='Save changes'; }, 1200); }
    }catch(err){
      if(btn){ btn.disabled=false; btn.textContent='Save changes'; }
      alert('Could not save: '+err.message);
    }
  }
  function init(){
    var bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;display:flex;gap:8px;font-family:sans-serif;font-size:13px';
    bar.innerHTML =
      '<button id="__bbpEditBtn" style="padding:10px 14px;border-radius:8px;border:1px solid #ccc;background:#111;color:#fff;cursor:pointer">Edit text</button>' +
      '<button id="__bbpUndoBtn" style="display:none;padding:10px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#111;cursor:pointer">Undo removed text</button>' +
      '<button id="__bbpSaveBtn" style="display:none;padding:10px 14px;border-radius:8px;border:none;background:#16a34a;color:#fff;cursor:pointer">Save changes</button>';
    document.body.appendChild(bar);
    var style = document.createElement('style');
    style.textContent = '.__bbpEditable{outline:2px dashed #3b82f6!important;outline-offset:2px;cursor:text}.__bbpEditable:hover{background:rgba(59,130,246,.06)}';
    document.head.appendChild(style);
    document.getElementById('__bbpEditBtn').addEventListener('click', toggleEdit);
    document.getElementById('__bbpUndoBtn').addEventListener('click', undoLast);
    document.getElementById('__bbpSaveBtn').addEventListener('click', saveEdits);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
</script>
</body>`;

function injectPreviewEditScript(html) {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, PREVIEW_EDIT_SCRIPT);
  return html + PREVIEW_EDIT_SCRIPT.replace('</body>', '');
}

function servePreview(req, res, jobId, subPath) {
  const jobDir = path.join(SITES_DIR, jobId);
  if (!fs.existsSync(jobDir) || !fs.statSync(jobDir).isDirectory()) {
    json(res, 404, { error: 'No preview available for this job yet' });
    return;
  }
  let relative = decodeURIComponent(subPath || '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const file = path.join(jobDir, relative);
  if (!file.startsWith(jobDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    json(res, 404, { error: 'File not found in this preview' });
    return;
  }
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html') {
    const html = fs.readFileSync(file, 'utf8');
    res.writeHead(200, { 'Content-Type': PREVIEW_MIME_TYPES[ext] });
    res.end(injectPreviewEditScript(html));
    return;
  }
  res.writeHead(200, { 'Content-Type': PREVIEW_MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const pathname = url.pathname;
  const previewMatch = pathname.match(/^\/preview\/([^/]+)(\/.*)?$/);
  if (previewMatch) {
    try {
      servePreview(req, res, previewMatch[1], previewMatch[2] || '/');
    } catch (error) {
      json(res, 400, { error: 'Invalid preview request' });
    }
    return;
  }
  if (!pathname.startsWith('/api/')) {
    try {
      if (!serveStatic(req, res, pathname)) json(res, 404, { error: 'Not found' });
    } catch (error) {
      json(res, 400, { error: 'Invalid request' });
    }
    return;
  }

  try {
    if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'bbp-engine', realOutbound: REAL_OUTBOUND });
    if (pathname === '/api/callback' && req.method === 'POST') {
      const raw = await new Promise(resolve => { let body = ''; req.on('data', c => body += c); req.on('end', () => resolve(body)); });
      const data = loadData();
      const secret = webhookSecret(data);
      const signature = req.headers['x-bbp-signature'] || '';
      const expected = signPayload(secret, raw);
      if (!secret || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return json(res, 401, { error: 'Invalid webhook signature' });
      const body = JSON.parse(raw || '{}');
      const job = data.jobs.find(item => item.id === body.jobId);
      if (!job) return json(res, 404, { error: 'Job not found' });
      Object.assign(job, { status: body.status || job.status, stage: body.stage || job.stage, site: body.site || job.site, updatedAt: new Date().toISOString() });
      saveData(data);
      return json(res, 200, { ok: true, job: publicJob(job) });
    }
    if (/^\/api\/jobs\/[^/]+\/preview-edit$/.test(pathname) && req.method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await readBody(req);
      const data = loadData();
      const job = data.jobs.find(item => item.id === id);
      if (!job) return json(res, 404, { error: 'Job not found' });
      if (job.status !== 'awaiting_approval') {
        const reason = job.status === 'failed' ? 'this build failed, so there\u2019s nothing to edit yet \u2014 retry or fix the build first.'
          : job.status === 'done' ? 'it has already been approved and published \u2014 editing here only works before approval.'
          : 'it\u2019s not at the review stage right now.';
        return json(res, 400, { error: `This site can\u2019t be edited here \u2014 ${reason}` });
      }
      const relFile = String(body.file || 'index.html').replace(/^\/+/, '');
      const jobDir = siteOutputDir(job);
      const targetFile = path.join(jobDir, relFile);
      if (!targetFile.startsWith(jobDir)) return json(res, 400, { error: 'Invalid file path' });
      if (!fs.existsSync(targetFile)) return json(res, 404, { error: 'File not found in this preview' });
      const html = String(body.html || '');
      if (!html.trim()) return json(res, 400, { error: 'Empty content' });
      fs.writeFileSync(targetFile, html);
      job.generatedFiles = job.generatedFiles || {};
      job.generatedFiles[relFile] = html;
      job.updatedAt = new Date().toISOString();
      saveData(data);
      return json(res, 200, { ok: true });
    }

    if (!requireAdmin(req, res)) return;
    const data = loadData();

    if (pathname === '/api/settings' && req.method === 'GET') return json(res, 200, { settings: exposeSettings(data.settings), callbackUrl: CALLBACK_URL });
    if (pathname === '/api/settings' && req.method === 'PUT') {
      data.settings = mergeSettings(data.settings, await readBody(req));
      saveData(data);
      return json(res, 200, { settings: exposeSettings(data.settings), callbackUrl: CALLBACK_URL });
    }
    if (pathname === '/api/preflight' && req.method === 'POST') return json(res, 200, buildPreflight(data));
    if (pathname === '/api/sites' && req.method === 'GET') return json(res, 200, { sites: data.sites.map(publicSite) });
    if (pathname === '/api/sites' && req.method === 'POST') {
      const body = await readBody(req);
      const site = { id: crypto.randomUUID(), name: body.name, url: body.url, provider: body.provider || 'netlify', deployToken: encrypt(body.deployToken || ''), status: 'pending', lastCheckedAt: null, createdAt: new Date().toISOString() };
      data.sites.unshift(site); saveData(data); return json(res, 201, { site: publicSite(site) });
    }
    if (/^\/api\/sites\/[^/]+$/.test(pathname) && req.method === 'DELETE') {
      const id = pathname.split('/').pop(); data.sites = data.sites.filter(site => site.id !== id); saveData(data); return json(res, 200, { ok: true });
    }
    if (/^\/api\/sites\/[^/]+\/test$/.test(pathname) && req.method === 'POST') {
      const id = pathname.split('/')[3]; const site = data.sites.find(item => item.id === id);
      if (!site) return json(res, 404, { error: 'Site not found' });
      site.status = 'connected'; site.lastCheckedAt = new Date().toISOString(); saveData(data); return json(res, 200, { site: publicSite(site), simulated: true });
    }
    if (pathname === '/api/jobs' && req.method === 'GET') return json(res, 200, { jobs: data.jobs.map(publicJob) });
    if (/^\/api\/jobs\/[^/]+\/files$/.test(pathname) && req.method === 'GET') {
      const id = pathname.split('/')[3]; const job = data.jobs.find(item => item.id === id);
      if (!job) return json(res, 404, { error: 'Job not found' });
      return json(res, 200, { files: job.generatedFiles || {}, aiResult: job.aiResult || '' });
    }
    if (/^\/api\/jobs\/[^/]+\/files\/zip$/.test(pathname) && req.method === 'GET') {
      const id = pathname.split('/')[3]; const job = data.jobs.find(item => item.id === id);
      if (!job) return json(res, 404, { error: 'Job not found' });
      const files = job.generatedFiles || {};
      if (!Object.keys(files).length) return json(res, 404, { error: 'No generated files for this job yet' });
      const zip = zipFilesObject(files);
      const filenameSafe = (job.name || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'website';
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filenameSafe}-files.zip"`,
      });
      res.end(zip);
      return;
    }
    if (pathname === '/api/deliveries' && req.method === 'GET') return json(res, 200, { deliveries: data.deliveries || [] });
    if (pathname === '/api/jobs' && req.method === 'POST') {
      const body = await readBody(req);
      const job = {
        id: crypto.randomUUID(),
        name: body.name,
        domain: body.domain || body.siteDomain || '',
        siteUrl: body.siteUrl || '',
        provider: body.provider || data.settings?.webhooks?.aiProvider || 'claude',
        brief: body.brief || {},
        uploads: body.uploads || {},
        status: 'pending',
        stage: 'Queued',
        site: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.jobs.unshift(job); saveData(data); runJob(job.id);
      if (data.settings?.webhooks?.evSubmit !== false) await sendWebhook(data, 'build.submitted', { job: publicJob(job), brief: body.brief || {} });
      return json(res, 202, { job: publicJob(job) });
    }
    if (/^\/api\/jobs\/[^/]+\/retry$/.test(pathname) && req.method === 'POST') {
      const id = pathname.split('/')[3]; const job = data.jobs.find(item => item.id === id);
      if (!job) return json(res, 404, { error: 'Job not found' });
      Object.assign(job, { status: 'pending', stage: 'Retry queued', site: null, updatedAt: new Date().toISOString() }); saveData(data); runJob(id); return json(res, 202, { job: publicJob(job) });
    }
    if (/^\/api\/jobs\/[^/]+\/retry-step$/.test(pathname) && req.method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await readBody(req);
      const job = await retryJobStep(id, body.operation || '');
      return json(res, 202, { job: publicJob(job) });
    }
    if (/^\/api\/jobs\/[^/]+\/approve$/.test(pathname) && req.method === 'POST') {
      const id = pathname.split('/')[3]; const job = data.jobs.find(item => item.id === id);
      if (!job) return json(res, 404, { error: 'Job not found' });
      if (job.status !== 'awaiting_approval') return json(res, 400, { error: 'This job is not waiting for approval right now' });
      Object.assign(job, { status: 'building', stage: 'Deploying to Netlify', updatedAt: new Date().toISOString() });
      saveData(data); runJobPublish(id);
      return json(res, 202, { job: publicJob(job) });
    }
    if (/^\/api\/jobs\/[^/]+\/revise$/.test(pathname) && req.method === 'POST') {
      const id = pathname.split('/')[3]; const job = data.jobs.find(item => item.id === id);
      if (!job) return json(res, 404, { error: 'Job not found' });
      if (job.status !== 'awaiting_approval') return json(res, 400, { error: 'This job is not waiting for approval right now' });
      const body = await readBody(req);
      const feedback = (body.feedback || '').trim();
      if (!feedback) return json(res, 400, { error: 'Feedback is required' });
      Object.assign(job, { status: 'building', stage: 'Calling AI build provider', updatedAt: new Date().toISOString() });
      saveData(data); runJobRevision(id, feedback);
      return json(res, 202, { job: publicJob(job) });
    }
    if (pathname === '/api/webhooks/test' && req.method === 'POST') {
      const delivery = await sendWebhook(data, 'webhook.test', { message: 'BBP webhook test' });
      return json(res, 202, { delivery, simulated: !REAL_OUTBOUND });
    }
    if (/^\/api\/providers\/(claude|openai|hosting|recraft)\/test$/.test(pathname) && req.method === 'POST') {
      const provider = pathname.split('/')[3];
      if (provider === 'hosting') return json(res, 200, await testHostingProvider(data));
      if (provider === 'recraft') return json(res, 200, await testRecraftProvider(data));
      return json(res, 200, await testAiProvider(data, provider));
    }
    if (pathname === '/api/logo/generate' && req.method === 'POST') {
      const body = await readBody(req);
      const prompts = (Array.isArray(body.prompts) ? body.prompts : [body.prompt]).map(p => (p || '').trim()).filter(Boolean);
      if (!prompts.length) return json(res, 400, { error: 'At least one prompt is required' });
      const result = await generateLogoSet(data, prompts);
      return json(res, 200, result);
    }
    if (pathname === '/api/images/generate' && req.method === 'POST') {
      const body = await readBody(req);
      const prompts = (Array.isArray(body.prompts) ? body.prompts : [body.prompt]).map(p => (p || '').trim()).filter(Boolean).slice(0, 4);
      if (!prompts.length) return json(res, 400, { error: 'At least one prompt is required' });
      const result = await generateImageSet(data, prompts);
      return json(res, 200, result);
    }
    if (pathname === '/api/text/generate' && req.method === 'POST') {
      const body = await readBody(req);
      const prompt = (body.prompt || '').trim();
      if (!prompt) return json(res, 400, { error: 'A prompt is required' });
      const result = await generateTextWithClaude(data, prompt);
      return json(res, 200, result);
    }
    if (pathname === '/api/settings/system-prompt' && req.method === 'GET') {
      const claudeSettings = data.settings?.claude || {};
      const current = getActiveSystemPrompt(data);
      return json(res, 200, {
        current,
        default: SYSTEM_PROMPT_DEFAULT,
        isDefault: current === SYSTEM_PROMPT_DEFAULT,
        hasPrevious: typeof claudeSettings.systemPromptPrevious === 'string' && claudeSettings.systemPromptPrevious.length > 0,
      });
    }
    if (pathname === '/api/settings/system-prompt' && req.method === 'PUT') {
      const body = await readBody(req);
      const text = (body.text || '').trim();
      if (!text) return json(res, 400, { error: 'Prompt text is required' });
      data.settings.claude ||= {};
      data.settings.claude.systemPromptPrevious = getActiveSystemPrompt(data);
      data.settings.claude.systemPrompt = text;
      saveData(data);
      return json(res, 200, { ok: true, current: text });
    }
    if (pathname === '/api/settings/system-prompt/undo' && req.method === 'POST') {
      const claudeSettings = data.settings?.claude || {};
      if (!claudeSettings.systemPromptPrevious) return json(res, 400, { error: 'Nothing to undo' });
      const current = getActiveSystemPrompt(data);
      data.settings.claude.systemPrompt = claudeSettings.systemPromptPrevious;
      data.settings.claude.systemPromptPrevious = current;
      saveData(data);
      return json(res, 200, { ok: true, current: data.settings.claude.systemPrompt });
    }
    if (pathname === '/api/settings/system-prompt/reset' && req.method === 'POST') {
      data.settings.claude ||= {};
      data.settings.claude.systemPromptPrevious = getActiveSystemPrompt(data);
      data.settings.claude.systemPrompt = '';
      saveData(data);
      return json(res, 200, { ok: true, current: SYSTEM_PROMPT_DEFAULT });
    }
    return json(res, 404, { error: 'API route not found' });
  } catch (error) {
    json(res, 400, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Big Black Point engine listening on http://${HOST}:${PORT}`);
  console.log(`Local admin token: ${ADMIN_TOKEN}`);
  console.log(`Real outbound requests: ${REAL_OUTBOUND ? 'enabled' : 'disabled (simulation mode)'}`);
});

// Note: WordPress/Elementor/Plesk hosting support (Plesk REST API, WP Toolkit
// provisioning, WordPress MCP Adapter + Elementor MCP plugin install, WP
// Application Password generation) was removed when the pipeline moved to
// Claude -> static HTML/CSS/JS -> Netlify. If WordPress/Elementor returns as
// an alternate hosting path for clients who prefer it, reintroduce it as a
// parallel set of build operations selected by job.hostingProvider, the way
// the old pipeline branched on data.settings.hosting.provider === 'plesk'.
