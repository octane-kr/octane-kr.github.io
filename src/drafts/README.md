# Drafts

Markdown files in `src/drafts/posts/` are writing drafts. Astro does not create
public routes from this folder, and the post list, search index, recent-post
widgets, and Reference Lens generator ignore it.

Keep `draft: true` in draft frontmatter as a safety label. To publish a post,
move it to `src/pages/posts/`, remove `draft: true`, and run
`npm.cmd run build`.
