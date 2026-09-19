# Repo Notes

- For About or CV updates, read `docs/profile-workflow.md` first. Use `src/data/profile.json` as the shared source, regenerate and visually review both LaTeX PDFs, and preserve the author's selection rules.

- For every post creation, editing, completion, or publication request, read `docs/post-workflow.md` before changing files. This is the durable workflow router for fresh contexts.
- For Projects/UCPC dynamic scoreboard work, read `docs/ucpc-scoreboard-time-machine-plan.md` first.
- Keep changes small and local. This blog prefers quiet editorial UI: low-chrome controls, underlines, simple borders, no SaaS-style cards or shadows.
- The author owns post prose. Codex owns draft JSON sidecars, `src/post-metadata/`, timestamps, revision hashes, publication plumbing, and Reference Lens documents.
- Unfinished posts and header-only shells belong in `src/drafts/posts/`. Never create a public route unless the user explicitly asks to publish.
- If the user asks only for a draft file or shell, run the `post:new` workflow: create an empty Markdown body plus its JSON sidecar. Do not invent prose, headings, placeholders, or publication timestamps.
- After any reader-visible change to a published post body, title, description, or classification, reconcile Lens first, then run `npm.cmd run post:mark-updated -- <slug> --lens-reviewed` as the final revision acknowledgement before building. Lens-only and site-code-only changes do not alter post timestamps.
- Publish only on an explicit request. Run `post:publish` to create a fail-closed pending public post, review the whole public post and reconcile Lens, run `post:finish-publication -- <slug> --lens-reviewed`, then build.
- For Reference Lens work, read `docs/reference-lens-workflow.md` first. Keep posts free of Lens markup and maintain standalone Lens documents under `src/lens/`.
- Use `npm.cmd run build` for verification on Windows; it also regenerates the Reference Lens index.
- The working tree may contain unrelated post edits. Do not stage or revert them while working on the UCPC tool.
