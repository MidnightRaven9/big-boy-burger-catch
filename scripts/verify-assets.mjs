import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mascotLayers = [
  'leg-back.png',
  'leg-front.png',
  'torso.png',
  'arm-left.png',
  'plate-arm.png',
  'head.png',
];
const expressionHeads = [
  'head-normal.png',
  'head-blink.png',
  'head-happy.png',
  'head-shock.png',
  'head-sad.png',
];
const files = [
  'mascot.png',
  'burger.png',
  'gravy.png',
  ...mascotLayers.map((name) => `mascot/${name}`),
  ...expressionHeads.map((name) => `mascot/${name}`),
];
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
      `OK   ${name.padEnd(24)} ${width}x${height}  ${(info.size / 1024).toFixed(1)} KiB  sha256:${hash}`,
    );
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

try {
  const metadata = JSON.parse(
    await readFile(path.join(root, 'public', 'assets', 'mascot', 'layers.json'), 'utf8'),
  );
  if (Object.keys(metadata.expressionHeads ?? {}).length !== 5) {
    throw new Error('expected 5 expression heads');
  }
  if (Object.keys(metadata.layers ?? {}).length !== 6) {
    throw new Error('expected 6 articulated layers');
  }
  console.log('OK   mascot/layers.json     6 layers, 5 expression heads');
} catch (error) {
  failed = true;
  console.error(`FAIL mascot/layers.json: ${error instanceof Error ? error.message : String(error)}`);
}

if (failed) {
  console.error('\nAll original PNGs and generated mascot layers must exist before publishing.');
  process.exit(1);
}
console.log('\nAll original artwork and articulated mascot assets are present and valid.');
