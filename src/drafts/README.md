# Drafts

Files in `src/drafts/posts/` are local and Git-ignored. Astro does not create
public routes from them.

- `<slug>.md` contains author prose only, with no frontmatter.
- `<slug>.json` is the Codex-owned title/category metadata sidecar.
- A header-only shell is an empty Markdown file plus its sidecar. Never invent
  prose or publication timestamps for it.

Use `npm.cmd run post:new -- ...` to create a pair. Publish only on an explicit
request: run `npm.cmd run post:publish -- <slug>`, review the pending public
post's Reference Lens entries, run
`npm.cmd run post:finish-publication -- <slug> --lens-reviewed`, and then build.
The full durable procedure is in
`docs/post-workflow.md`.
