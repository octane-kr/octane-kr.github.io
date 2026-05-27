import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';

type ListStats = {
  likeCount: number;
  commentCount: number;
};

const statsRoots = Array.from(
  document.querySelectorAll<HTMLElement>('[data-post-list-stats]'),
);

const postSlugs = Array.from(
  new Set(
    statsRoots
      .map((root) => root.dataset.postSlug?.trim() ?? '')
      .filter(Boolean),
  ),
);

const renderStats = (statsBySlug: Map<string, ListStats>) => {
  statsRoots.forEach((root) => {
    const postSlug = root.dataset.postSlug ?? '';
    const stats = statsBySlug.get(postSlug) ?? {
      likeCount: 0,
      commentCount: 0,
    };

    const likeCount = root.querySelector<HTMLElement>(
      '[data-post-list-like-count]',
    );
    const commentCount = root.querySelector<HTMLElement>(
      '[data-post-list-comment-count]',
    );

    if (likeCount) likeCount.textContent = String(stats.likeCount);
    if (commentCount) commentCount.textContent = String(stats.commentCount);
  });
};

const loadLikeCounts = async () => {
  const likeCounts = new Map<string, number>();

  if (!supabase || postSlugs.length === 0) return likeCounts;

  const { data, error } = await supabase
    .from('blog_post_likes')
    .select('post_slug,like_count')
    .in('post_slug', postSlugs);

  if (error) return likeCounts;

  data?.forEach((row) => {
    const postSlug = String(row.post_slug ?? '');
    if (!postSlug) return;

    likeCounts.set(postSlug, Number(row.like_count ?? 0));
  });

  return likeCounts;
};

const loadCommentCounts = async () => {
  const commentCounts = new Map<string, number>();

  if (!supabase || postSlugs.length === 0) return commentCounts;

  const { data, error } = await supabase
    .from('blog_comments')
    .select('post_slug')
    .in('post_slug', postSlugs)
    .eq('is_hidden', false);

  if (error) return commentCounts;

  data?.forEach((row) => {
    const postSlug = String(row.post_slug ?? '');
    if (!postSlug) return;

    commentCounts.set(postSlug, (commentCounts.get(postSlug) ?? 0) + 1);
  });

  return commentCounts;
};

const initPostListStats = async () => {
  if (!hasSupabaseConfig || !supabase || statsRoots.length === 0) return;

  const [likeCounts, commentCounts] = await Promise.all([
    loadLikeCounts(),
    loadCommentCounts(),
  ]);

  const statsBySlug = new Map<string, ListStats>();

  postSlugs.forEach((postSlug) => {
    statsBySlug.set(postSlug, {
      likeCount: likeCounts.get(postSlug) ?? 0,
      commentCount: commentCounts.get(postSlug) ?? 0,
    });
  });

  renderStats(statsBySlug);
};

void initPostListStats();
