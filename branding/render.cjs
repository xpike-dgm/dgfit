const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const svg = fs.readFileSync(__dirname + '/logo.svg', 'utf8');
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, size, pad] of [['icon-512x512.png',512,0],['icon-192x192.png',192,0],['apple-touch-icon.png',180,0],['maskable-512x512.png',512,1],['favicon-48.png',48,0],['logo.png',256,0]]) {
    await p.setViewportSize({ width: size, height: size });
    const s2 = (name.startsWith('apple')||pad) ? svg.replace('rx="112"','rx="0"') : svg;
    const inner = pad ? `<div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#6c9dfb,#3d6be6);display:flex;align-items:center;justify-content:center"><div style="width:${size*0.8}px;height:${size*0.8}px">${s2.replace('<svg ','<svg width="100%" height="100%" ')}</div></div>` : s2.replace('<svg ', `<svg width="${size}" height="${size}" `);
    await p.setContent(`<html><body style="margin:0;background:transparent">${inner}</body></html>`);
    await p.screenshot({ path: __dirname + '/' + name, omitBackground: true, clip: {x:0,y:0,width:size,height:size} });
  }
  await b.close();
})();
