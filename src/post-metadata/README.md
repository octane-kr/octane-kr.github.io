# Published Post Metadata

Each published `src/pages/posts/<slug>.md` has exactly one tracked
`<slug>.json` sidecar here. These files are Codex-owned; the author writes only
the post prose.

- `title`, optional `description`, `category`, and optional `subcategory` are
  reader-visible metadata.
- `publishedAt` is set by explicit publication. Normal revision commands leave
  it unchanged; correcting it requires an explicit user request.
- `updatedAt` advances with every acknowledged reader-visible revision.
- `contentHash` is the `sha256-v1` approval marker for the visible metadata and
  body. Do not calculate or paste it manually.

After editing a published post, run
`npm.cmd run post:mark-updated -- <slug> --lens-reviewed` after reconciling its
Lens document. The build rejects mismatched, missing, or orphan sidecars. Draft
metadata remains local beside draft Markdown under `src/drafts/posts/`; it does
not belong here.
