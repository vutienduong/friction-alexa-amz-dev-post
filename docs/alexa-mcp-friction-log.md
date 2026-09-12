# Alexa / MCP implementation friction log

## 1. Local D1 migrations are not discovered from the generated Worker config

- Task attempted: apply the generated Drizzle migration to the local preview database.
- Expected: `wrangler d1 migrations apply` finds the project migration folder.
- Actual: the generated Worker config resolves migrations relative to `dist/server`.
- Severity: medium.
- Workaround: execute the checked-in SQL file directly against the local D1 binding.
- Suggestion: include the source migration directory in the generated local Wrangler configuration.

## 2. Large multi-row seed inserts exceed D1's local variable limit

- Task attempted: seed 17 demo friction events in one parameterized insert.
- Expected: a small demo dataset inserts as one statement.
- Actual: the local D1 runtime rejected 153 bound variables.
- Severity: medium.
- Workaround: insert deterministic seed events in bounded chunks of eight rows.
- Suggestion: surface the effective bind-variable limit in D1 error guidance and starter examples.

## 3. Locale-dependent time formatting causes hydration mismatch

- Task attempted: server-render recent friction timestamps.
- Expected: server and client render the same time label.
- Actual: the server used UTC while the browser used the local timezone.
- Severity: low.
- Workaround: declare one explicit display timezone in the formatter.
- Suggestion: document deterministic date formatting in server-rendered Alexa companion examples.
