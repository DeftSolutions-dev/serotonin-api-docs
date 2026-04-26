import sharp from 'sharp';
import potrace from 'potrace';
import fs from 'node:fs';

const SRC_WEBP = 'static/img/logo-hero.webp';
const PNG_OUT  = 'static/img/logo-hero.png';
const SVG_OUT  = 'static/img/logo-hero-outline.svg';

const ACCENT = '#1ae5bb';

await sharp(SRC_WEBP)
  .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(PNG_OUT);
console.log('wrote', PNG_OUT);

potrace.trace(
  PNG_OUT,
  {
    threshold: 128,
    color:        ACCENT,
    background:   'transparent',
    optTolerance: 0.4,
    turdSize:     2,
    alphaMax:     1.0,
    optCurve:     true,
  },
  (err, svg) => {
    if (err) { console.error(err); process.exit(1); }
    const stripped = svg
      .replace(/fill="[^"]*"/g, 'fill="none"')
      .replace(/<svg /, `<svg stroke="${ACCENT}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" `);
    fs.writeFileSync(SVG_OUT, stripped);
    console.log('wrote', SVG_OUT, svg.length, 'bytes');
  }
);
