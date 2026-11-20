import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['mascot.png', 'burger.png', 'gravy.png'];
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let failed = false;

for (const name of files) {
  const target = path.join(root, 'public', 'assets', name);
  try {
    const info = await stat(target);
    const buffer = await readFile(target);
    if (!buffer.subarray(0, 8).equals(signature)) {
      throw new Error('not a PNG file');
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    console.log(
      `OK   ${name.padEnd(12)} ${width}x${height}  ${(info.size / 1024).toFixed(1)} KiB  sha256:${hash}`,
    );
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  console.error('\nAll three ORIGINAL PNG artworks must exist in public/assets/ before publishing.');
  process.exit(1);
}
console.log('\nAll three original PNG assets are present and valid.');
