// Gera planta-baixa.svg (e a versão com rota de fuga e zoneamento) a partir do modelo.
// Uso: node tools/build-plan.js
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
require(path.join(root, 'js/model.js')); require(path.join(root, 'js/plan.js'));
const m = globalThis.VEX_MODEL, P = globalThis.VEXPlan;
fs.writeFileSync(path.join(root, 'planta-baixa.svg'), P.svg(m));
fs.writeFileSync(path.join(root, 'planta-baixa-rotas-e-ruido.svg'), P.svg(m, { layers: { noise: true, escape: true } }));
console.log('ok', P.escape.map(e => e.from + ' ' + e.len.toFixed(2) + ' m').join(' | '));
