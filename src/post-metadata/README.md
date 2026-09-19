# Published Post Metadata

Each published `src/pages/posts/<slug>.md` has exactly one tracked
`<slug>.json` sidecar here. These files are Codex-owned; the author writes only
the post prose.

- `title` and optional `description` are reader-visible metadata. Regular Posts
  require `category` and may have `subcategory`. Leave both out of Scraps and
  assign them when promoting a Scrap to a Post. A subcategory requires a category.
- Optional `section` is `posts` (the default) or `scraps`. Scraps are listed only
  under `/scraps/`; their existing article URLs remain stable. Section changes
  require revision acknowledgement just like category changes.
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
