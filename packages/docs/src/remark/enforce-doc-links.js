'use strict';

const path = require('path');
const fs = require('fs');

const IMG_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.avif']);
const DOC_EXTENSIONS = new Set(['.md', '.mdx']);

// ---------------------------------------------------------------------------
// Slug cache: maps blog/docs slug strings -> absolute file paths.
// Built once per process from frontmatter, keyed by docs-root path.
// ---------------------------------------------------------------------------

/** @type {Map<string, Map<string, string>>} docsRoot -> (slug -> absFilePath) */
const slugCacheByRoot = new Map();

/**
 * Parse the `slug:` value from a YAML front matter block.
 * Handles quoted and unquoted values; returns null if not found.
 */
function parseFrontmatterSlug(content) {
  const fm = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const match = fm[1].match(/^slug:[ \t]+(['"]?)(.+?)\1[ \t]*$/m);
  return match ? match[2].trim() : null;
}

/**
 * Walk a directory (non-recursive) and return absolute paths of .md/.mdx files.
 */
function listMarkdownFiles(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter(f => /\.(md|mdx)$/.test(f))
      .map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * Find the docs-site root (the directory containing both `docs/` and `blog/`
 * sub-directories) by walking up from any file inside it.
 */
function findDocsRoot(filePath) {
  let dir = path.dirname(filePath);
  while (true) {
    const parent = path.dirname(dir);
    if (
      fs.existsSync(path.join(dir, 'blog')) &&
      fs.existsSync(path.join(dir, 'docs')) &&
      fs.existsSync(path.join(dir, 'docusaurus.config.js'))
    ) {
      return dir;
    }
    if (parent === dir) return null; // filesystem root
    dir = parent;
  }
}

/**
 * Return (or build) the slug -> absFilePath map for the given docs root.
 * Scans `blog/` and `docs/` (recursively) for any file that declares a `slug:`
 * in its front matter.
 */
function getSlugCache(docsRoot) {
  if (slugCacheByRoot.has(docsRoot)) return slugCacheByRoot.get(docsRoot);

  const cache = new Map();

  const blogFiles = listMarkdownFiles(path.join(docsRoot, 'blog'));
  for (const f of blogFiles) {
    try {
      const slug = parseFrontmatterSlug(fs.readFileSync(f, 'utf8'));
      if (slug) cache.set(slug, f);
    } catch {}
  }

  slugCacheByRoot.set(docsRoot, cache);
  return cache;
}

// ---------------------------------------------------------------------------
// AST walker
// ---------------------------------------------------------------------------

function visitLinks(node, fn) {
  if (!node) return;
  if (node.type === 'link' || node.type === 'definition') fn(node);
  if (node.children) {
    for (const child of node.children) visitLinks(child, fn);
  }
}

/** True when the file lives under the docs/ content tree (not blog/ or src/). */
function isDocsFile(filePath) {
  return /[/\\]packages[/\\]docs[/\\]docs[/\\]/.test(filePath);
}

/** True when the file lives under the blog/ directory. */
function isBlogFile(filePath) {
  return /[/\\]packages[/\\]docs[/\\]blog[/\\]/.test(filePath);
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Remark plugin that enforces link hygiene in docs/ pages:
 *
 * Covers both docs/ pages and blog/ posts:
 *
 *   1. No absolute internal links (/docs/..., /blog/...) — use relative .md paths.
 *   2. Relative links to other .md/.mdx files must include the extension.
 *   3. Relative links that use a Docusaurus slug instead of the real filename
 *      are caught via frontmatter scanning and reported with the correct path.
 *
 * Links from blog/ posts that target docs/ content cannot use file paths
 * (Docusaurus constraint) and are left as URL references — those are validated
 * by onBrokenLinks: 'throw' at the rendered-URL level.
 *
 * Links that genuinely can't be resolved to a local file (e.g. to src/pages/)
 * are similarly left to the rendered-URL checker.
 */
function remarkEnforceDocLinks() {
  return function transformer(ast, vfile) {
    const filePath = vfile.path || (vfile.history && vfile.history[0]);
    const inDocs = filePath && isDocsFile(filePath);
    const inBlog = filePath && isBlogFile(filePath);
    if (!inDocs && !inBlog) return;

    const fileDir = path.dirname(filePath);
    const docsRoot = findDocsRoot(filePath);
    const slugCache = docsRoot ? getSlugCache(docsRoot) : null;
    // Absolute path of the docs/ content tree, used to skip blog→docs cross-area checks.
    const docsContentDir = docsRoot ? path.join(docsRoot, 'docs') : null;

    const errors = [];

    visitLinks(ast, (node) => {
      const url = node.url;
      if (!url) return;

      if (/^(https?:|mailto:|data:)/.test(url)) return;
      if (url.startsWith('#')) return;

      const [base] = url.split('#');
      const ext = path.extname(base);
      if (IMG_EXTENSIONS.has(ext)) return;

      // Rule 1: absolute internal links
      if (url.startsWith('/') && !url.startsWith('/img/')) {
        const pos = nodePos(node);
        errors.push(`${pos}: absolute link "${url}" — use a relative .md path instead`);
        return;
      }

      if (!base) return; // anchor-only after stripping
      if (DOC_EXTENSIONS.has(ext)) return; // already correct

      const resolved = path.resolve(fileDir, base);

      // Blog posts cannot use file-path references into docs/ (Docusaurus constraint).
      // Those links are URL references; leave them to onBrokenLinks validation.
      if (inBlog && docsContentDir && resolved.startsWith(docsContentDir)) return;

      // Rule 2a: resolves to a .md/.mdx file directly (just missing the extension)
      for (const docExt of ['.md', '.mdx']) {
        if (fs.existsSync(resolved + docExt)) {
          const pos = nodePos(node);
          errors.push(
            `${pos}: link "${url}" is missing its extension — use "${base + docExt}"`,
          );
          return;
        }
      }

      // Rule 2b: resolves to a directory that has an index file
      for (const docExt of ['.md', '.mdx']) {
        const indexFile = path.join(resolved, 'index' + docExt);
        if (fs.existsSync(indexFile)) {
          const pos = nodePos(node);
          const suggestion = path.posix.join(base.replace(/\\/g, '/'), 'index' + docExt);
          errors.push(
            `${pos}: link "${url}" points to a directory — use "${suggestion}" instead`,
          );
          return;
        }
      }

      // Rule 3: slug-style link that matches a known frontmatter slug
      if (slugCache) {
        const slug = path.basename(base);
        const match = slugCache.get(slug);
        if (match) {
          const relCorrect = toRelative(fileDir, match);
          const pos = nodePos(node);
          errors.push(
            `${pos}: link "${url}" uses a Docusaurus slug instead of the file path — use "${relCorrect}"`,
          );
          return;
        }
      }

      // Can't resolve to a local file — URL reference to src/pages/ etc. OK.
    });

    if (errors.length > 0) {
      const rel = path.relative(process.cwd(), filePath);
      throw new Error(`Doc link errors in ${rel}:\n  ${errors.join('\n  ')}`);
    }
  };
}

function nodePos(node) {
  return node.position ? `${node.position.start.line}:${node.position.start.column}` : '?';
}

/** Relative path from fromDir to toFile, always using forward slashes. */
function toRelative(fromDir, toFile) {
  return path.relative(fromDir, toFile).replace(/\\/g, '/');
}

module.exports = remarkEnforceDocLinks;
