import potrace from 'potrace';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'static/img/logo.png';
const OUT = 'static/img/logo-outline.svg';

potrace.trace(
  SRC,
  {
    threshold: 128,
    color:     '#00d4aa',
    background: 'transparent',
    optTolerance: 0.4,
    turdSize:    2,
    alphaMax:    1.0,
    optCurve:    true,
  },
  (err, svg) => {
    if (err) { console.error(err); process.exit(1); }
    const stripped = svg
      .replace(/fill="[^"]*"/g, 'fill="none"')
      .replace(/<svg /, '<svg stroke="#00d4aa" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" ');
    fs.writeFileSync(OUT, stripped);
    console.log(`wrote ${OUT}, ${svg.length} bytes`);
  }
);
