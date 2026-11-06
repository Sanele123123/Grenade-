'use strict';
// Demo-mode site generator for Big Black Point.
//
// Used only when BBP_DEMO_MODE=true. It turns the client's wizard brief into a
// small, genuinely different static site (HTML/CSS/JS) without calling any AI
// provider, so the full intake -> build -> review -> approve flow can be shown
// publicly with no API keys and no cost. It is a template, not AI output, and
// the footer of every generated site says so.

const PALETTE_DEFAULTS = {
  neutral: ['#f5f0e8', '#d8cfc0', '#8a7f70', '#1f1c18'],
  warm: ['#fdf1e3', '#e9a15b', '#c4552d', '#3b1f14'],
  pastel: ['#fff6f8', '#f6c9d6', '#c9e4de', '#4a4a5a'],
  vibrant: ['#fff8e7', '#ff4d6d', '#2ec4b6', '#1b1b3a'],
  monochrome: ['#f4f4f6', '#b5b8c2', '#5b6073', '#14161f'],
  earthy: ['#f3efe2', '#a3b18a', '#7a5c3e', '#26301f'],
  ocean: ['#eef8fb', '#7cc6d8', '#1d7fa3', '#0b2a3a'],
  jewel_tone: ['#faf5ff', '#9b2d8f', '#0f7c6b', '#1d0f2e'],
  muted: ['#f2f0ee', '#b9b2aa', '#7c8a86', '#2d3331'],
};

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const luminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const saturation = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(...rgb), min = Math.min(...rgb);
  return max === 0 ? 0 : (max - min) / max;
};

function pickColors(brief) {
  const lf = (brief && brief.look_feel) || {};
  let list = [];
  if (lf.color_palette === 'custom' && Array.isArray(lf.custom_palette_colors)) list = lf.custom_palette_colors;
  else if (lf.palette_swatch_selection && Array.isArray(lf.palette_swatch_selection.colors)) list = lf.palette_swatch_selection.colors;
  list = list.filter((c) => hexToRgb(c));
  if (list.length < 2) list = PALETTE_DEFAULTS[lf.color_palette] || PALETTE_DEFAULTS.ocean;
  const sorted = [...list].sort((a, b) => luminance(a) - luminance(b));
  const ink = sorted[0];
  const bg = sorted[sorted.length - 1];
  const middle = list.filter((c) => c !== ink && c !== bg);
  const pool = middle.length ? middle : list;
  const accent = [...pool].sort((a, b) => saturation(b) - saturation(a))[0];
  const accentText = luminance(accent) > 0.45 ? '#111111' : '#ffffff';
  return { ink, bg, accent, accentText, soft: sorted.length > 2 ? sorted[sorted.length - 2] : bg };
}

function lines(text, fallback) {
  const out = String(text || '').split(/\r?\n/).map((l) => l.replace(/^[\s*\-•\d.)]+/, '').trim()).filter(Boolean).slice(0, 9);
  return out.length ? out : fallback;
}

function waLink(number) {
  let digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '27' + digits.slice(1);
  return `https://wa.me/${digits}`;
}

const DEFAULT_SERVICES = ['Personal consultation', 'Quality workmanship', 'Fast, friendly service', 'Custom solutions', 'Aftercare and support'];
const DEFAULT_PRODUCTS = ['Our signature item', 'Seasonal favourites', 'Made-to-order specials', 'Gift packs', 'Bulk and trade orders'];

