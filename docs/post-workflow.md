# Post Workflow

Use two physical locations for posts:

- `src/pages/posts/*.md` is the published set. Every Markdown file here becomes
  a public `/posts/<slug>/` route.
- `src/drafts/posts/*.md` is the writing set. Files here are ignored by Astro
  routing, the Posts page, recent-post widgets, search, and Reference Lens.

Draft files should keep `draft: true` in frontmatter. The build runs
`scripts/checkPublishedPosts.mjs`, so a file in `src/pages/posts/` with
`draft: true` fails before deployment.

Publishing checklist:

1. Finish the draft and remove obvious trailing incomplete text.
2. Move the file from `src/drafts/posts/` to `src/pages/posts/`.
3. Remove `draft: true`.
4. Run `npm.cmd run build`.
