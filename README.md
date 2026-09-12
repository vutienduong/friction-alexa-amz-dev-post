# Friction Hunter

Friction Hunter is an Alexa-first ambient assistant that captures small recurring annoyances, detects patterns, recommends one friction to fix, and measures the time recovered.

## What is implemented

- Natural-language capture through an Alexa+ web simulator
- Deterministic extraction and semantic keyword clustering for a reliable demo
- D1 persistence with a generated Drizzle migration
- Impact scoring, weekly recommendation, resolution, and savings tracking
- Six MCP tools at `/api/mcp`
- Page-scoped WebMCP actions for compatible AI browsers
- Responsive dashboard with representative Devpost demo data

## Run locally

```bash
npm install
npm run dev
```

The first local D1 database also needs the generated migration in `drizzle/` applied through Wrangler. Production deployment applies the migration automatically.

## MCP tools

- `log_friction`
- `list_frictions`
- `get_friction_patterns`
- `recommend_friction_to_fix`
- `resolve_friction`
- `get_progress`

The endpoint supports the current stateless MCP flow (`server/discover`, `tools/list`, and `tools/call`) and the earlier `initialize` handshake for compatibility.

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```
