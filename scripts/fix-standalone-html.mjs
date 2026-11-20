import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'dist-standalone', 'index.html');
const html = await readFile(target, 'utf8');

// A classic (non-module) script works from file:// inside an Android WebView.
const fixed = html.replace(
  /<script type="module" crossorigin src=/g,
  '<script defer src=',
);

if (fixed === html) {
  console.warn('No module script tag found; index.html left unchanged.');
}
await writeFile(target, fixed);
console.log('Standalone index.html now uses a classic deferred script.');
