# Project workflow

- Use Git for version control. Before making changes, inspect the working tree and preserve unrelated user work.
- The user authorizes routine Git fetches, fast-forward-only pulls, commits, and ordinary pushes for this project without a separate conversational confirmation each time. This applies only to the user-approved project remote, once configured, and remains subject to tool approval policies.
- Before implementation work, inspect the current branch and working tree. If an approved remote is configured and the tree is clean, fetch and update the tracked branch with `git pull --ff-only`. Preserve dirty work; stop for guidance if histories diverge or changes conflict. Do not automatically stash, reset, or rebase user work.
- For completed implementation requests, run relevant validation, create a focused commit with a descriptive message, and push the completed task commits to the approved remote/tracked branch. Check outgoing commits first; do not include unrelated user work. If no remote or upstream is configured, ask for the destination. Report the commit and push result.
- Direct work on main is acceptable for this solo project; pull requests are optional and are not required unless the user asks. Respect an existing task branch instead of switching branches unexpectedly.
- Do not create commits or push for review-only or explanation-only requests.
- Remote repository creation, visibility/access changes, branch or repository deletion, force-pushes, and published-history rewrites require a separate explicit user request.
- Never commit credentials, environment secrets, node_modules, or build output.
- Standard checks: `npm run typecheck`, `npm test`, and `npm run build`.
- Keep this application local-first; follow PLAN_HANDOFF.md unless the user explicitly changes the scope.
