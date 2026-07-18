import katex from 'katex';
import { getLensKeywordResults } from '../lib/referenceLensSearch.js';

type LensEntry = {
  id: string;
  source: 'global' | 'scope' | 'post';
  scope: string;
  sourceKind?: 'reference' | 'post';
  sourceSlug?: string;
  sourceTitle?: string;
  sourceHref?: string | null;
  sourcePath: string;
  keywords: string[];
  body: string;
  bodyHtml?: string;
};

type LensBodySegment =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'math';
      value: string;
      source: string;
      displayMode: boolean;
    };

const roots = Array.from(
  document.querySelectorAll<HTMLElement>('[data-reference-lens]'),
);

const LENS_STATE_STORAGE_KEY = 'referenceLensState';
const LENS_WIDTH_STORAGE_KEY = 'referenceLensWidth';
const LENS_MIN_WIDTH = 320;
const LENS_MAX_WIDTH = 720;
const LENS_READING_WIDTH = 560;
const LENS_DESKTOP_QUERY = '(min-width: 961px)';
const desktopMedia = window.matchMedia(LENS_DESKTOP_QUERY);

type LensResizeState = {
  pointerId: number;
  startX: number;
  startWidth: number;
  latestWidth: number;
};

type LensStoredState = {
  isOpen?: boolean;
  query?: string;
  selectedKeyword?: string | null;
  width?: number;
};

const canResizeLens = () => desktopMedia.matches;

const normalizeLensWidth = (width: number) =>
  Math.min(Math.max(width, LENS_MIN_WIDTH), LENS_MAX_WIDTH);

const getMaxLensWidth = () =>
  Math.max(
    LENS_MIN_WIDTH,
    Math.min(LENS_MAX_WIDTH, window.innerWidth - LENS_READING_WIDTH),
  );

const clampLensWidth = (width: number) =>
  Math.min(normalizeLensWidth(width), getMaxLensWidth());

const readStoredLensWidth = () => {
  try {
    const storedWidth = window.localStorage.getItem(LENS_WIDTH_STORAGE_KEY);
    if (!storedWidth) return null;

    const width = Number.parseFloat(storedWidth);
    return Number.isFinite(width) ? width : null;
  } catch {
    return null;
  }
};

const normalizeStoredLensState = (state: LensStoredState): LensStoredState => {
  const normalized: LensStoredState = {};

  if (typeof state.isOpen === 'boolean') {
    normalized.isOpen = state.isOpen;
  }

  if (typeof state.query === 'string') {
    normalized.query = state.query;
  }

  if (
    typeof state.selectedKeyword === 'string' ||
    state.selectedKeyword === null
  ) {
    normalized.selectedKeyword = state.selectedKeyword;
  }

  if (typeof state.width === 'number' && Number.isFinite(state.width)) {
    normalized.width = Math.round(normalizeLensWidth(state.width));
  }

  return normalized;
};

const readStoredLensState = (): LensStoredState => {
  try {
    const storedState = window.localStorage.getItem(LENS_STATE_STORAGE_KEY);
    if (!storedState) return {};

    const parsedState = JSON.parse(storedState) as unknown;
    if (!parsedState || typeof parsedState !== 'object') return {};

    return normalizeStoredLensState(parsedState as LensStoredState);
  } catch {
    return {};
  }
};

