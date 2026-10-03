# Big Black Point

A Big Black Point prototype for creating a structured website brief and running it through the Claude (or OpenAI) → static HTML/CSS/JS → Netlify build pipeline.

## Files

- `index.html` - Page markup and app shell.
- `css/styles.css` - Theme, layout, responsive styles, and component styling.
- `js/app.js` - 8-step wizard step/field definitions, rendering, state, presets, validation, import/export, and prompt generation.
- `../preview.html` - Integrated prototype preview with the operator Integrations dashboard.
- `../server.js` - Dependency-free local API engine with encrypted settings, persistent sites/jobs, and signed webhook callbacks.
- `../.env.example` - Production environment variable template.

## Run Locally

From the workspace root, run the integrated local engine:

```bash
node server.js
```

Then visit:

```text
http://127.0.0.1:4173/preview.html
```

The default local admin token is `bbp-local-admin`. Set `BBP_ADMIN_TOKEN` and `BBP_ENCRYPTION_KEY` from `.env.example` before using the service outside local development.

## Main Features

- Guided 8-step client intake wizard: The Business, Assets & Visuals, Pages, Look and Feel, Audience, Call to Action, Trust Signals, Final Details.
- Business category/subcategory selection (currently Food & Beverage only — more categories to follow).
- Structured JSON brief built automatically from wizard answers, ready for the AI build step.
- Prompt preview and generated output, with multiple prompt modes (copywriting / developer / raw JSON / creative brief / checklist).
- Import/export JSON, saved presets, validation, and dark mode.
- Operator Integrations dashboard for Claude, OpenAI, Netlify hosting, webhooks, site connections, and persistent build jobs.
- AES-GCM encryption for sensitive settings stored by the local API engine.
- Signed callback verification and simulated outbound webhook delivery.

Note: there is no business-type "playbook" yet — the wizard does not currently apply per-category defaults or lock fields based on the selected business type. That layer will be added once the full category list is available.

## Build Pipeline

```
Client completes the 8-step intake wizard
        |
Engine builds a JSON brief from the wizard answers
        |
JSON sent to Claude (or OpenAI)
        |
Model generates the website as static HTML5 (HTML/CSS/JS)
        |
Engine writes the files and deploys them to Netlify
```

Content scope is currently website-only; the other content types (email, social, ads, etc.) that existed in an earlier prototype have been removed and may return later as a separate mode.

## Production Adapter Status

The local API engine persists and encrypts configuration, tracks jobs, verifies callback signatures, and serves the preview. External Netlify, Claude, and OpenAI network requests remain disabled by default (simulation mode). Configure provider credentials and set `BBP_ENABLE_REAL_OUTBOUND=true` only after validating them against a disposable Netlify site.

Netlify is supported as the hosting provider through the Hosting settings tab. Enter a Netlify Personal Access Token (and optionally an existing Site ID/team slug); the adapter uses Bearer auth against the Netlify REST API (`https://api.netlify.com/api/v1`). Build jobs are modeled as: call the AI provider for static HTML/CSS/JS, write the files locally, zip them, then deploy via Netlify's Deploy API — creating a new site automatically if no Site ID is configured. In simulation mode these steps are recorded without touching a server.

### WordPress/Elementor (not currently active)

An earlier version of this pipeline provisioned WordPress sites via Plesk/WP Toolkit and built pages through the Elementor MCP plugin. That path has been removed from the active code in favor of the static-HTML/Netlify flow above, but may be reintroduced later as an alternate hosting option for clients who specifically want a WordPress/Elementor site. If revisited, the previous implementation pattern (in `server.js`'s git history) branched the job pipeline on `data.settings.hosting.provider === 'plesk'`, with WordPress-specific fields previously stored under `website_parameters` (`elementor_build_mode`, `elementor_widgets_needed`, `wordpress_plugins_needed`).

## Notes For Developers

The app is intentionally dependency-free. Keep shared data definitions in `js/app.js` near the top, and keep UI behavior grouped by feature so future changes are easy to follow.
