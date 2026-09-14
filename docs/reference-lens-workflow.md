# Reference Lens Workflow

Reference Lens metadata is maintained outside post Markdown. Authors write only
the post prose; Codex maintains the standalone Lens documents under `src/lens/`.
Never add Lens markers, comments, or Lens-specific frontmatter to a post.

## Ownership

- `src/pages/posts/*.md` and `src/drafts/posts/*.md`: author prose.
- `src/post-metadata/*.json` and draft JSON sidecars: Codex-maintained post
  metadata; Lens source titles are read from here.
- `src/lens/posts/<slug>.md`: Codex-maintained entries for one published post.
- `src/lens/global.md`: Codex-maintained site-wide notation.
- `src/lens/scopes/*.md`: optional Codex-maintained references shared by a named
  series or topic.
- `src/data/lens.generated.json`: generated output; never edit it by hand.

## Lens document format

Each document starts with scalar frontmatter. A post document uses:

```md
---
kind: post
post: example-slug
---
```

Each H2 starts one entry. Put its primary search term first and separate other
terms with ` | `. Commas are ordinary keyword characters.

```md
## primary term | explicitly introduced alias

Exact contiguous excerpt copied from the post.
```

Global documents use `kind: global`. Shared documents use `kind: scope`, a
`scope` value, and a `post` whose verbatim excerpt supplies the shared entry.
They may also set an optional `title`.

## Editorial policy

- A post entry must target a meaningful term, object, notation, or named result
  that the excerpt itself defines, introduces, or explicitly states.
- Exact theorem, lemma, and proposition statements are valid entries.
- Every heading term must be introduced or named in the excerpt. Do not add
  related concepts, words that are merely mentioned, or speculative search tags.
- Copy the author's prose verbatim. Do not summarize, normalize, translate, or
  silently correct it for Lens. Post and shared-scope documents are both
  validated against their source post.
- Prefer the exact paragraph that performs the definition. Split independent
  definitions when they occur in separate paragraphs.
- Keep tightly interdependent terms together when the full definition needs the
  same contiguous block.
- `src/lens/global.md` is the exception for stable notation used across posts.
  Do not promote a post-specific definition to global merely because it is a
  standard term.

The generator fails when a post Lens body is not a verbatim contiguous excerpt
of its published post. It also rejects inline Lens markup in published posts.

## Completion, publication, and revision

Follow `docs/post-workflow.md` for the state transition and exact commands.

- Completion without an explicit publish request stays under `src/drafts/`.
  Do not create `src/lens/posts/<slug>.md`; that public Lens file cannot validate
  until the post has a public source. The explicit publication workflow rereads
  the complete post, so no Lens decision depends on completion-time context.
- An explicit publish request first creates a fail-closed pending public post
  with `post:publish`. Then read the whole public post, create or refresh its
  Lens document using the policy above, remove stale entries, and keep valid
  unchanged entries stable. Finish with
  `post:finish-publication -- <slug> --lens-reviewed`, then build.
- For an existing published post revision, edit prose and metadata first,
  reconcile Lens, then run `post:mark-updated -- <slug> --lens-reviewed` as the
  final acknowledgement before building.
- Ask only when publication scope or the status of a purported definition is
  materially ambiguous.

`npm.cmd run build` validates Lens documents and regenerates the Lens index.
