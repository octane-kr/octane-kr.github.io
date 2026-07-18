import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';

type CommentRow = {
  id: string;
  nickname: string;
  body: string;
  created_at: string;
};

const pageSizeErrorMessage = '잠시 후 다시 시도해 주세요.';

const likeControls = Array.from(
  document.querySelectorAll<HTMLElement>('[data-like-control]'),
);
const commentsRoot = document.querySelector<HTMLElement>('[data-comments-root]');
const postSlug =
  commentsRoot?.dataset.postSlug ?? likeControls[0]?.dataset.postSlug ?? '';

const likeStorageKey = `kokiri-blog:liked:${postSlug}`;

let liked = false;
let likeCount = 0;

const setLikeMessage = (message: string) => {
  document
    .querySelectorAll<HTMLElement>('[data-like-message]')
    .forEach((element) => {
      element.textContent = message;
    });
};

const setCommentMessage = (message: string) => {
  const element = document.querySelector<HTMLElement>('[data-comment-message]');
  if (element) element.textContent = message;
};

const readLikedState = () => {
  try {
    return window.localStorage.getItem(likeStorageKey) === 'true';
  } catch {
    return false;
  }
};

const writeLikedState = (value: boolean) => {
  try {
    window.localStorage.setItem(likeStorageKey, String(value));
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
};

const setLikeDisabled = (disabled: boolean) => {
  document
    .querySelectorAll<HTMLButtonElement>('[data-like-button]')
    .forEach((button) => {
      button.disabled = disabled;
    });
};

const renderLikes = () => {
  document.querySelectorAll<HTMLElement>('[data-like-control]').forEach((root) => {
    const button = root.querySelector<HTMLButtonElement>('[data-like-button]');
    const icon = root.querySelector<HTMLElement>('[data-like-icon]');
    const count = root.querySelector<HTMLElement>('[data-like-count]');

    button?.classList.toggle('is-liked', liked);
    button?.setAttribute('aria-pressed', String(liked));
    if (icon) icon.textContent = liked ? '♥' : '♡';
    if (count) count.textContent = String(likeCount);
  });
};

const loadLikeCount = async () => {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('blog_post_likes')
    .select('like_count')
    .eq('post_slug', postSlug)
    .maybeSingle();

  if (error) {
    return;
  }

  likeCount = data?.like_count ?? 0;
  renderLikes();
};

const toggleLike = async () => {
  if (!supabase) return;

  setLikeDisabled(true);
  setLikeMessage('');

  const rpcName = liked ? 'blog_unlike_post' : 'blog_like_post';
  const { data, error } = await supabase.rpc(rpcName, {
    p_post_slug: postSlug,
  });

  setLikeDisabled(false);

  if (error || typeof data !== 'number') {
    setLikeMessage(pageSizeErrorMessage);
    return;
  }

  liked = !liked;
  likeCount = data;
  writeLikedState(liked);
  renderLikes();
};

const formatCommentDate = (value: string) =>
  new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const renderComments = (comments: CommentRow[]) => {
  const list = document.querySelector<HTMLElement>('[data-comments-list]');
  const empty = document.querySelector<HTMLElement>('[data-comments-empty]');

  if (!list || !empty) return;

  list.replaceChildren();
  empty.hidden = comments.length > 0;

  comments.forEach((comment) => {
    const item = document.createElement('article');
    item.className = 'comment-item';

    const meta = document.createElement('div');
    meta.className = 'comment-meta';

    const nickname = document.createElement('strong');
    nickname.textContent = comment.nickname;

    const date = document.createElement('time');
    date.dateTime = comment.created_at;
    date.textContent = formatCommentDate(comment.created_at);

    const body = document.createElement('p');
    body.textContent = comment.body;

    meta.append(nickname, date);
    item.append(meta, body);
    list.append(item);
  });
};

const loadComments = async () => {
  if (!supabase || !commentsRoot) return;

  const { data, error } = await supabase
    .from('blog_comments')
    .select('id,nickname,body,created_at')
    .eq('post_slug', postSlug)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true });

  if (error) {
    return;
  }

  renderComments((data ?? []) as CommentRow[]);
};

const setupCommentForm = () => {
  const form = document.querySelector<HTMLFormElement>('[data-comment-form]');
  const nicknameInput = document.querySelector<HTMLInputElement>(
    '[data-comment-nickname]',
  );
  const bodyInput = document.querySelector<HTMLTextAreaElement>('[data-comment-body]');

  if (!form || !bodyInput) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!supabase) return;

    const nickname = nicknameInput?.value.trim() || '익명';
    const body = bodyInput.value.trim();

    if (!body) {
      setCommentMessage('댓글 내용을 입력해 주세요.');
      return;
    }

    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    setCommentMessage('');

    const { error } = await supabase.from('blog_comments').insert({
      post_slug: postSlug,
      nickname,
      body,
      is_hidden: false,
    });

    if (submitButton) submitButton.disabled = false;

    if (error) {
      setCommentMessage(pageSizeErrorMessage);
      return;
    }

    bodyInput.value = '';
    setCommentMessage('댓글을 남겼습니다.');
    await loadComments();
  });
};

const hideInteractions = () => {
  likeControls.forEach((control) => {
    control.hidden = true;
  });
  if (commentsRoot) commentsRoot.hidden = true;
};

const initInteractions = async () => {
  if (!postSlug) return;

  liked = readLikedState();
  renderLikes();

  if (!hasSupabaseConfig || !supabase) {
    hideInteractions();
    return;
  }

  document
    .querySelectorAll<HTMLButtonElement>('[data-like-button]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        void toggleLike();
      });
    });

  setupCommentForm();

  await Promise.all([loadLikeCount(), loadComments()]);
};

void initInteractions();