function buildDemoSite(job) {
  const brief = job.brief || {};
  const biz = brief.business || {};
  const pagesStep = brief.pages || {};
  const contact = biz.contact_details || {};
  const loc = biz.location || {};
  const name = (biz.company_name || job.name || 'Your Business').toString().trim();
  const typeLabel = titleCase(biz.business_type || biz.subcategory || biz.category || 'local business');
  const personality = Array.isArray((brief.look_feel || {}).personality) ? brief.look_feel.personality : [];
  const tone = personality.length ? personality.slice(0, 2).map(titleCase).join(' & ') : 'Friendly & Professional';
  const place = [loc.suburb, loc.city, loc.province].filter(Boolean).map(titleCase).join(', ');
  const colors = pickColors(brief);
  const selected = Array.isArray(pagesStep.selected_pages) && pagesStep.selected_pages.length ? pagesStep.selected_pages : ['home', 'about', 'contact'];
  const services = lines(pagesStep.services_list, DEFAULT_SERVICES);
  const products = lines(pagesStep.products_list, DEFAULT_PRODUCTS);
  const wa = waLink(contact.whatsapp);
  const feedback = job.pendingFeedback ? String(job.pendingFeedback).slice(0, 300) : '';

  const nav = selected.filter((p) => p !== 'home');
  const navHtml = nav.map((p) => `<a href="#${esc(p)}">${esc(titleCase(p))}</a>`).join('');

  const card = (t, i) => `<article class="card"><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(t)}</h3><p>Delivered with care by the team at ${esc(name)}.</p></article>`;

  const sectionFor = (p) => {
    if (p === 'about') return `<section id="about"><h2>About ${esc(name)}</h2><p class="lead">${esc(name)} is a ${esc(typeLabel.toLowerCase())}${place ? ' based in ' + esc(place) : ''}. We keep things ${esc(tone.toLowerCase())}, and we build everything around the people we serve.</p></section>`;
    if (p === 'services') return `<section id="services"><h2>Services</h2><div class="grid">${services.map(card).join('')}</div></section>`;
    if (p === 'products') return `<section id="products"><h2>Products</h2><div class="grid">${products.map(card).join('')}</div></section>`;
    if (p === 'contact') {
      const rows = [
        contact.phone && `<li><strong>Call</strong> <a href="tel:${esc(String(contact.phone).replace(/[^\d+]/g, ''))}">${esc(contact.phone)}</a></li>`,
        wa && `<li><strong>WhatsApp</strong> <a href="${esc(wa)}" target="_blank" rel="noopener">Chat with us</a></li>`,
        contact.email && `<li><strong>Email</strong> <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>`,
        place && `<li><strong>Find us</strong> ${esc(place)}</li>`,
      ].filter(Boolean).join('') || '<li>Contact details will appear here once they are added to the brief.</li>';
      return `<section id="contact"><h2>Get in touch</h2><ul class="contact">${rows}</ul></section>`;
    }
    return `<section id="${esc(p)}"><h2>${esc(titleCase(p))}</h2><p class="lead">This ${esc(titleCase(p).toLowerCase())} section is part of your page plan. In a live build, the AI writes real content for it from your brief.</p></section>`;
  };

  const body = nav.map(sectionFor).join('\n');
  const cta = wa
    ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">Message us on WhatsApp</a>`
    : `<a class="btn" href="#${nav.includes('contact') ? 'contact' : 'top'}">Get in touch</a>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
<meta name="description" content="${esc(name)} — ${esc(typeLabel)}${place ? ' in ' + esc(place) : ''}.">
<link rel="stylesheet" href="styles.css">
</head>
<body id="top">
<header class="site-header"><a class="brand" href="#top">${esc(name)}</a><nav>${navHtml}</nav></header>
<main>
<section class="hero"><p class="eyebrow">${esc(typeLabel)}${place ? ' · ' + esc(place) : ''}</p><h1>${esc(name)}</h1><p class="lead">${esc(tone)} service you can rely on.</p>${cta}</section>
${feedback ? `<aside class="revision">Latest requested change: “${esc(feedback)}”</aside>` : ''}
${body}
</main>
<footer><p>© ${new Date().getFullYear()} ${esc(name)}</p><p class="demo-note">Sample site produced by the Big Black Point demo. Live builds are written by AI from the full brief.</p></footer>
<script src="script.js"></script>
</body>
</html>
`;

  const css = `:root{--ink:${colors.ink};--bg:${colors.bg};--accent:${colors.accent};--accent-text:${colors.accentText};--soft:${colors.soft}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
a{color:inherit}
.site-header{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 5vw;background:var(--bg);border-bottom:1px solid color-mix(in srgb,var(--ink) 14%,transparent)}
.brand{font-weight:800;font-size:1.15rem;text-decoration:none}
nav{display:flex;gap:18px;flex-wrap:wrap}nav a{text-decoration:none;font-size:.95rem;opacity:.8}nav a:hover{opacity:1;color:var(--accent)}
main{max-width:1000px;margin:0 auto;padding:0 5vw}
.hero{padding:12vh 0 8vh}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.78rem;opacity:.7;margin:0 0 12px}
h1{font-size:clamp(2.4rem,7vw,4.4rem);line-height:1.05;margin:0 0 16px}h2{font-size:1.7rem;margin:0 0 16px}
.lead{font-size:1.15rem;max-width:60ch}
.btn{display:inline-block;margin-top:20px;padding:13px 26px;background:var(--accent);color:var(--accent-text);border-radius:999px;font-weight:700;text-decoration:none}
.btn:hover{filter:brightness(1.08)}
section{padding:6vh 0;border-top:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}.hero{border-top:0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
.card{background:color-mix(in srgb,var(--soft) 35%,var(--bg));border:1px solid color-mix(in srgb,var(--ink) 12%,transparent);border-radius:14px;padding:20px}
.card .num{color:var(--accent);font-weight:800;font-size:.9rem}.card h3{margin:6px 0}.card p{margin:0;opacity:.75;font-size:.95rem}
.contact{list-style:none;padding:0;margin:0;display:grid;gap:10px}.contact strong{display:inline-block;min-width:92px}
.revision{margin:0 0 8px;padding:12px 16px;border-left:4px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--bg));border-radius:6px;font-size:.92rem}
footer{padding:28px 5vw;text-align:center;font-size:.85rem;opacity:.7;border-top:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}footer p{margin:4px 0}
@media (max-width:640px){.site-header{flex-direction:column;align-items:flex-start}}
`;

  const js = `document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}});});\n`;

  return {
    ok: true,
    simulated: true,
    provider: 'demo',
    model: 'demo-template',
    summary: `Demo build: generated a ${nav.length + 1}-section sample site for ${name} from the brief (template-based, no AI call).`,
    files: { 'index.html': html, 'styles.css': css, 'script.js': js },
  };
}

// Canned replacement for the in-wizard "suggest a list" helper, so the button
// works in the public demo without an AI key.
function demoSuggestList(prompt) {
  const text = String(prompt || '');
  const wantsProducts = /products/i.test(text.slice(0, 400)) && !/services/i.test(text.slice(0, 120));
  const typeMatch = /"business_type"\s*:\s*"([^"]+)"/.exec(text);
  const type = typeMatch ? typeMatch[1] : '';
  const base = wantsProducts ? DEFAULT_PRODUCTS : DEFAULT_SERVICES;
  const list = type ? base.map((item, i) => (i === 0 ? `${item} (${type})` : item)) : base;
  return list.join('\n');
}

module.exports = { buildDemoSite, demoSuggestList };
