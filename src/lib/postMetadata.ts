export type PostMetadata = {
  title: string;
  publishedAt: string;
  updatedAt: string;
  category?: string;
  subcategory?: string;
  description?: string;
  section?: 'posts' | 'scraps';
  contentHash: string;
  workflowState?: 'lens-review-pending';
};

const metadataModules = import.meta.glob<PostMetadata>('../post-metadata/*.json', {
  eager: true,
  import: 'default',
});

export const postMetadataBySlug = Object.fromEntries(
  Object.entries(metadataModules).map(([metadataPath, metadata]) => {
    const filename = metadataPath.split('/').pop() ?? 'untitled.json';
    return [filename.replace(/\.json$/u, ''), metadata];
  }),
) as Record<string, PostMetadata>;

export const getPostMetadata = (slug: string) => postMetadataBySlug[slug];

export const getPostSection = (metadata?: PostMetadata) => metadata?.section ?? 'posts';
