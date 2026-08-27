# Project workflow

- Use Git for version control. Before making changes, inspect the working tree and preserve unrelated user work.
- For completed implementation requests, run relevant validation and create a focused local commit with a descriptive message. Do not create commits for review-only or explanation-only requests.
- Do not push, create remote repositories, or rewrite published history unless the user requests it.
- Never commit credentials, environment secrets, node_modules, or build output.
- Standard checks: `npm run typecheck`, `npm test`, and `npm run build`.
- Keep this application local-first; follow PLAN_HANDOFF.md unless the user explicitly changes the scope.