const writeStoredLensState = (state: LensStoredState) => {
  const normalizedState = normalizeStoredLensState(state);

  try {
    window.localStorage.setItem(
      LENS_STATE_STORAGE_KEY,
      JSON.stringify(normalizedState),
    );

    if (typeof normalizedState.width === 'number') {
      window.localStorage.setItem(
        LENS_WIDTH_STORAGE_KEY,
        String(normalizedState.width),
      );
    }
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
};

const getEntries = (root: HTMLElement): LensEntry[] => {
  const data = root.querySelector<HTMLScriptElement>('[data-reference-lens-data]');

  try {
    return JSON.parse(data?.textContent ?? '[]') as LensEntry[];
  } catch {
    return [];
  }
};

const findClosingDelimiter = (
  value: string,
  delimiter: string,
  startIndex: number,
) => {
  let index = startIndex;

  while (index < value.length) {
    if (value[index] === '\\') {
      index += 2;
      continue;
    }

    if (value.startsWith(delimiter, index)) return index;

    index += 1;
  }

  return -1;
};

const readMathStart = (value: string, index: number) => {
  if (value.startsWith('$$', index)) {
    return {
      open: '$$',
      close: '$$',
      displayMode: true,
      contentStart: index + 2,
    };
  }

  if (value.startsWith('\\[', index)) {
    return {
      open: '\\[',
      close: '\\]',
      displayMode: true,
      contentStart: index + 2,
    };
  }

  if (value.startsWith('\\(', index)) {
    return {
      open: '\\(',
      close: '\\)',
      displayMode: false,
      contentStart: index + 2,
    };
  }

  if (value[index] === '$') {
    return {
      open: '$',
      close: '$',
      displayMode: false,
      contentStart: index + 1,
    };
  }

  return null;
};

const parseLensBody = (value: string): LensBodySegment[] => {
  const segments: LensBodySegment[] = [];
  let index = 0;
  let textStart = 0;

  while (index < value.length) {
    const mathStart = readMathStart(value, index);

    if (!mathStart) {
      index += 1;
      continue;
    }

    const closeIndex = findClosingDelimiter(
      value,
      mathStart.close,
      mathStart.contentStart,
    );

    if (closeIndex < 0) {
      index += mathStart.open.length;
      continue;
    }

    const text = value.slice(textStart, index);
    if (text) segments.push({ type: 'text', value: text });

    segments.push({
      type: 'math',
      value: value.slice(mathStart.contentStart, closeIndex),
      source: value.slice(index, closeIndex + mathStart.close.length),
      displayMode: mathStart.displayMode,
    });

    index = closeIndex + mathStart.close.length;
    textStart = index;
  }

  const text = value.slice(textStart);
  if (text) segments.push({ type: 'text', value: text });

  return segments;
};

const appendTextWithLineBreaks = (root: HTMLElement, value: string) => {
  value.split(/\r?\n/).forEach((line, index) => {
    if (index > 0) root.append(document.createElement('br'));
    if (line) root.append(document.createTextNode(line));
  });
};

const appendMath = (
  root: HTMLElement,
  expression: string,
  source: string,
  displayMode: boolean,
) => {
  const math = document.createElement(displayMode ? 'div' : 'span');
  math.className = displayMode
    ? 'reference-lens-math reference-lens-math-display'
    : 'reference-lens-math';

  try {
    katex.render(expression, math, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
    });
  } catch {
    math.textContent = source;
  }

  root.append(math);
};

const renderLensBody = (root: HTMLElement, value: string) => {
  root.replaceChildren();

  parseLensBody(value).forEach((segment) => {
    if (segment.type === 'text') {
      appendTextWithLineBreaks(root, segment.value);
      return;
    }

    appendMath(root, segment.value, segment.source, segment.displayMode);
  });
};

const sanitizeLensHtmlFragment = (fragment: DocumentFragment) => {
  fragment
    .querySelectorAll('script, iframe, object, embed, link, meta')
    .forEach((element) => element.remove());

  fragment.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (
        name.startsWith('on') ||
        ((name === 'href' || name === 'src') && value.startsWith('javascript:'))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });
};

const renderLensBodyContent = (
  root: HTMLElement,
  snippet: {
    body?: string;
    bodyHtml?: string;
  },
) => {
  root.replaceChildren();

  if (snippet.bodyHtml) {
    const template = document.createElement('template');
    template.innerHTML = snippet.bodyHtml;
    sanitizeLensHtmlFragment(template.content);
    root.append(template.content.cloneNode(true));
    return;
  }

  renderLensBody(root, snippet.body || '(내용 없음)');
};

