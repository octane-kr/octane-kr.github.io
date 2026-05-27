import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const isLensCommentNode = (node) =>
  node?.type === 'html' &&
  typeof node.value === 'string' &&
  (/^\s*<!--\s*lens:[^\r\n]*-->\s*$/u.test(node.value) ||
    /^\s*<!--\s*\/lens\s*-->\s*$/u.test(node.value));

const stripLensComments = () => (tree) => {
  const walk = (node) => {
    if (!node || !Array.isArray(node.children)) return;

    node.children = node.children.filter((child) => {
      if (isLensCommentNode(child)) return false;

      walk(child);
      return true;
    });
  };

  walk(tree);
};

export default defineConfig({
  site: 'https://octane-kr.github.io',
  markdown: {
    remarkPlugins: [stripLensComments, remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
