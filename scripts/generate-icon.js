const fs = require('fs/promises');
const path = require('path');
const { PNG } = require('pngjs');
const pngToIco = require('png-to-ico').default;

function sampleBilinear(source, x, y) {
  const x0 = Math.max(0, Math.min(source.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(source.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(source.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(source.height - 1, y0 + 1));
  const tx = x - x0;
  const ty = y - y0;
  const out = [0, 0, 0, 0];
  const weights = [
    [(1 - tx) * (1 - ty), x0, y0],
    [tx * (1 - ty), x1, y0],
    [(1 - tx) * ty, x0, y1],
    [tx * ty, x1, y1]
  ];

  for (const [weight, sx, sy] of weights) {
    const idx = (source.width * sy + sx) << 2;
    out[0] += source.data[idx] * weight;
    out[1] += source.data[idx + 1] * weight;
    out[2] += source.data[idx + 2] * weight;
    out[3] += source.data[idx + 3] * weight;
  }
  return out.map((value) => Math.round(value));
}

function resizeCover(source, size) {
  const target = new PNG({ width: size, height: size });
  const sourceSide = Math.min(source.width, source.height);
  const offsetX = (source.width - sourceSide) / 2;
  const offsetY = (source.height - sourceSide) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = offsetX + ((x + 0.5) / size) * sourceSide - 0.5;
      const sy = offsetY + ((y + 0.5) / size) * sourceSide - 0.5;
      const [r, g, b, a] = sampleBilinear(source, sx, sy);
      const idx = (size * y + x) << 2;
      target.data[idx] = r;
      target.data[idx + 1] = g;
      target.data[idx + 2] = b;
      target.data[idx + 3] = a;
    }
  }

  return target;
}

async function main() {
  const root = path.join(__dirname, '..');
  const sourcePath = path.join(root, 'src', 'renderer', 'assets', 'mabdc-logo-circle.png');
  const buildDir = path.join(root, 'build');
  const appAssetDir = path.join(root, 'src', 'assets');
  const annotationAssetDir = path.join(root, 'src', 'annotation-app', 'assets');
  await fs.mkdir(buildDir, { recursive: true });
  await fs.mkdir(appAssetDir, { recursive: true });
  await fs.mkdir(annotationAssetDir, { recursive: true });

  const source = PNG.sync.read(await fs.readFile(sourcePath));
  const icon = resizeCover(source, 256);
  const pngBuffer = PNG.sync.write(icon);
  const buildPngPath = path.join(buildDir, 'icon.png');
  const buildIcoPath = path.join(buildDir, 'icon.ico');
  const appPngPath = path.join(appAssetDir, 'icon.png');
  const appIcoPath = path.join(appAssetDir, 'icon.ico');
  const annotationLogoPath = path.join(annotationAssetDir, 'mabdc-logo-circle.png');
  const annotationPngPath = path.join(annotationAssetDir, 'icon.png');
  const annotationIcoPath = path.join(annotationAssetDir, 'icon.ico');

  await fs.writeFile(buildPngPath, pngBuffer);
  await fs.writeFile(appPngPath, pngBuffer);
  await fs.writeFile(annotationPngPath, pngBuffer);
  await fs.copyFile(sourcePath, annotationLogoPath);
  const icoBuffer = await pngToIco(buildPngPath);
  await fs.writeFile(buildIcoPath, icoBuffer);
  await fs.writeFile(appIcoPath, icoBuffer);
  await fs.writeFile(annotationIcoPath, icoBuffer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