const renderSourceLine = (
  root: HTMLElement,
  snippet: {
    sourceTitle?: string;
    sourceHref?: string | null;
    sourcePath?: string;
  },
) => {
  const sourceTitle = snippet.sourceTitle || snippet.sourcePath || '알 수 없음';

  root.replaceChildren('출처: ');

  if (snippet.sourceHref) {
    const link = document.createElement('a');
    link.href = snippet.sourceHref;
    link.textContent = sourceTitle;
    root.append(link);
    return;
  }

  root.append(document.createTextNode(sourceTitle));
};

const initReferenceLens = (root: HTMLElement) => {
  const entries = getEntries(root);
  const openButton = root.querySelector<HTMLButtonElement>(
    '[data-reference-lens-open]',
  );
  const closeButton = root.querySelector<HTMLButtonElement>(
    '[data-reference-lens-close]',
  );
  const resizeHandle = root.querySelector<HTMLButtonElement>(
    '[data-reference-lens-resize]',
  );
  const panel = root.querySelector<HTMLElement>('[data-reference-lens-panel]');
  const input = root.querySelector<HTMLInputElement>('[data-reference-lens-input]');
  const empty = root.querySelector<HTMLElement>('[data-reference-lens-empty]');
  const results = root.querySelector<HTMLElement>('[data-reference-lens-results]');
  let storedLensState = readStoredLensState();
  let expandedKeyword =
    typeof storedLensState.selectedKeyword === 'string'
      ? storedLensState.selectedKeyword
      : null;
  let resizeState: LensResizeState | null = null;
  let isOpen = false;

  if (!openButton || !panel || !input || !empty || !results) return;

  const persistLensState = (patch: LensStoredState) => {
    storedLensState = normalizeStoredLensState({
      ...storedLensState,
      ...patch,
    });
    writeStoredLensState(storedLensState);
  };

  const applyLensWidth = (width: number, fitViewport = true) => {
    const clampedWidth = fitViewport
      ? clampLensWidth(width)
      : normalizeLensWidth(width);
    document.documentElement.style.setProperty(
      '--reference-lens-width',
      `${clampedWidth}px`,
    );
    return clampedWidth;
  };

  const stopResizing = () => {
    if (!resizeState) return;

    const finalWidth = resizeState.latestWidth;
    resizeState = null;
    document.documentElement.classList.remove('is-reference-lens-resizing');
    window.removeEventListener('pointermove', onResizePointerMove);
    window.removeEventListener('pointerup', onResizePointerEnd);
    window.removeEventListener('pointercancel', onResizePointerEnd);
    window.removeEventListener('blur', stopResizing);
    persistLensState({ width: finalWidth });
  };

  const onResizePointerMove = (event: PointerEvent) => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;

    event.preventDefault();
    resizeState.latestWidth = applyLensWidth(
      resizeState.startWidth + resizeState.startX - event.clientX,
    );
  };

  const onResizePointerEnd = (event: PointerEvent) => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    stopResizing();
  };

  const restoreLensWidth = () => {
    const storedWidth =
      typeof storedLensState.width === 'number'
        ? storedLensState.width
        : readStoredLensWidth();

    if (storedWidth === null) return;

    applyLensWidth(storedWidth, false);
  };

  const setOpen = (
    nextOpen: boolean,
    shouldPersist = true,
    shouldFocus = false,
  ) => {
    isOpen = nextOpen;
    panel.hidden = !isOpen;
    openButton.hidden = isOpen;
    openButton.setAttribute('aria-expanded', String(isOpen));

    if (!isOpen) stopResizing();
    if (shouldPersist) persistLensState({ isOpen });

    if (isOpen && shouldFocus) {
      window.setTimeout(() => input.focus(), 0);
    }
  };

  if (typeof storedLensState.query === 'string') {
    input.value = storedLensState.query;
  }

  restoreLensWidth();

  const render = () => {
    const query = input.value;
    const groups = getLensKeywordResults(entries, query);
    const expandedKeywordExists =
      expandedKeyword !== null &&
      groups.some((group) => group.matchKey === expandedKeyword);

    if (expandedKeyword !== null && !expandedKeywordExists) {
      expandedKeyword = null;
      persistLensState({ selectedKeyword: null });
    }

    results.replaceChildren();

    if (!query.trim()) {
      empty.replaceChildren(
        '예: G[X] · tree decomposition · Theorem 4.1',
      );
      empty.hidden = false;
      return;
    }

    if (groups.length === 0) {
      empty.textContent = '일치하는 키워드가 없습니다.';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    groups.forEach((group) => {
      const item = document.createElement('section');
      item.className = 'reference-lens-result';

      const button = document.createElement('button');
      button.className = 'reference-lens-keyword';
      button.type = 'button';
      button.setAttribute(
        'aria-expanded',
        String(expandedKeyword === group.matchKey),
      );
      button.textContent = group.keyword;
      button.addEventListener('click', () => {
        if (expandedKeyword === group.matchKey) {
          expandedKeyword = null;
        } else {
          expandedKeyword = group.matchKey;
        }

        persistLensState({ selectedKeyword: expandedKeyword });
        render();
      });

      item.append(button);

      if (expandedKeyword === group.matchKey) {
        const snippets = document.createElement('div');
        snippets.className = 'reference-lens-snippets';

        group.snippets.forEach((snippet) => {
          const snippetItem = document.createElement('article');
          snippetItem.className = 'reference-lens-snippet';

          const label = document.createElement('div');
          label.className = 'reference-lens-source';
          renderSourceLine(label, snippet);

          const body = document.createElement('div');
          body.className = 'reference-lens-body';
          renderLensBodyContent(body, snippet);

          snippetItem.append(label, body);
          snippets.append(snippetItem);
        });

        item.append(snippets);
      }

      results.append(item);
    });
  };

  openButton.addEventListener('click', () => {
    setOpen(true, true, true);
    render();
  });

  resizeHandle?.addEventListener('pointerdown', (event) => {
    if (!canResizeLens() || panel.hidden) return;

    event.preventDefault();
    resizeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: panel.getBoundingClientRect().width,
      latestWidth: panel.getBoundingClientRect().width,
    };

    document.documentElement.classList.add('is-reference-lens-resizing');
    window.addEventListener('pointermove', onResizePointerMove);
    window.addEventListener('pointerup', onResizePointerEnd);
    window.addEventListener('pointercancel', onResizePointerEnd);
    window.addEventListener('blur', stopResizing);
  });

  resizeHandle?.addEventListener('keydown', (event) => {
    if (!canResizeLens() || panel.hidden) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const step = event.shiftKey ? 60 : 20;
    const currentWidth = panel.getBoundingClientRect().width;
    const nextWidth =
      currentWidth + (event.key === 'ArrowLeft' ? step : -step);

    persistLensState({ width: applyLensWidth(nextWidth) });
  });

  const closeLens = () => {
    setOpen(false);
    openButton.focus();
  };

  closeButton?.addEventListener('click', closeLens);
  input.addEventListener('input', () => {
    persistLensState({ query: input.value });
    render();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && canResizeLens() && !panel.hidden) {
      closeLens();
    }
  });

  desktopMedia.addEventListener('change', (event) => {
    if (!event.matches) stopResizing();
  });

  setOpen(
    typeof storedLensState.isOpen === 'boolean'
      ? storedLensState.isOpen
      : !panel.hidden,
    false,
  );
  render();
};

const initializedRoots = new WeakSet<HTMLElement>();

const initializeDesktopRoots = () => {
  if (!desktopMedia.matches) return;

  roots.forEach((root) => {
    if (initializedRoots.has(root)) return;
    initializedRoots.add(root);
    initReferenceLens(root);
  });
};

initializeDesktopRoots();
desktopMedia.addEventListener('change', initializeDesktopRoots);
