// Checks that every relative link, image and anchor in the Markdown files of this repository resolves.
// No dependencies. External links (http, https, mailto) are not fetched.
//
//   node tools/check-links.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'android']);

function markdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) files.push(...markdownFiles(path));
    } else if (entry.endsWith('.md')) {
      files.push(path);
    }
  }
  return files;
}

// Removes fenced code blocks (also inside block quotes) and inline code, but keeps line numbers.
function withoutCode(text) {
  let fence = null;
  return text
    .split('\n')
    .map((line) => {
      const bare = line.replace(/^[\s>]+/, '');
      const marker = bare.match(/^(`{3,}|~{3,})/);
      if (marker) {
        if (fence === null) fence = marker[1][0];
        else if (marker[1][0] === fence) fence = null;
        return '';
      }
      return fence === null ? line.replace(/`[^`]*`/g, '') : '';
    })
    .join('\n');
}

// GitHub's heading anchors: lower case, punctuation removed, spaces to hyphens, repeats get -1, -2...
function anchorsOf(text) {
  const seen = new Map();
  const anchors = new Set();
  for (const line of withoutCode(text).split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (!heading) continue;
    let title = heading[1]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/[*_~]/g, (c) => (c === '_' ? c : ''));
    let slug = title.toLowerCase().trim().replace(/[^\p{L}\p{N}\p{M} _-]/gu, '').replace(/ /g, '-');
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    anchors.add(n === 0 ? slug : `${slug}-${n}`);
  }
  return anchors;
}

function linksOf(text) {
  const links = [];
  const lines = withoutCode(text).split('\n');
  lines.forEach((line, index) => {
    for (const m of line.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) links.push([index + 1, m[1]]);
    for (const m of line.matchAll(/(?:src|href)="([^"]+)"/g)) links.push([index + 1, m[1]]);
    for (const m of line.matchAll(/srcset="([^"]+)"/g)) links.push([index + 1, m[1].split(',')[0].trim().split(/\s+/)[0]]);
  });
  return links;
}

const anchorCache = new Map();
const problems = [];
let checked = 0;

for (const file of markdownFiles(ROOT)) {
  const text = readFileSync(file, 'utf8');
  for (const [line, target] of linksOf(text)) {
    if (/^(https?:|mailto:|tel:|data:)/i.test(target)) continue;
    checked++;
    const [rawPath, rawAnchor] = target.split('#');
    const path = decodeURIComponent(rawPath);
    const destination = path === '' ? file : path.startsWith('/') ? join(ROOT, path) : resolve(dirname(file), path);
    const where = `${relative(ROOT, file).split(sep).join('/')}:${line}`;
    if (!existsSync(destination)) {
      problems.push(`${where}: missing file ${target}`);
      continue;
    }
    if (rawAnchor && destination.endsWith('.md')) {
      if (!anchorCache.has(destination)) anchorCache.set(destination, anchorsOf(readFileSync(destination, 'utf8')));
      if (!anchorCache.get(destination).has(decodeURIComponent(rawAnchor).toLowerCase())) problems.push(`${where}: no heading for #${rawAnchor} in ${relative(ROOT, destination).split(sep).join('/')}`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s) in ${checked} relative links.`);
  process.exit(1);
}
console.log(`ok: ${checked} relative links and anchors resolve.`);
