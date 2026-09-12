# Implementation Plan: Friction Hunter

## Overview

Build a one-screen Alexa+ companion that demonstrates the complete hackathon loop: capture a friction in natural language, structure and cluster it, recommend the highest-impact pattern, resolve it, and show the estimated time saved. The app uses a D1-backed API, a conversational simulator, and an MCP-compatible endpoint exposing the six tools named in the PRD.

## Architecture Decisions

- Use the existing Vinext/Next.js starter so the dashboard and API deploy together on Cloudflare Workers.
- Keep extraction and impact scoring deterministic for the demo; the service boundary can later be replaced by Bedrock without changing the UI or MCP contracts.
- Persist product records in D1. Seed representative hackathon data only when a new database is empty.
- Keep the app to one responsive route; the simulated Alexa conversation is the primary input surface.

## Task List

### Phase 1: Foundation

- [x] Task 1: Define friction types, extraction, clustering, and impact scoring with tests.
- [x] Task 2: Add the D1 schema, migration, and repository functions.

### Checkpoint: Foundation

- [x] Logic tests pass and the project type-checks.

### Phase 2: Core loop

- [x] Task 3: Add history, logging, recommendation, resolution, and progress API operations.
- [x] Task 4: Expose the six PRD operations through the MCP endpoint.
- [x] Task 5: Build the Alexa simulator and live dashboard around the shared API.

### Checkpoint: Core loop

- [x] A user can log, detect, prioritize, resolve, and measure from one screen.

### Phase 3: Product polish

- [x] Task 6: Add responsive states, keyboard support, motion, empty/error feedback, metadata, favicon, and WebMCP registration.
- [x] Task 7: Verify tests, migration, build, and critical browser flow.

### Checkpoint: Complete

- [x] All PRD MVP capabilities are represented and the app is ready for a Devpost demo.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| No Bedrock credentials | Medium | Keep a deterministic extraction adapter and document the swap point. |
| Voice recognition varies by browser | Medium | Provide typed conversational capture as the reliable demo path. |
| D1 unavailable during local UI work | Low | Show seeded demo data and a recoverable connection state. |
| MCP transport differences in Alexa+ | Medium | Keep stable tool names and JSON schemas in a dedicated endpoint. |

## Open Questions

- None blocking. The implementation follows the PRD's recommended simulated Alexa+ experience and one-screen demo scope.
