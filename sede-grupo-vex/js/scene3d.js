/*
 * Modelo 3D da sede do Grupo VEX, construído a partir de VEX_MODEL (mesmos dados da planta).
 * Requer THREE r147 (three.min.js), OrbitControls e RoomEnvironment (examples/js).
 * Plano -> 3D: x -> X, y (sul) -> Z, altura -> Y.
 */
(function () {
  const THREE = window.THREE;
  const M = window.VEX_MODEL;
  const LOGOS = window.VEX_LOGOS;
  const V = (x, y, z) => new THREE.Vector3(x, z, y);
  const DEG = Math.PI / 180;
  const FONT_D = "'Archivo', 'Arial Narrow', Arial, sans-serif";
  const FONT_M = "'IBM Plex Mono', ui-monospace, monospace";

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function mkTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');

  /* ---------------------------------------------------------------- texturas procedurais */
  const TX = {};
  function noiseLayer(g, w, h, r, n, base, spread, alpha, size) {
    for (let i = 0; i < n; i++) {
      const v = Math.floor(base + (r() - 0.5) * spread);
      g.fillStyle = `rgba(${v},${v},${v - 3},${alpha})`;
      const s = size * (0.4 + r());
      g.fillRect(r() * w, r() * h, s, s);
    }
  }
  function concreteCanvas(w, h, base, seed, holes, blot = 0.16) {
    const c = cnv(w, h), g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = `rgb(${base},${base - 2},${base - 6})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = r() * h, rad = 120 + r() * 260;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); const d = (r() - 0.5) * 14;
      gr.addColorStop(0, `rgba(${base + d},${base + d - 2},${base + d - 6},${blot})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    noiseLayer(g, w, h, r, 14000, base, 30, 0.12, 1.6);
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(70,68,64,${0.15 + r() * 0.25})`; g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 1.6, 0, 7); g.fill(); }
    if (holes) holes(g, w, h);
    return c;
  }
  function buildTextures() {
    // concreto polido (piso) — tile 2 x 2 m
    TX.concreteFloor = mkTex(concreteCanvas(1024, 1024, 186, 11));
    // empena / concreto aparente — tile 2 x 2 m
    TX.concreteWall = mkTex(concreteCanvas(1024, 1024, 170, 12, null, 0.08));
    // placas cimentícias 1,20 x 2,40 com juntas e furos de fôrma
    TX.concretePanel = mkTex(concreteCanvas(512, 1024, 198, 13, (g, w, h) => {
      g.fillStyle = 'rgba(60,58,55,0.75)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
      [[0.18, 0.12], [0.82, 0.12], [0.18, 0.5], [0.82, 0.5], [0.18, 0.88], [0.82, 0.88]].forEach(([u, v]) => {
        const gr = g.createRadialGradient(u * w, v * h, 1, u * w, v * h, 9); gr.addColorStop(0, 'rgba(50,48,45,0.9)'); gr.addColorStop(0.6, 'rgba(90,88,84,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(u * w, v * h, 9, 0, 7); g.fill();
      });
    }, 0.07));
    // carvalho em réguas (piso) — tile 1,8 x 1,2 m
    {
      const c = cnv(1024, 683), g = c.getContext('2d'), r = rng(21);
      const rows = 6, ph = c.height / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * 600;
        while (x < c.width) {
          const len = 380 + r() * 420, tone = 168 + (r() - 0.5) * 34;
          g.fillStyle = `rgb(${tone + 22},${tone - 8},${tone - 52})`; g.fillRect(x, i * ph, len, ph);
          for (let k = 0; k < 18; k++) {
            g.strokeStyle = `rgba(110,72,40,${0.06 + r() * 0.1})`; g.lineWidth = 0.6 + r() * 1.4; g.beginPath();
            const yy = i * ph + r() * ph; g.moveTo(x, yy);
            for (let s = 0; s <= len; s += 40) g.lineTo(x + s, yy + Math.sin(s / 90 + k) * 2.5);
            g.stroke();
          }
          g.fillStyle = 'rgba(70,45,25,0.5)'; g.fillRect(x, i * ph, 2, ph); x += len;
        }
        g.fillStyle = 'rgba(70,45,25,0.45)'; g.fillRect(0, i * ph, c.width, 2);
      }
      TX.oakFloor = mkTex(c);
    }
    // painel de madeira vertical — tile 0,6 x 2,4 m
    TX.oakPanel = mkTex(woodVertical(256, 1024, 31, 0.6, false));
    TX.ripado = mkTex(woodVertical(600, 1200, 32, 0.6, true));
    TX.ripadoBump = mkTex(ripadoBump(600, 1200), false);
    // feltro acústico
    {
      const c = cnv(256, 256), g = c.getContext('2d'), r = rng(41);
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9000; i++) { const v = 222 + r() * 33; g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1); }
      TX.felt = mkTex(c);
    }
    // carpete em placas 50x50
    {
      const c = cnv(256, 256), g = c.getContext('2d'), r = rng(42);
      g.fillStyle = '#5a5f62'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9000; i++) { const v = 70 + r() * 40; g.fillStyle = `rgba(${v},${v + 3},${v + 5},0.6)`; g.fillRect(r() * 256, r() * 256, 1, 1 + r() * 2); }
      g.fillStyle = 'rgba(40,42,44,0.5)'; g.fillRect(0, 0, 256, 1); g.fillRect(0, 0, 1, 256);
      TX.carpet = mkTex(c);
    }
    // porcelanato cimentício 60 x 120
    {
      const c = concreteCanvas(256, 512, 182, 51), g = c.getContext('2d');
      g.fillStyle = 'rgba(90,90,88,0.7)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 512);
      TX.porcelain = mkTex(c);
    }
    // revestimento da copa: peça 7,5 x 30 cm empilhada
    {
      const c = cnv(256, 256), g = c.getContext('2d'), r = rng(61);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { const v = 226 + r() * 18; g.fillStyle = `rgb(${v},${v},${v - 2})`; g.fillRect(i * 32, j * 128, 32, 128); }
      g.fillStyle = 'rgba(150,150,148,0.9)'; for (let i = 0; i <= 8; i++) g.fillRect(i * 32 - 1, 0, 2, 256); g.fillRect(0, 127, 256, 2); g.fillRect(0, 0, 256, 1);
      TX.tile = mkTex(c);
    }
    // vidro canelado / rolô screen
    {
      const c = cnv(64, 8), g = c.getContext('2d');
      for (let i = 0; i < 64; i++) { const v = Math.floor(200 + 55 * Math.sin(i / 64 * Math.PI * 8) ** 2); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i, 0, 1, 8); }
      TX.screenFabric = mkTex(c);
    }
  }
  function woodVertical(w, h, seed, mWidth, slats) {
    const c = cnv(w, h), g = c.getContext('2d'), r = rng(seed);
    const n = slats ? 6 : 1, sw = w / n;
    for (let i = 0; i < n; i++) {
      const tone = 168 + (r() - 0.5) * 30;
      const x0 = i * sw, ww = slats ? sw * 0.72 : sw;
      g.fillStyle = `rgb(${tone + 24},${tone - 6},${tone - 50})`; g.fillRect(x0, 0, ww, h);
      for (let k = 0; k < (slats ? 10 : 40); k++) {
        g.strokeStyle = `rgba(105,68,38,${0.06 + r() * 0.12})`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath();
        const xx = x0 + r() * ww; g.moveTo(xx, 0);
        for (let s = 0; s <= h; s += 40) g.lineTo(xx + Math.sin(s / 140 + k) * 3, s);
        g.stroke();
      }
      if (slats) { g.fillStyle = '#231d18'; g.fillRect(x0 + ww, 0, sw - ww, h); g.fillStyle = 'rgba(255,240,220,0.18)'; g.fillRect(x0, 0, 3, h); g.fillStyle = 'rgba(40,25,10,0.25)'; g.fillRect(x0 + ww - 4, 0, 4, h); }
    }
    if (!slats) { g.fillStyle = 'rgba(60,40,22,0.6)'; g.fillRect(0, 0, 2, h); g.fillRect(0, 0, w, 2); }
    return c;
  }
  function ripadoBump(w, h) {
    const c = cnv(w, h), g = c.getContext('2d'); const sw = w / 6;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000000';
    for (let i = 0; i < 6; i++) g.fillRect(i * sw + sw * 0.72, 0, sw * 0.28, h);
    return c;
  }

  /* ---------------------------------------------------------------- texturas gráficas (telas, placas) */
  function logoImg(key) { return IMGS[key]; }
  const IMGS = {};
  function loadLogos() {
    return Promise.all(Object.keys(LOGOS).map(k => new Promise((res) => {
      const im = new Image(); im.onload = () => { IMGS[k] = im; res(); }; im.onerror = () => res(); im.src = LOGOS[k];
    })));
  }
  function drawLogo(g, key, x, y, size) { const im = logoImg(key); if (im) g.drawImage(im, x, y, size, size); }

  function ui(w, h) { const c = cnv(w, h), g = c.getContext('2d'); g.fillStyle = '#0d1315'; g.fillRect(0, 0, w, h); return { c, g }; }
  function header(g, w, title, sub) {
    g.fillStyle = '#122024'; g.fillRect(0, 0, w, 74);
    g.fillStyle = '#2a8a8f'; g.fillRect(0, 70, w, 4);
    g.font = `700 30px ${FONT_D}`; g.fillStyle = '#e8eeee'; g.fillText(title, 28, 46);
    if (sub) { g.font = `500 18px ${FONT_M}`; g.fillStyle = '#7fa6a8'; g.textAlign = 'right'; g.fillText(sub, w - 28, 44); g.textAlign = 'left'; }
  }
  function illus(g, w, h) { g.font = `600 15px ${FONT_M}`; g.fillStyle = 'rgba(232,170,120,0.85)'; g.textAlign = 'right'; g.fillText('DADOS ILUSTRATIVOS · SISTEMA VEX', w - 22, h - 16); g.textAlign = 'left'; }
  const C_OK = '#3fae7a', C_WARN = '#e0a238', C_BAD = '#e0603a', C_P = '#2a8a8f';

  function dashboard(kind) {
    const W = 1024, H = 576, { c, g } = ui(W, H), r = rng(kind.length * 97);
    g.textBaseline = 'alphabetic';
    if (kind === 'obras') {
      header(g, W, 'OBRAS EM ANDAMENTO', '7 ativas');
      g.font = `500 17px ${FONT_M}`; g.fillStyle = '#7b8f91';
      ['OBRA', 'AVANÇO FÍSICO', 'PRAZO', 'STATUS'].forEach((t, i) => g.fillText(t, [28, 200, 700, 850][i], 110));
      for (let i = 0; i < 7; i++) {
        const y = 150 + i * 56, p = 0.18 + r() * 0.75, st = [C_OK, C_OK, C_WARN, C_OK, C_BAD, C_OK, C_WARN][i];
        g.fillStyle = i % 2 ? '#101a1d' : '#0d1315'; g.fillRect(16, y - 32, W - 32, 52);
        g.font = `700 22px ${FONT_D}`; g.fillStyle = '#dfe7e7'; g.fillText(`OBRA ${String(i + 1).padStart(2, '0')}`, 28, y);
        g.fillStyle = '#1d2a2d'; g.fillRect(200, y - 16, 440, 16); g.fillStyle = C_P; g.fillRect(200, y - 16, 440 * p, 16);
        g.font = `500 18px ${FONT_M}`; g.fillStyle = '#b9c7c8'; g.fillText(`${Math.round(p * 100)}%`, 652, y);
        g.fillText(`${Math.round(20 + r() * 300)} d`, 700, y);
        g.fillStyle = st; g.beginPath(); g.arc(862, y - 8, 9, 0, 7); g.fill();
        g.fillStyle = '#b9c7c8'; g.fillText(st === C_OK ? 'no prazo' : st === C_WARN ? 'atenção' : 'crítico', 882, y);
      }
    } else if (kind === 'cronograma') {
      header(g, W, 'CRONOGRAMA · MARCOS', 'semanas 41–52');
      for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? '#0f171a' : '#0d1315'; g.fillRect(180 + k * 68, 90, 68, 450); g.font = `500 14px ${FONT_M}`; g.fillStyle = '#6f8486'; g.fillText(`S${41 + k}`, 196 + k * 68, 110); }
      for (let i = 0; i < 8; i++) {
        const y = 140 + i * 50, s = Math.floor(r() * 6), l = 2 + Math.floor(r() * 6), done = r();
        g.font = `600 17px ${FONT_D}`; g.fillStyle = '#c9d4d4'; g.fillText(['FUNDAÇÕES', 'ESTRUTURA', 'ALVENARIA', 'INSTALAÇÕES', 'REVESTIM.', 'ESQUADRIAS', 'PINTURA', 'ENTREGA'][i], 24, y + 6);
        g.fillStyle = '#24464a'; g.fillRect(184 + s * 68, y - 12, l * 68, 22); g.fillStyle = C_P; g.fillRect(184 + s * 68, y - 12, l * 68 * done, 22);
        if (i % 3 === 0) { g.fillStyle = '#e8eeee'; g.save(); g.translate(184 + (s + l) * 68, y - 1); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); }
      }
      g.strokeStyle = C_BAD; g.lineWidth = 3; g.beginPath(); g.moveTo(180 + 4.4 * 68, 92); g.lineTo(180 + 4.4 * 68, 540); g.stroke();
      g.font = `600 14px ${FONT_M}`; g.fillStyle = C_BAD; g.fillText('HOJE', 180 + 4.4 * 68 + 6, 130);
    } else if (kind === 'rdo') {
      header(g, W, 'RDOs PENDENTES', 'diário de obra');
      g.font = `800 190px ${FONT_D}`; g.fillStyle = C_WARN; g.fillText('4', 60, 330);
      g.font = `500 22px ${FONT_M}`; g.fillStyle = '#9fb1b2'; g.fillText('sem envio há > 24 h', 64, 380);
      for (let i = 0; i < 6; i++) {
        const y = 140 + i * 64, d = Math.floor(r() * 3);
        g.fillStyle = '#121c1f'; g.fillRect(420, y - 36, 570, 52);
        g.font = `700 22px ${FONT_D}`; g.fillStyle = '#dfe7e7'; g.fillText(`OBRA ${String(i + 1).padStart(2, '0')}`, 440, y);
        g.font = `500 18px ${FONT_M}`; g.fillStyle = d ? C_WARN : C_OK; g.fillText(d ? `pendente · ${d} dia${d > 1 ? 's' : ''}` : 'enviado hoje', 640, y);
      }
    } else if (kind === 'restricoes') {
      header(g, W, 'RESTRIÇÕES CRÍTICAS', 'remoção em 7 dias');
      const tags = ['PROJETO', 'MATERIAL', 'MÃO DE OBRA', 'EQUIPAMENTO', 'LIBERAÇÃO', 'MATERIAL'];
      for (let i = 0; i < 6; i++) {
        const y = 140 + i * 66, crit = i < 2;
        g.fillStyle = crit ? 'rgba(224,96,58,0.14)' : '#111b1e'; g.fillRect(20, y - 38, W - 40, 56);
        g.fillStyle = crit ? C_BAD : C_WARN; g.fillRect(20, y - 38, 6, 56);
        g.font = `700 21px ${FONT_D}`; g.fillStyle = '#e1e9e9'; g.fillText(`OBRA ${String(1 + Math.floor(r() * 7)).padStart(2, '0')}`, 44, y);
        g.font = `600 16px ${FONT_M}`; g.fillStyle = '#0d1315'; const tw = g.measureText(tags[i]).width + 22;
        g.fillStyle = '#c9d4d4'; g.fillRect(190, y - 24, tw, 30); g.fillStyle = '#0d1315'; g.fillText(tags[i], 201, y - 3);
        g.fillStyle = '#9fb1b2'; g.font = `500 18px ${FONT_M}`; g.fillText(`prazo: ${1 + Math.floor(r() * 6)} d · resp. definido`, 230 + tw, y);
      }
    } else if (kind === 'suprimentos') {
      header(g, W, 'SUPRIMENTOS', 'compras e estoque');
      g.font = `700 20px ${FONT_D}`; g.fillStyle = '#c9d4d4'; g.fillText('COMPRAS ATRASADAS', 32, 124); g.fillText('MATERIAIS COM RISCO DE FALTA', 540, 124);
      g.font = `800 120px ${FONT_D}`; g.fillStyle = C_BAD; g.fillText('3', 40, 270); g.fillStyle = C_WARN; g.fillText('5', 548, 270);
      ['cimento', 'aço CA-50', 'bloco cerâmico', 'argamassa', 'eletroduto'].forEach((m, i) => {
        const y = 330 + i * 44, v = 0.15 + r() * 0.7;
        g.font = `500 18px ${FONT_M}`; g.fillStyle = '#9fb1b2'; g.fillText(m, 548, y);
        g.fillStyle = '#1d2a2d'; g.fillRect(740, y - 16, 240, 16); g.fillStyle = v < 0.35 ? C_BAD : C_WARN; g.fillRect(740, y - 16, 240 * v, 16);
      });
      ['pedido sem entrega', 'cotação vencida', 'fornecedor sem retorno'].forEach((m, i) => { g.font = `500 18px ${FONT_M}`; g.fillStyle = '#9fb1b2'; g.fillText(`· ${m}`, 40, 330 + i * 44); });
    } else if (kind === 'produtividade') {
      header(g, W, 'PRODUTIVIDADE · PLANEJADO × REALIZADO', 'PPC semanal');
      g.strokeStyle = '#1f2c2f'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(60, 140 + i * 80); g.lineTo(980, 140 + i * 80); g.stroke(); }
      const plan = [], real = []; for (let i = 0; i < 12; i++) { plan.push(0.62 + i * 0.02); real.push(0.5 + r() * 0.35); }
      const line = (arr, col, dash) => { g.strokeStyle = col; g.lineWidth = 4; g.setLineDash(dash); g.beginPath(); arr.forEach((v, i) => { const x = 70 + i * 82, y = 460 - v * 320; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]); };
      line(plan, '#7fa6a8', [10, 8]); line(real, '#3fc0b0', []);
      const lx = 70 + 11 * 82, ly = 460 - real[11] * 320; g.fillStyle = '#3fc0b0'; g.beginPath(); g.arc(lx, ly, 8, 0, 7); g.fill();
      g.font = `600 16px ${FONT_M}`; g.fillStyle = '#7fa6a8'; g.fillText('planejado', 70, 520); g.fillStyle = '#3fc0b0'; g.fillText('realizado', 200, 520);
      g.fillStyle = C_BAD; g.fillRect(560, 500, 16, 16); g.fillStyle = '#c9d4d4'; g.fillText('2 alertas operacionais', 586, 514);
    }
    illus(g, W, H);
    return mkTex(c);
  }
  function monitorTex(seed) {
    const W = 512, H = 300, { c, g } = ui(W, H), r = rng(seed);
    const light = seed % 3 === 0;
    g.fillStyle = light ? '#e9eeee' : '#0f1618'; g.fillRect(0, 0, W, H);
    g.fillStyle = light ? '#1f5e63' : '#16363a'; g.fillRect(0, 0, W, 26);
    g.fillStyle = light ? '#d7dede' : '#141e21'; g.fillRect(0, 26, 90, H);
    for (let i = 0; i < 9; i++) {
      const y = 46 + i * 26, x = 110 + r() * 120, l = 60 + r() * 250;
      g.fillStyle = light ? '#b7c4c4' : '#22393c'; g.fillRect(110, y, 380, 2);
      g.fillStyle = i % 3 === 0 ? '#d9601f' : (light ? '#2a8a8f' : '#2a8a8f'); g.fillRect(x, y - 12, l, 9);
    }
    return mkTex(c);
  }
  function totemTex() {
    const W = 540, H = 960, c = cnv(W, H), g = c.getContext('2d');
    g.fillStyle = '#0d1315'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 300); drawLogo(g, 'vex-view', W / 2 - 140, 10, 280);
    // malha de voo / mapa aéreo esquemático (não é obra real)
    g.strokeStyle = 'rgba(42,138,143,0.55)'; g.lineWidth = 1;
    for (let x = 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, 330); g.lineTo(x, 760); g.stroke(); }
    for (let y = 330; y < 760; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = '#d9601f'; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 700); g.lineTo(60, 390); g.lineTo(480, 390); g.lineTo(480, 700); g.lineTo(140, 700); g.lineTo(140, 470); g.lineTo(400, 470); g.lineTo(400, 620); g.stroke();
    g.font = `700 30px ${FONT_D}`; g.fillStyle = '#e8eeee'; g.textAlign = 'center';
    g.fillText('IMAGENS AÉREAS', W / 2, 820); g.fillText('DAS OBRAS', W / 2, 856);
    g.font = `500 18px ${FONT_M}`; g.fillStyle = '#e8a878'; g.fillText('espaço reservado para material real', W / 2, 900); g.fillText('fornecido pela VEX View', W / 2, 926);
    return mkTex(c);
  }
  function slideTex() {
    const W = 1600, H = 900, c = cnv(W, H), g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    drawLogo(g, 'grupo-vex', 90, 120, 420);
    g.fillStyle = '#1d2124'; g.font = `800 64px ${FONT_D}`; g.fillText('UM ECOSSISTEMA,', 600, 300); g.fillText('UM PADRÃO.', 600, 380);
    g.fillStyle = '#1f5e63'; g.fillRect(600, 420, 140, 6);
    g.font = `500 28px ${FONT_M}`; g.fillStyle = '#4b5355'; g.fillText('planejar · gerir · executar · enxergar', 600, 480);
    ['sistema-vex', 'eap-goiania', 'vexor-engenharia', 'vex-view'].forEach((k, i) => drawLogo(g, k, 120 + i * 360, 600, 260));
    return mkTex(c);
  }
  function ceoScreenTex() {
    const W = 1280, H = 720, { c, g } = ui(W, H), r = rng(77);
    header(g, W, 'PAINEL EXECUTIVO · GRUPO VEX', 'visão do ecossistema');
    ['sistema-vex', 'eap-goiania', 'vexor-engenharia', 'vex-view'].forEach((k, i) => {
      const x = 30 + i * 310;
      g.fillStyle = '#ffffff'; g.fillRect(x, 100, 290, 160); drawLogo(g, k, x + 75, 105, 150);
      g.fillStyle = '#121c1f'; g.fillRect(x, 270, 290, 360);
      for (let j = 0; j < 4; j++) {
        const y = 320 + j * 80, v = 0.25 + r() * 0.7;
        g.fillStyle = '#7b8f91'; g.font = `500 17px ${FONT_M}`; g.fillText(['indicador A', 'indicador B', 'indicador C', 'indicador D'][j], x + 18, y - 14);
        g.fillStyle = '#1d2a2d'; g.fillRect(x + 18, y, 254, 14); g.fillStyle = j === 2 ? '#d9601f' : C_P; g.fillRect(x + 18, y, 254 * v, 14);
      }
    });
    illus(g, W, H);
    return mkTex(c);
  }
  function tvTex() {
    const W = 1280, H = 720, { c, g } = ui(W, H);
    g.fillStyle = '#10181a'; g.fillRect(0, 0, W, H);
    g.font = `800 92px ${FONT_D}`; g.fillStyle = '#d9601f'; g.textAlign = 'center'; g.fillText('VEX CUP', W / 2, 200);
    g.font = `500 30px ${FONT_M}`; g.fillStyle = '#9fb1b2'; g.fillText('torneio interno de pebolim', W / 2, 250);
    g.font = `700 64px ${FONT_D}`; g.fillStyle = '#e8eeee'; g.fillText('OPERAÇÕES  3 × 2  FINANCEIRO', W / 2, 420);
    g.font = `500 26px ${FONT_M}`; g.fillStyle = '#7fa6a8'; g.fillText('próxima rodada: sexta, 17h30', W / 2, 500);
    return mkTex(c);
  }
  function frameTex(stage) {
    const W = 840, H = 600, c = cnv(W, H), g = c.getContext('2d');
    g.fillStyle = '#e9e9e5'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#b9bab5'; g.lineWidth = 2; g.strokeRect(40, 40, W - 80, H - 200);
    g.beginPath(); g.moveTo(40, 40); g.lineTo(W - 40, H - 160); g.moveTo(W - 40, 40); g.lineTo(40, H - 160); g.stroke();
    g.fillStyle = '#e9e9e5'; g.fillRect(W / 2 - 230, (H - 120) / 2 - 34, 460, 68);
    g.font = `600 22px ${FONT_M}`; g.fillStyle = '#6b7376'; g.textAlign = 'center';
    g.fillText('FOTO REAL DE OBRA', W / 2, (H - 120) / 2 - 4); g.fillText('A FORNECER', W / 2, (H - 120) / 2 + 24);
    g.textAlign = 'left'; g.font = `800 34px ${FONT_D}`; g.fillStyle = '#1d2124'; g.fillText(stage, 40, H - 92);
    g.fillStyle = '#1f5e63'; g.fillRect(40, H - 74, 90, 5);
    g.font = `500 18px ${FONT_M}`; g.fillStyle = '#6b7376'; g.fillText('galeria de obras do Grupo VEX', 40, H - 40);
    return mkTex(c);
  }
  function boardTex() {
    const W = 1200, H = 650, c = cnv(W, H), g = c.getContext('2d'), r = rng(88);
    g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, W, H);
    g.font = `800 30px ${FONT_D}`; g.fillStyle = '#1d2124'; g.fillText('PLANEJAMENTO DE CURTO PRAZO · LOOKAHEAD 6 SEMANAS', 30, 50);
    g.strokeStyle = '#9aa3a5'; g.lineWidth = 2;
    for (let i = 0; i <= 6; i++) { const x = 230 + i * 155; g.beginPath(); g.moveTo(x, 80); g.lineTo(x, H - 30); g.stroke(); if (i < 6) { g.font = `600 18px ${FONT_M}`; g.fillStyle = '#4b5355'; g.fillText(`SEM ${i + 1}`, x + 46, 104); } }
    for (let j = 0; j <= 5; j++) { const y = 120 + j * 95; g.beginPath(); g.moveTo(20, y); g.lineTo(W - 20, y); g.stroke(); if (j < 5) { g.font = `700 19px ${FONT_D}`; g.fillStyle = '#1d2124'; g.fillText(`FRENTE ${j + 1}`, 30, y + 54); } }
    const cols = ['#f2c14e', '#7fc8c4', '#f08a5d', '#a7d38a', '#f2c14e'];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) if (r() > 0.3) {
      const n = 1 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; const x = 240 + i * 155 + k * 70 + r() * 10, y = 132 + j * 95 + r() * 18; g.fillRect(x, y, 62, 56); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 8, y + 16, 40, 3); g.fillRect(x + 8, y + 28, 30, 3); }
    }
    return mkTex(c);
  }
  function planTex() {
    return new Promise((res) => {
      const svg = window.VEXPlan.svg(M, { layers: { notes: false, axes: true } });
      const im = new Image();
      im.onload = () => {
        const W = 1600, H = 800, c = cnv(W, H), g = c.getContext('2d');
        g.fillStyle = '#f4f4f1'; g.fillRect(0, 0, W, H);
        g.drawImage(im, 40, 20, W - 80, (W - 80) * 19 / 26.4);
        res(mkTex(c));
      };
      im.onerror = () => { const c = cnv(16, 16); res(mkTex(c)); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  function ecoBandTex() {
    const W = 2400, H = 412, c = cnv(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.font = `800 64px ${FONT_D}`; g.fillStyle = '#1d2124'; g.textAlign = 'center';
    g.fillText('UM ECOSSISTEMA, UM PADRÃO.', W / 2, 90);
    g.fillStyle = '#1d2124'; g.fillRect(W * 0.07, 290, W * 0.86, 6);
    const us = [0.129, 0.376, 0.624, 0.871];
    M.eco.labels.forEach((t, i) => {
      const x = us[i] * W;
      g.fillStyle = '#1f5e63'; g.beginPath(); g.arc(x, 293, 16, 0, 7); g.fill();
      g.fillStyle = '#1d2124'; g.fillRect(x - 2, 293, 4, 120);
      g.font = `700 40px ${FONT_D}`; g.fillStyle = '#1d2124'; g.fillText(t, x, 250);
    });
    g.font = `500 30px ${FONT_M}`; g.fillStyle = '#c8561a'; g.fillText('→', (us[0] + us[1]) / 2 * W, 280); g.fillText('→', (us[1] + us[2]) / 2 * W, 280); g.fillText('→', (us[2] + us[3]) / 2 * W, 280);
    const t = mkTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function signTex(text) {
    const W = 512, H = 180, c = cnv(W, H), g = c.getContext('2d');
    g.fillStyle = '#f6f6f3'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1f5e63'; g.fillRect(0, 0, 14, H);
    const [n, ...rest] = text.split(' ');
    g.font = `600 44px ${FONT_M}`; g.fillStyle = '#1f5e63'; g.fillText(n, 40, 112);
    g.font = `800 48px ${FONT_D}`; g.fillStyle = '#1d2124'; g.fillText(rest.join(' '), 130, 112);
    return mkTex(c);
  }
  function supergraficoTex(larg = 4.05) {
    const W = 2048, H = Math.round(2048 * M.H / larg), c = cnv(W, H), g = c.getContext('2d');
    g.fillStyle = '#2b2f31'; g.fillRect(0, 0, W, H);
    const s = W / larg; // px por metro
    const XA = 0.5, XB = larg / 2, XC = larg - 0.5;
    g.strokeStyle = 'rgba(217,96,31,0.9)'; g.lineWidth = 6; g.setLineDash([60, 18, 8, 18]);
    [XA, XB, XC].forEach(x => { g.beginPath(); g.moveTo(x * s, 0); g.lineTo(x * s, H); g.stroke(); });
    [0.8, 2.3].forEach(y => { g.beginPath(); g.moveTo(0, y * s); g.lineTo(W, y * s); g.stroke(); });
    g.setLineDash([]);
    g.font = `700 70px ${FONT_M}`; g.textAlign = 'center';
    [['A', XA], ['B', XB], ['C', XC]].forEach(([t, x]) => { g.fillStyle = '#2b2f31'; g.strokeStyle = '#d9601f'; g.lineWidth = 6; g.beginPath(); g.arc(x * s, 0.32 * s, 70, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#d9601f'; g.fillText(t, x * s, 0.32 * s + 24); });
    // linha de cota
    g.strokeStyle = '#e8e2da'; g.lineWidth = 4; g.beginPath(); g.moveTo(XA * s, 2.75 * s); g.lineTo(XC * s, 2.75 * s); g.stroke();
    [XA, XB, XC].forEach(x => { g.beginPath(); g.moveTo(x * s - 24, 2.75 * s + 24); g.lineTo(x * s + 24, 2.75 * s - 24); g.stroke(); g.beginPath(); g.moveTo(x * s, 2.75 * s - 50); g.lineTo(x * s, 2.75 * s + 30); g.stroke(); });
    g.font = `600 56px ${FONT_M}`; g.fillStyle = '#e8e2da'; const cota = (XB - XA).toFixed(2).replace('.', ','); g.fillText(cota, (XA + XB) / 2 * s, 2.75 * s - 26); g.fillText(cota, (XB + XC) / 2 * s, 2.75 * s - 26);
    g.textAlign = 'left'; g.font = `800 96px ${FONT_D}`; g.fillStyle = '#e8e2da'; g.fillText('PAUSA', 0.75 * s, 1.75 * s);
    g.font = `500 44px ${FONT_M}`; g.fillStyle = '#d9601f'; g.fillText('também faz parte do método', 0.78 * s, 1.75 * s + 64);
    return mkTex(c);
  }

  /* ---------------------------------------------------------------- materiais */
  let MAT;
  function std(o) { return new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.38 }, o)); }
  function buildMaterials() {
    MAT = {
      concreteFloor: std({ color: 0xc2beb7, map: TX.concreteFloor, roughness: 0.42, metalness: 0.0 }),
      oakFloor: std({ color: 0xffffff, map: TX.oakFloor, roughness: 0.55 }),
      carpet: std({ color: 0xffffff, map: TX.carpet, roughness: 1 }),
      porcelain: std({ color: 0xd0cfcb, map: TX.porcelain, roughness: 0.35 }),
      wall: std({ color: 0xecebe6, roughness: 0.92 }),
      wallExt: std({ color: 0xc9c6c0, map: TX.concreteWall, roughness: 0.9 }),
      slab: std({ color: 0x34383a, roughness: 0.95 }),
      forro: std({ color: 0xf1f1ee, roughness: 1 }),
      steel: std({ color: 0x1c1e20, roughness: 0.42, metalness: 0.55 }),
      steelSoft: std({ color: 0x2a2d2f, roughness: 0.6, metalness: 0.3 }),
      alu: std({ color: 0xa9aeb0, roughness: 0.35, metalness: 0.8 }),
      galv: std({ color: 0x9da3a6, roughness: 0.45, metalness: 0.75 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xd8e6e5, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 }),
      glassFacade: new THREE.MeshStandardMaterial({ color: 0xcfe0e0, transparent: true, opacity: 0.12, roughness: 0.03, metalness: 0.15, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.0 }),
      frost: new THREE.MeshStandardMaterial({ color: 0xf4f6f6, transparent: true, opacity: 0.62, roughness: 0.9, depthWrite: false, side: THREE.DoubleSide }),
      shade: new THREE.MeshStandardMaterial({ color: 0x6d7375, map: TX.screenFabric, transparent: true, opacity: 0.62, roughness: 1, side: THREE.DoubleSide, depthWrite: false }),
      oak: std({ color: 0xe2d2c0, map: TX.oakPanel, roughness: 0.6 }),
      oakDark: std({ color: 0x9a7a62, map: TX.oakPanel, roughness: 0.6 }),
      lacquer: std({ color: 0xf2f2ef, roughness: 0.45 }),
      lacquerGraph: std({ color: 0x3b4043, roughness: 0.5 }),
      feltPetrol: std({ color: 0x1b5156, map: TX.felt, roughness: 1 }),
      feltGraph: std({ color: 0x3a3f42, roughness: 1 }),
      concreteObj: std({ color: 0xbebab3, map: TX.concreteWall, roughness: 0.8 }),
      quartz: std({ color: 0x3e4244, roughness: 0.3 }),
      fabricPetrol: std({ color: 0x1f4649, roughness: 0.95 }),
      fabricGrey: std({ color: 0x6a7274, roughness: 0.95 }),
      fabricGraph: std({ color: 0x3c4144, roughness: 0.95 }),
      leather: std({ color: 0x55301a, roughness: 0.5 }),
      orange: std({ color: 0xc8561a, roughness: 0.7 }),
      mesh: std({ color: 0x232628, roughness: 0.8 }),
      white: std({ color: 0xf6f6f4, roughness: 0.25 }),
      porcelainWhite: std({ color: 0xfbfbfa, roughness: 0.12 }),
      chrome: std({ color: 0xdadfe1, roughness: 0.08, metalness: 1.0 }),
      mirror: std({ color: 0xe6eef0, roughness: 0.02, metalness: 1.0, envMapIntensity: 1.2 }),
      leaf: std({ color: 0x2c5527, roughness: 0.6, side: THREE.DoubleSide }),
      leafDark: std({ color: 0x1c3a1d, roughness: 0.6, side: THREE.DoubleSide }),
      feltPlain: std({ color: 0x1b4e53, roughness: 1 }),
      column: std({ color: 0xb4b0a9, roughness: 0.85 }),
      skirting: std({ color: 0x2a2d2f, roughness: 0.6 }),
      pot: std({ color: 0x2e3133, roughness: 0.75 }),
      soil: std({ color: 0x3a2e24, roughness: 1 }),
      screenOff: std({ color: 0x0b0d0e, roughness: 0.18, metalness: 0.2 }),
      rugWool: std({ color: 0x9a9184, roughness: 1 }),
      rugGraph: std({ color: 0x45494b, roughness: 1 }),
      field: std({ color: 0x174a2a, roughness: 0.9 }),
      lightLine: new THREE.MeshBasicMaterial({ color: 0xfff3e0, toneMapped: false }),
      lightWarm: new THREE.MeshBasicMaterial({ color: 0xffe2b8, toneMapped: false }),
      plateWhite: std({ color: 0xffffff, roughness: 0.35 }),
      lightbox: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      led: new THREE.MeshBasicMaterial({ color: 0x3fd08a, toneMapped: false }),
    };
  }
  function basicTexMat(t, opts = {}) { return new THREE.MeshBasicMaterial(Object.assign({ map: t, toneMapped: false }, opts)); }

  /* ---------------------------------------------------------------- primitivas */
  let scene, groups;
  function shadowy(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; return m; }
  function box(x0, y0, x1, y1, z0, z1, mat, parent) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0), Math.abs(y1 - y0));
    const m = shadowy(new THREE.Mesh(g, mat));
    m.position.set((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2);
    (parent || groups.main).add(m); return m;
  }
  function cyl(x, y, z0, z1, r, mat, parent, seg = 24, rTop) {
    const m = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(rTop === undefined ? r : rTop, r, z1 - z0, seg), mat));
    m.position.set(x, (z0 + z1) / 2, y); (parent || groups.main).add(m); return m;
  }
  function planeUV(w, h, tileW, tileH) {
    const g = new THREE.PlaneGeometry(w, h);
    if (tileW) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tileW, uv.getY(i) * h / tileH); }
    return g;
  }
  function floorPlane(x0, y0, x1, y1, z, mat, tile, parent) {
    const m = new THREE.Mesh(planeUV(x1 - x0, y1 - y0, tile[0], tile[1]), mat);
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, z, (y0 + y1) / 2); m.receiveShadow = true;
    (parent || groups.main).add(m); return m;
  }
  function ceilPlane(x0, y0, x1, y1, z, mat, parent) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
    m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, z, (y0 + y1) / 2); m.receiveShadow = true; m.castShadow = true;
    (parent || groups.ceiling).add(m); return m;
  }
  const FACE = { S: [0, 0, 1, 0], N: [0, 0, -1, Math.PI], L: [1, 0, 0, Math.PI / 2], O: [-1, 0, 0, -Math.PI / 2] };
  // plano (ou caixa) aplicado numa face de parede
  function wallPlane(it, mat, opts = {}) {
    const [nx, , nz, rot] = FACE[it.face];
    const w = it.a1 - it.a0, h = it.z1 - it.z0, mid = (it.a0 + it.a1) / 2, zc = (it.z0 + it.z1) / 2;
    const depth = opts.depth || 0;
    let m;
    if (depth) { m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat)); }
    else { m = new THREE.Mesh(planeUV(w, h, opts.tile && opts.tile[0], opts.tile && opts.tile[1]), mat); m.receiveShadow = true; }
    m.rotation.y = rot;
    const off = (opts.off || 0) + depth / 2;
    if (it.face === 'S' || it.face === 'N') m.position.set(mid, zc, it.p + nz * off);
    else m.position.set(it.p + nx * off, zc, mid);
    (opts.parent || groups.main).add(m); return m;
  }

  /* ---------------------------------------------------------------- envoltória, paredes, portas */
  function buildShell() {
    const H = M.H;
    // laje de piso (maquete) e hall do edifício
    const PW = M.plate.w;
    box(-0.6, -0.6, PW + 0.6, 14.2, -0.35, -0.01, MAT.concreteObj);
    floorPlane(-0.2, 13.2, PW + 0.1, 14.2, 0.0, std({ color: 0x8e8b86, roughness: 0.8 }), [1, 1]);
    // pisos por ambiente
    const fm = { concrete: [MAT.concreteFloor, [2, 2]], oak: [MAT.oakFloor, [1.8, 1.2]], carpet: [MAT.carpet, [0.5, 0.5]], porcelain: [MAT.porcelain, [0.6, 1.2]] };
    M.rooms.forEach(r => { const [mat, tile] = fm[r.floor]; floorPlane(r.x0, r.y0, r.x1, r.y1, 0.002, mat, tile); });
    // régua VEX no piso da galeria (linha de cota em aço preto com marcas a cada metro)
    box(5.8, 8.14, PW - 0.1, 8.16, 0.0, 0.006, MAT.steel);
    for (let x = 6; x <= PW - 0.1; x += 1) { const l = x % 5 === 0 ? 0.16 : 0.08; box(x - 0.008, 8.15 - l, x + 0.008, 8.15 + l, 0.0, 0.006, MAT.steel); }
    // tetos
    M.rooms.forEach(r => {
      if (r.ceil === 'forro') ceilPlane(r.x0, r.y0, r.x1, r.y1, M.FORRO, MAT.forro);
      ceilPlane(r.x0 - 0.1, r.y0 - 0.1, r.x1 + 0.1, r.y1 + 0.1, H, MAT.slab);
    });
    // pilares
    M.columns.forEach(c => box(c.x - c.s / 2, c.y - c.s / 2, c.x + c.s / 2, c.y + c.s / 2, 0, H, MAT.column));
    // vedações
    M.walls.forEach(buildWall);
  }
  function wallBox(w, s0, s1, z0, z1, mat, t) {
    t = t || w.t;
    if (w.axis === 'h') return box(s0, w.c - t / 2, s1, w.c + t / 2, z0, z1, mat);
    return box(w.c - t / 2, s0, w.c + t / 2, s1, z0, z1, mat);
  }
  function buildWall(w) {
    const H = M.H, segs = window.VEXPlan.wallSegments(w);
    if (w.type === 'facade') return buildFacade(w);
    const glass = w.type === 'glass' || w.type === 'fluted';
    const mat = w.type === 'ext' ? MAT.wall : MAT.wall;
    segs.forEach(([s0, s1]) => {
      if (glass && w.base) { wallBox(w, s0, s1, 0, w.base, mat); wallBox(w, s0, s1, 0, 0.06, MAT.skirting, w.t + 0.012); glassRun(w, s0, s1, w.base, H); }
      else if (glass) glassRun(w, s0, s1, 0, H);
      else { wallBox(w, s0, s1, 0, H, mat); wallBox(w, s0, s1, 0, 0.06, MAT.skirting, w.t + 0.012); }
    });
    w.open.forEach(o => {
      const head = o.kind === 'open' ? 2.45 : M.DOOR_H;
      if (glass) glassRun(w, o.a, o.b, head, H, true); else wallBox(w, o.a, o.b, head, H, mat);
      buildDoor(w, o, head);
    });
  }
  function glassRun(w, s0, s1, z0, z1, transom) {
    const g = wallBox(w, s0, s1, z0 + 0.04, z1 - 0.04, MAT.glass, 0.012); g.castShadow = false; g.renderOrder = 2;
    wallBox(w, s0, s1, z1 - 0.05, z1, MAT.steel, 0.05);
    wallBox(w, s0, s1, z0, z0 + 0.05, MAT.steel, 0.05);
    const n = Math.max(1, Math.round((s1 - s0) / 1.2));
    for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; wallBox(w, s - 0.022, s + 0.022, z0, z1, MAT.steel, 0.05); }
    if (!transom && z1 - z0 > 2.5) wallBox(w, s0, s1, 2.1, 2.14, MAT.steel, 0.05);
    // película jateada de privacidade (0,95 a 1,85 m) nas salas reservadas
    if (w.frost && !transom) { const f = wallBox(w, s0, s1, Math.max(z0 + 0.05, 0.95), 1.85, MAT.frost, 0.016); f.castShadow = false; f.renderOrder = 3; }
  }
  function buildFacade(w) {
    const H = M.H;
    const s0 = Math.max(w.a, 0), s1 = Math.min(w.b, w.axis === 'h' ? M.plate.w : 13);
    const g = wallBox(w, s0, s1, 0.0, H, MAT.glassFacade, 0.014); g.castShadow = false; g.renderOrder = 2;
    wallBox(w, s0, s1, 0, 0.08, MAT.steel, 0.12); wallBox(w, s0, s1, H - 0.1, H, MAT.steel, 0.12);
    wallBox(w, s0, s1, 1.05, 1.1, MAT.steel, 0.08);
    for (let k = Math.ceil(s0 / 1.25) * 1.25; k <= s1 + 1e-6; k += 1.25) wallBox(w, k - 0.03, k + 0.03, 0, H, MAT.steel, 0.14);
    // rolô screen: parcialmente baixado nos vãos (controle solar)
    for (let k = Math.ceil(s0 / 1.25) * 1.25; k < s1 - 0.1; k += 1.25) {
      const drop = [2.55, 2.2, 2.75, 1.9][Math.round(k / 1.25) % 4];
      const sh = wallBox(w, k + 0.05, k + 1.2, drop, H - 0.12, MAT.shade, 0.01); sh.castShadow = false;
      const off = w.axis === 'h' ? [0, 0.12] : [-0.12, 0];
      sh.position.x += off[0]; sh.position.z += off[1];
      const bar = wallBox(w, k + 0.05, k + 1.2, drop - 0.02, drop, MAT.steel, 0.02); bar.position.x += off[0]; bar.position.z += off[1];
    }
  }
  function buildDoor(w, o, head) {
    if (o.kind === 'open') return;
    const t = 0.045, s0 = o.a, s1 = o.b;
    const at = (a, b, z0, z1, mat, th, offset = 0) => {
      const m = wallBox(w, a, b, z0, z1, mat, th);
      if (offset) { if (w.axis === 'h') m.position.z += offset; else m.position.x += offset; }
      return m;
    };
    // batentes metálicos
    at(s0 - 0.03, s0, 0, head, MAT.steel, w.t + 0.01); at(s1, s1 + 0.03, 0, head, MAT.steel, w.t + 0.01); at(s0 - 0.03, s1 + 0.03, head - 0.03, head, MAT.steel, w.t + 0.01);
    if (o.kind === 'glassdoor' || o.kind === 'double') {
      const g = at(s0 + 0.01, s1 - 0.01, 0.02, head - 0.03, MAT.glass, 0.012); g.castShadow = false; g.renderOrder = 2;
      at(s0 + 0.01, s1 - 0.01, 0.02, 0.1, MAT.steel, 0.04); at(s0 + 0.01, s1 - 0.01, head - 0.1, head - 0.03, MAT.steel, 0.04);
      at(s0 + 0.01, s0 + 0.05, 0.02, head - 0.03, MAT.steel, 0.04); at(s1 - 0.05, s1 - 0.01, 0.02, head - 0.03, MAT.steel, 0.04);
      if (o.kind === 'double') { const mid = (s0 + s1) / 2; at(mid - 0.025, mid + 0.025, 0.02, head - 0.03, MAT.steel, 0.04); }
      const hx = o.kind === 'double' ? (s0 + s1) / 2 : (o.hinge === 'end' ? s0 + 0.12 : s1 - 0.12);
      at(hx - 0.015, hx + 0.015, 0.7, 1.5, MAT.alu, 0.09);
      return;
    }
    // porta oculta: folha laqueada; do lado da recepção ela fica atrás do mesmo ripado da parede
    const mat = o.kind === 'slide' || o.kind === 'hidden' ? MAT.lacquer : MAT.oakDark;
    const off = o.kind === 'slide' ? (w.t / 2 + 0.03) * (o.into || 1) : 0;
    const leaf = at(s0 + 0.005, s1 - 0.005, 0.01, head - 0.035, mat, t, off);
    const hx = o.kind === 'slide' ? s0 + 0.1 : (o.hinge === 'end' ? s0 + 0.1 : s1 - 0.1);
    const hd = at(hx - 0.012, hx + 0.012, o.kind === 'slide' ? 0.75 : 0.95, o.kind === 'slide' ? 1.35 : 1.05, MAT.steel, t + 0.08, off);
    if (o.kind === 'slide') { at(s0 - 0.1, s1 + 0.6, head - 0.02, head + 0.04, MAT.steel, 0.04, off); }
    return leaf || hd;
  }

  let PLANT_LEAF = null;
  /* ---------------------------------------------------------------- mobiliário */
  function group(x, y, r) { const g = new THREE.Group(); g.position.set(x, 0, y); g.rotation.y = -(r || 0) * DEG; groups.main.add(g); return g; }
  // caixa em coordenadas locais do grupo (frente da peça = -z local)
  function lbox(g, x0, z0, x1, z1, y0, y1, mat) { return box(x0, z0, x1, z1, y0, y1, mat, g); }
  // caixa com cantos arredondados (estofados); cai para caixa comum se o módulo não carregar
  function rbox(x0, y0, x1, y1, z0, z1, mat, parent, rad = 0.04) {
    const w = Math.abs(x1 - x0), h = Math.abs(z1 - z0), d = Math.abs(y1 - y0);
    const RB = THREE.RoundedBoxGeometry;
    const geo = RB ? new RB(w, h, d, 3, Math.min(rad, w / 2.1, h / 2.1, d / 2.1)) : new THREE.BoxGeometry(w, h, d);
    const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2);
    (parent || groups.main).add(m); return m;
  }
  function roomAt(x, y) { return M.rooms.find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || {}; }

  function chair3D(c) {
    const g = group(c.x, c.y, c.r);
    const kind = c.kind || 'task';
    if (kind === 'guest' || kind === 'cafe') {
      const seat = kind === 'cafe' ? MAT.oak : MAT.fabricPetrol;
      rbox(-0.23, -0.22, 0.23, 0.22, 0.43, 0.49, seat, g, 0.02);
      rbox(-0.22, 0.17, 0.22, 0.22, 0.48, 0.85, kind === 'cafe' ? MAT.oak : MAT.fabricPetrol, g, 0.02);
      [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].forEach(([x, z]) => lbox(g, x - 0.012, z - 0.012, x + 0.012, z + 0.012, 0, 0.43, MAT.steel));
      return;
    }
    const exec = kind === 'exec', meet = kind === 'meeting';
    const seatMat = exec ? MAT.leather.clone() : (meet ? MAT.fabricGraph : MAT.mesh);
    if (exec) seatMat.color.set(0x1e1f20);
    rbox(-0.25, -0.24, 0.25, 0.24, 0.44, 0.53, seatMat, g, 0.035);
    rbox(-0.23, 0.19, 0.23, 0.26, 0.56, exec ? 1.22 : (meet ? 0.98 : 1.05), seatMat, g, 0.03);
    if (!meet) { lbox(g, -0.27, -0.12, -0.24, 0.16, 0.52, 0.68, MAT.steel); lbox(g, 0.24, -0.12, 0.27, 0.16, 0.52, 0.68, MAT.steel); }
    cyl(0, 0, 0.08, 0.44, 0.022, MAT.alu, g);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5, leg = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.04), MAT.steel));
      leg.position.set(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15); leg.rotation.y = -a; g.add(leg);
    }
  }
  function armchair3D(o) {
    const room = roomAt(o.x, o.y).id;
    const mat = room === 'ceo' ? MAT.leather : (room === 'jogos' ? MAT.orange : MAT.fabricPetrol);
    const g = group(o.x, o.y, o.r);
    rbox(-0.37, -0.36, 0.37, 0.36, 0.16, 0.44, mat, g, 0.06);
    rbox(-0.38, 0.18, 0.38, 0.38, 0.4, 0.82, mat, g, 0.07);
    rbox(-0.41, -0.3, -0.29, 0.38, 0.16, 0.6, mat, g, 0.05); rbox(0.29, -0.3, 0.41, 0.38, 0.16, 0.6, mat, g, 0.05);
    [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.32], [0.32, 0.32]].forEach(([x, z]) => lbox(g, x - 0.015, z - 0.015, x + 0.015, z + 0.015, 0, 0.16, MAT.steel));
  }
  function plant3D(o, base) {
    const h = o.h || 1.4, r = (o.s || 0.5) / 2, rr = rng(Math.floor(o.x * 100 + o.y * 7));
    const z0 = base || 0;
    if (!base) { cyl(o.x, o.y, 0, 0.42, r * 0.85, MAT.pot, null, 24, r * 0.95); cyl(o.x, o.y, 0.42, 0.44, r * 0.8, MAT.soil); }
    const n = Math.round(14 + h * 16), leafGeo = PLANT_LEAF || (PLANT_LEAF = new THREE.SphereGeometry(1, 10, 6));
    for (let i = 0; i < n; i++) {
      const t = Math.pow(rr(), 0.8), a = rr() * Math.PI * 2;
      const len = (0.16 + rr() * 0.16) * Math.max(0.7, h / 1.4), tilt = 0.35 + t * 0.9;
      const hz = z0 + 0.45 + t * (h - 0.6);
      const m = shadowy(new THREE.Mesh(leafGeo, rr() > 0.45 ? MAT.leaf : MAT.leafDark));
      m.scale.set(len, 0.012, len * 0.32);
      const rad = r * 0.15 + Math.sin(tilt) * len * 0.9;
      m.position.set(o.x + Math.cos(a) * rad, hz + Math.cos(tilt) * len * 0.3, o.y + Math.sin(a) * rad);
      m.rotation.set(0, -a, -(Math.PI / 2 - tilt) * 0.6); groups.main.add(m);
    }
    if (h > 1.0) for (let k = 0; k < 3; k++) cyl(o.x + (k - 1) * 0.04, o.y + (k % 2) * 0.04, z0 + 0.42, z0 + h * (0.55 + k * 0.12), 0.012, MAT.soil);
  }
  function monitor(x, y, faceDeg, width, z, texSeed, parent) {
    const g = new THREE.Group(); g.position.set(x, 0, y); g.rotation.y = -faceDeg * DEG; (parent || groups.main).add(g);
    const h = width * 0.58;
    lbox(g, -width / 2, -0.012, width / 2, 0.012, z + 0.1, z + 0.1 + h, MAT.screenOff);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.02, h - 0.02), basicTexMat(SCREENS['m' + (texSeed % 5)], { color: 0xbfc6c6 }));
    // faceDeg = direção para onde a tela olha; a tela fica no lado -z local
    scr.position.set(0, z + 0.1 + h / 2, -0.0135); scr.rotation.y = Math.PI; g.add(scr);
    lbox(g, -0.012, 0.012, 0.012, 0.04, z, z + 0.15, MAT.alu);
    lbox(g, -0.1, -0.06, 0.1, 0.08, z, z + 0.008, MAT.alu);
    return g;
  }
  function desk3D(o) {
    const top = o.mat === 'oak' ? MAT.oak : o.mat === 'oakDark' ? MAT.oakDark : MAT.lacquer;
    const z = 0.74;
    box(o.x, o.y, o.x + o.w, o.y + o.d, z - 0.03, z, top);
    if (o.exec) {
      box(o.x + 0.02, o.y + 0.02, o.x + 0.06, o.y + o.d - 0.02, 0, z - 0.03, MAT.steel);
      box(o.x + o.w - 0.06, o.y + 0.02, o.x + o.w - 0.02, o.y + o.d - 0.02, 0, z - 0.03, MAT.steel);
      box(o.x + o.w * 0.62, o.y + 0.3, o.x + o.w - 0.08, o.y + o.d - 0.3, 0.32, z - 0.03, MAT.oak);
    } else {
      [[o.x + 0.03, o.y + 0.03], [o.x + o.w - 0.07, o.y + 0.03], [o.x + 0.03, o.y + o.d - 0.07], [o.x + o.w - 0.07, o.y + o.d - 0.07]].forEach(([x, y]) => box(x, y, x + 0.04, y + 0.04, 0, z - 0.03, MAT.steel));
    }
    // monitores na borda oposta ao usuário, voltados para ele
    const n = o.mon || 0, r = o.r || 0;
    for (let i = 0; i < n; i++) {
      const span = n === 1 ? 0 : 0.58, off = n === 1 ? 0 : -span / 2 + i * span;
      let mx, my;
      if (r === 0) { mx = o.x + o.w / 2 + off; my = o.y + 0.16; }
      else if (r === 180) { mx = o.x + o.w / 2 - off; my = o.y + o.d - 0.16; }
      else if (r === 90) { mx = o.x + o.w - 0.16; my = o.y + o.d / 2 + off; }
      else { mx = o.x + 0.16; my = o.y + o.d / 2 - off; }
      monitor(mx, my, r + 180, n === 1 && o.exec ? 0.8 : 0.56, z, Math.floor(o.x * 3 + o.y + i));
    }
  }
  function bench3D(o) {
    const P = window.VEXPlan.benchParts(o), z = 0.74;
    box(o.x, o.y, o.x + o.w, o.y + o.d, z - 0.03, z, MAT.lacquer);
    // estrutura em aço preto (pórticos) e calha de cabos
    for (let k = 0; k <= o.n; k++) { const y = o.y + Math.min(k * o.d / o.n, o.d - 0.05); box(o.x + 0.05, y, o.x + o.w - 0.05, y + 0.05, 0, z - 0.03, MAT.steel); }
    box(o.x + o.w / 2 - 0.12, o.y + 0.05, o.x + o.w / 2 + 0.12, o.y + o.d - 0.05, z - 0.16, z - 0.04, MAT.steel);
    // divisória em feltro azul-petróleo
    box(o.x + o.w / 2 - 0.015, o.y + 0.02, o.x + o.w / 2 + 0.015, o.y + o.d - 0.02, z, z + 0.42, MAT.feltPetrol);
    P.desks.forEach((d, i) => {
      const cy = d.y + d.d / 2, face = d.side === 'O' ? 270 : 90;
      const mx = d.side === 'O' ? d.x + d.w - 0.17 : d.x + 0.17;
      monitor(mx, cy - 0.29, face, 0.54, z, i + 1); monitor(mx, cy + 0.29, face, 0.54, z, i + 3);
      // teclado
      const kx = d.side === 'O' ? d.x + 0.2 : d.x + d.w - 0.36;
      box(kx, cy - 0.22, kx + 0.16, cy + 0.22, z, z + 0.015, MAT.steelSoft);
    });
    P.chairs.forEach(c => chair3D(c));
    // gaveteiros
    P.desks.forEach(d => { const x = d.side === 'O' ? d.x + 0.06 : d.x + d.w - 0.46; if (Math.round((d.y - o.y) / (o.d / o.n)) % 2 === 0) box(x, d.y + d.d - 0.5, x + 0.4, d.y + d.d - 0.08, 0.02, 0.6, MAT.lacquerGraph); });
  }

  function buildFurniture() {
    M.furniture.forEach(o => {
      switch (o.t) {
        case 'bench': bench3D(o); break;
        case 'desk': desk3D(o); break;
        case 'chair': chair3D(o); break;
        case 'armchair': armchair3D(o); break;
        case 'plant': plant3D(o); break;
        case 'monitor': monitor(o.x + o.w / 2, o.y, o.r === 180 ? 0 : 180, o.w, 0.77, 9); break;
        case 'balcao': {
          const z = 1.05;
          box(o.x + 0.04, o.y + 0.04, o.x + o.w - 0.6, o.y + o.d, 0.06, z, MAT.concreteObj);
          box(o.x + o.w - 0.6, o.y + 0.04, o.x + o.w, o.y + o.d, 0.06, 0.78, MAT.concreteObj);
          box(o.x + 0.08, o.y + 0.08, o.x + o.w - 0.04, o.y + o.d - 0.04, 0, 0.06, MAT.steel);
          box(o.x - 0.02, o.y + 0.25, o.x + o.w - 0.58, o.y + o.d + 0.04, z, z + 0.04, MAT.oak);
          box(o.x + o.w - 0.62, o.y + 0.02, o.x + o.w + 0.02, o.y + o.d + 0.03, 0.78, 0.81, MAT.oak);
          box(o.x, o.y - 0.02, o.x + o.w - 0.6, o.y + 0.25, 0.74, 0.77, MAT.oak); // tampo de trabalho interno
          box(o.x + 0.1, o.y + o.d + 0.001, o.x + o.w - 0.7, o.y + o.d + 0.012, 0.12, 0.14, MAT.lightWarm); // fresta iluminada
          break;
        }
        case 'sidetable': cyl(o.x, o.y, 0, 0.5, o.s / 2, MAT.steel, null, 32); cyl(o.x, o.y, 0.5, 0.52, o.s / 2, MAT.oakDark, null, 32); break;
        case 'roundtable': cyl(o.x, o.y, 0.72, 0.75, o.s / 2, MAT.oak, null, 40); cyl(o.x, o.y, 0.03, 0.72, 0.04, MAT.steel); cyl(o.x, o.y, 0, 0.03, 0.25, MAT.steel, null, 32); break;
        case 'table': {
          box(o.x, o.y, o.x + o.w, o.y + o.d, 0.72, 0.76, MAT.oak);
          [o.x + 0.45, o.x + o.w - 0.5].forEach(x => { box(x, o.y + 0.15, x + 0.05, o.y + o.d - 0.15, 0, 0.72, MAT.steel); box(x - 0.1, o.y + 0.12, x + 0.15, o.y + o.d - 0.12, 0, 0.03, MAT.steel); });
          box(o.x + o.w / 2 - 0.2, o.y + o.d / 2 - 0.08, o.x + o.w / 2 + 0.2, o.y + o.d / 2 + 0.08, 0.76, 0.775, MAT.steel);
          break;
        }
        case 'coffeetable': box(o.x, o.y, o.x + o.w, o.y + o.d, 0.36, 0.4, MAT.oakDark); box(o.x + 0.05, o.y + 0.05, o.x + o.w - 0.05, o.y + o.d - 0.05, 0, 0.36, MAT.steel).scale.set(1, 1, 1); break;
        case 'hightable': box(o.x, o.y, o.x + o.w, o.y + o.d, 1.02, 1.06, MAT.oak); box(o.x + 0.2, o.y + 0.2, o.x + o.w - 0.2, o.y + 0.26, 0, 1.02, MAT.steel); box(o.x + 0.2, o.y + o.d - 0.26, o.x + o.w - 0.2, o.y + o.d - 0.2, 0, 1.02, MAT.steel); break;
        case 'stool': cyl(o.x, o.y, 0.72, 0.76, 0.18, MAT.oak); cyl(o.x, o.y, 0.02, 0.72, 0.02, MAT.steel); cyl(o.x, o.y, 0, 0.02, 0.2, MAT.steel); break;
        case 'barcounter': box(o.x, o.y, o.x + o.w, o.y + o.d, 1.02, 1.06, MAT.oak); box(o.x + o.w - 0.06, o.y + 0.1, o.x + o.w - 0.02, o.y + o.d - 0.1, 0, 1.02, MAT.steel); break;
        case 'rug': box(o.x, o.y, o.x + o.w, o.y + o.d, 0.002, 0.012, roomAt(o.x + 0.1, o.y + 0.1).id === 'jogos' ? MAT.rugGraph : MAT.rugWool).castShadow = false; break;
        case 'sofa': {
          const g = MAT.fabricGraph;
          rbox(o.x, o.y, o.x + o.w, o.y + o.d, 0.15, 0.44, g, null, 0.06);
          rbox(o.x + o.w - 0.22, o.y, o.x + o.w, o.y + o.d, 0.4, 0.84, g, null, 0.07);
          rbox(o.x, o.y, o.x + o.w, o.y + 0.15, 0.4, 0.62, g, null, 0.05); rbox(o.x, o.y + o.d - 0.15, o.x + o.w, o.y + o.d, 0.4, 0.62, g, null, 0.05);
          rbox(o.x + o.w - 0.36, o.y + 0.25, o.x + o.w - 0.2, o.y + 0.68, 0.43, 0.78, MAT.orange, null, 0.06);
          box(o.x + 0.05, o.y + 0.05, o.x + 0.1, o.y + 0.1, 0, 0.15, MAT.steel); box(o.x + 0.05, o.y + o.d - 0.1, o.x + 0.1, o.y + o.d - 0.05, 0, 0.15, MAT.steel);
          break;
        }
        case 'cabinet': case 'lockers': {
          const mat = o.t === 'lockers' ? MAT.lacquer : (o.mat === 'oak' ? MAT.oak : o.mat === 'oakDark' ? MAT.oakDark : MAT.lacquer);
          box(o.x, o.y, o.x + o.w, o.y + o.d, 0.05, o.h, mat); box(o.x + 0.03, o.y + 0.03, o.x + o.w - 0.03, o.y + o.d - 0.03, 0, 0.05, MAT.steel);
          // juntas das portas
          const along = o.w > o.d ? 'x' : 'y', L = Math.max(o.w, o.d), n = Math.max(1, Math.round(L / (o.t === 'lockers' ? 0.4 : 0.5)));
          for (let i = 1; i < n; i++) {
            const s = (along === 'x' ? o.x : o.y) + L * i / n;
            if (along === 'x') box(s - 0.004, o.y - 0.003, s + 0.004, o.y + o.d + 0.003, 0.08, o.h - 0.02, MAT.steel); else box(o.x - 0.003, s - 0.004, o.x + o.w + 0.003, s + 0.004, 0.08, o.h - 0.02, MAT.steel);
          }
          if (o.t === 'lockers') for (let k = 1; k < 4; k++) box(o.x - 0.003, o.y, o.x + o.w + 0.003, o.y + o.d, 0.05 + k * (o.h - 0.05) / 4 - 0.004, 0.05 + k * (o.h - 0.05) / 4 + 0.004, MAT.steel);
          break;
        }
        case 'credenza': box(o.x, o.y, o.x + o.w, o.y + o.d, 0.12, o.h, MAT[o.mat] || MAT.oakDark); box(o.x + 0.05, o.y + 0.05, o.x + o.w - 0.05, o.y + o.d - 0.05, 0, 0.12, MAT.steel); break;
        case 'planter': box(o.x, o.y, o.x + o.w, o.y + o.d, 0, o.h, MAT.concreteObj); for (let y = o.y + 0.3; y < o.y + o.d; y += 0.42) plant3D({ x: o.x + o.w / 2, y, s: 0.36, h: 0.75 }, o.h - 0.4); break;
        case 'booth': {
          box(o.x, o.y, o.x + o.w, o.y + 0.06, 0, 2.2, MAT.feltPetrol); box(o.x, o.y + o.d - 0.06, o.x + o.w, o.y + o.d, 0, 2.2, MAT.feltPetrol);
          box(o.x + o.w - 0.06, o.y, o.x + o.w, o.y + o.d, 0, 2.2, MAT.feltPetrol); box(o.x, o.y, o.x + o.w, o.y + o.d, 2.14, 2.2, MAT.feltPetrol);
          const gl = box(o.x, o.y + 0.06, o.x + 0.012, o.y + o.d - 0.06, 0.02, 2.14, MAT.glass); gl.castShadow = false;
          box(o.x + 0.45, o.y + 0.2, o.x + o.w - 0.1, o.y + 0.62, 0.72, 0.75, MAT.oak);
          cyl(o.x + 0.45, o.y + 0.75, 0, 0.62, 0.2, MAT.fabricGrey);
          box(o.x + 0.3, o.y + 0.5, o.x + 0.6, o.y + 0.52, 2.0, 2.02, MAT.lightLine);
          break;
        }
        case 'panel': {
          const pm = o.mat === 'concretePanel' ? MAT.concreteObj : (o.mat === 'ripado' || o.mat === 'oakPanel') ? MAT.oak : MAT.lacquer;
          box(o.x, o.y, o.x + o.w, o.y + o.d, 0.02, o.h, pm);
          // pés metálicos discretos
          const ax = o.w > o.d;
          [0.15, 0.85].forEach(f => { const cx = ax ? o.x + o.w * f : o.x + o.w / 2, cy = ax ? o.y + o.d / 2 : o.y + o.d * f; box(cx - (ax ? 0.04 : 0.25), cy - (ax ? 0.25 : 0.04), cx + (ax ? 0.04 : 0.25), cy + (ax ? 0.25 : 0.04), 0, 0.03, MAT.steel); });
          break;
        }
        case 'totem': box(o.x, o.y, o.x + o.w, o.y + o.d, 0.04, o.h, MAT.steel); box(o.x - 0.05, o.y - 0.12, o.x + o.w + 0.05, o.y + o.d + 0.12, 0, 0.04, MAT.steel); break;
        case 'whiteboard': box(o.x, o.y, o.x + o.w, o.y + 0.03, 0.9, 1.9, MAT.white); box(o.x + 0.05, o.y - 0.15, o.x + 0.08, o.y + 0.2, 0, 1.9, MAT.alu); box(o.x + o.w - 0.08, o.y - 0.15, o.x + o.w - 0.05, o.y + 0.2, 0, 1.9, MAT.alu); break;
        case 'fridge': box(o.x, o.y, o.x + o.w, o.y + o.d, 0, 1.85, MAT.alu); box(o.x + o.w - 0.08, o.y + o.d + 0.002, o.x + o.w - 0.06, o.y + o.d + 0.03, 0.9, 1.5, MAT.steel); break;
        case 'tower': box(o.x, o.y, o.x + o.w, o.y + o.d, 0, 2.2, MAT.oak); box(o.x + 0.05, o.y + o.d, o.x + o.w - 0.05, o.y + o.d + 0.01, 1.1, 1.45, MAT.screenOff); box(o.x + 0.05, o.y + o.d, o.x + o.w - 0.05, o.y + o.d + 0.01, 0.55, 0.95, MAT.screenOff); break;
        case 'counter': {
          const along = o.along === 'y';
          box(o.x, o.y, o.x + o.w, o.y + o.d, 0.1, 0.86, MAT.lacquer); box(o.x + 0.04, o.y + 0.04, o.x + o.w - 0.04, o.y + o.d - 0.04, 0, 0.1, MAT.steel);
          box(o.x - 0.01, o.y - 0.01, o.x + o.w + 0.01, o.y + o.d + 0.02, 0.86, 0.9, MAT.quartz);
          if (o.sink) { box(o.sink, o.y + 0.1, o.sink + 0.5, o.y + 0.48, 0.895, 0.902, MAT.chrome); cyl(o.sink + 0.25, o.y + 0.08, 0.9, 1.2, 0.015, MAT.chrome); }
          if (o.coffee) { box(o.coffee - 0.18, o.y + 0.05, o.coffee + 0.18, o.y + 0.45, 0.9, 1.3, MAT.steel); }
          if (o.upper) { box(o.x, o.y, o.x + o.w, o.y + 0.36, 1.55, 2.25, MAT.oak); box(o.x + 0.02, o.y + 0.3, o.x + o.w - 0.02, o.y + 0.36, 1.53, 1.55, MAT.lightWarm); }
          if (o.frigobar) box(o.x + 0.02, o.y + 0.5, o.x + o.w - 0.02, o.y + 1.05, 0.1, 0.85, MAT.steelSoft);
          if (!along && !o.upper && !o.frigobar) {}
          break;
        }
        case 'printer': box(o.x, o.y, o.x + o.w, o.y + o.d, 0, 0.65, MAT.lacquerGraph); box(o.x + 0.03, o.y + 0.03, o.x + o.w - 0.03, o.y + o.d - 0.03, 0.65, 1.05, MAT.lacquer); break;
        case 'shelf': {
          const v = o.d > o.w;
          for (let k = 0; k < 5; k++) box(o.x, o.y, o.x + o.w, o.y + o.d, 0.05 + k * (o.h - 0.1) / 4, 0.08 + k * (o.h - 0.1) / 4, o.games ? MAT.oak : MAT.lacquer);
          [[o.x, o.y], [o.x + o.w - 0.03, o.y], [o.x, o.y + o.d - 0.03], [o.x + o.w - 0.03, o.y + o.d - 0.03]].forEach(([x, y]) => box(x, y, x + 0.03, y + 0.03, 0, o.h, MAT.steel));
          if (o.games) {
            const rr = rng(5), cols = [0xc8561a, 0x1f5e63, 0xe0b04a, 0x3b4043, 0xa33b2a, 0x5c7d4e];
            for (let k = 1; k < 4; k++) for (let x = o.x + 0.08; x < o.x + o.w - 0.35; x += 0.32 + rr() * 0.1) {
              const hh = 0.06 + rr() * 0.1;
              box(x, o.y + 0.03, x + 0.28, o.y + o.d - 0.03, 0.08 + k * (o.h - 0.1) / 4, 0.08 + k * (o.h - 0.1) / 4 + hh, std({ color: cols[Math.floor(rr() * cols.length)], roughness: 0.6 }));
            }
          } else { for (let k = 1; k < 4; k++) box(o.x + 0.04, o.y + 0.1, o.x + o.w - 0.04, o.y + o.d - 0.1, 0.08 + k * (o.h - 0.1) / 4, 0.08 + k * (o.h - 0.1) / 4 + 0.25, MAT.lacquer); }
          if (!v && false) {}
          break;
        }
        case 'rack': box(o.x, o.y, o.x + o.w, o.y + o.d, 0, o.h, MAT.steel); for (let k = 0; k < 6; k++) box(o.x + 0.1 + k * 0.05, o.y - 0.003, o.x + 0.12 + k * 0.05, o.y + 0.002, 0.9, 0.92, MAT.led); break;
        case 'basin': {
          const room = roomAt(o.x, o.y);
          box(room.x0 + 0.02, o.y - 0.32, room.x0 + 0.52, o.y + 0.32, 0.82, 0.86, MAT.quartz);
          box(room.x0 + 0.1, o.y - 0.22, room.x0 + 0.42, o.y + 0.22, 0.86, 0.95, MAT.porcelainWhite);
          cyl(room.x0 + 0.08, o.y, 0.86, 1.08, 0.012, MAT.chrome);
          box(room.x0 + 0.002, o.y - 0.35, room.x0 + 0.012, o.y + 0.35, 1.05, 1.95, MAT.mirror);
          box(room.x0 + 0.02, o.y + 0.36, room.x0 + 0.06, o.y + 0.38, 0.75, 0.95, MAT.steel);
          break;
        }
        case 'toilet': {
          const room = roomAt(o.x, o.y), xw = room.x1 - 0.002;
          box(xw - 0.2, o.y - 0.2, xw - 0.02, o.y + 0.2, 0.0, 0.75, MAT.porcelainWhite);
          const bowl = cyl(xw - 0.45, o.y, 0, 0.42, 0.19, MAT.porcelainWhite, null, 32); bowl.scale.set(1.35, 1, 1);
          cyl(xw - 0.47, o.y, 0.42, 0.45, 0.2, MAT.porcelainWhite, null, 32).scale.set(1.35, 1, 1);
          // barras de apoio (NBR 9050)
          box(xw - 0.04, o.y - 0.4, xw - 0.01, o.y + 0.4, 0.88, 0.92, MAT.chrome);
          box(xw - 0.78, o.y + 0.4, xw - 0.06, o.y + 0.44, 0.76, 0.8, MAT.chrome); box(xw - 0.78, o.y - 0.44, xw - 0.06, o.y - 0.4, 0.76, 0.8, MAT.chrome);
          break;
        }
        case 'urinal': { const room = roomAt(o.x, o.y); box(room.x0 + 0.01, o.y - 0.18, room.x0 + 0.33, o.y + 0.18, 0.45, 1.05, MAT.porcelainWhite); break; }
        case 'shower': {
          box(o.x, o.y, o.x + o.w, o.y + o.d, 0.0, 0.015, MAT.porcelain);
          const gl = box(o.x, o.y, o.x + o.w * 0.6, o.y + 0.012, 0.02, 2.0, MAT.glass); gl.castShadow = false;
          cyl(o.x + o.w / 2, o.y + o.d - 0.12, 2.0, 2.02, 0.12, MAT.chrome); box(o.x + o.w / 2 - 0.01, o.y + o.d - 0.12, o.x + o.w / 2 + 0.01, o.y + o.d - 0.02, 2.0, 2.3, MAT.chrome);
          break;
        }
        case 'pebolim': {
          box(o.x, o.y, o.x + o.w, o.y + o.d, 0.62, 0.92, MAT.oak);
          box(o.x + 0.04, o.y + 0.04, o.x + o.w - 0.04, o.y + o.d - 0.04, 0.85, 0.921, MAT.field);
          [[o.x + 0.05, o.y + 0.05], [o.x + o.w - 0.13, o.y + 0.05], [o.x + 0.05, o.y + o.d - 0.13], [o.x + o.w - 0.13, o.y + o.d - 0.13]].forEach(([x, y]) => box(x, y, x + 0.08, y + 0.08, 0, 0.62, MAT.steel));
          for (let k = 1; k <= 8; k++) {
            const y = o.y + o.d * k / 9, rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, o.w + 0.4, 8), MAT.chrome);
            rod.rotation.z = Math.PI / 2; rod.position.set(o.x + o.w / 2 + (k % 2 ? 0.1 : -0.1), 0.88, y); groups.main.add(rod);
            const hx = k % 2 ? o.x + o.w + 0.25 : o.x - 0.25; cyl(hx, y, 0.86, 0.9, 0.02, MAT.steel).rotation.z = Math.PI / 2;
            for (let p = 0; p < (k % 3) + 1; p++) box(o.x + 0.2 + p * 0.15, y - 0.012, o.x + 0.23 + p * 0.15, y + 0.012, 0.86, 0.9, k < 5 ? MAT.orange : MAT.feltPetrol);
          }
          break;
        }
      }
    });
  }

  /* ---------------------------------------------------------------- itens de parede */
  let SCREENS = {};
  async function buildWallItems() {
    const plan = await planTex();
    M.wallItems.forEach(it => {
      if (it.kind === 'finish') {
        const tiles = { porcelainWall: [MAT.porcelain, [0.6, 1.2]], ripado: [MAT.ripadoMat, [0.6, 2.4]], concretePanel: [MAT.concretePanelMat, [1.2, 2.4]], oakPanel: [MAT.oakPanelMat, [0.6, 2.4]], felt: [MAT.feltPetrol, [0.5, 0.5]], supergrafico: [MAT.superMat, null], tile: [MAT.tileMat, [0.6, 0.6]] };
        const [mat, tile] = tiles[it.mat];
        if (it.mat === 'felt') { wallPlane(it, MAT.feltPlain, { depth: 0.025 }); wallPlane(it, MAT.feltPetrol, { tile: [0.6, 0.6], off: 0.026 }); }
        else if (tile) wallPlane(it, mat, { tile, off: 0.02 }); else wallPlane(it, mat, { off: 0.004 });
        if (it.mat === 'ripado') { // sanca de luz no topo e no rodapé do ripado
          wallPlane({ ...it, z0: 0.02, z1: 0.045 }, MAT.lightWarm, { off: 0.05 });
        }
      } else if (it.kind === 'logo') {
        const lb = it.plate === 'lightbox';
        const pad = lb ? 0.04 : 0.02;
        wallPlane(it, lb ? MAT.lightbox : MAT.plateWhite, { depth: lb ? 0.08 : 0.018 });
        if (lb) { // moldura em aço preto
          const fr = 0.03;
          [[it.a0 - fr, it.a0, it.z0 - fr, it.z1 + fr], [it.a1, it.a1 + fr, it.z0 - fr, it.z1 + fr], [it.a0, it.a1, it.z0 - fr, it.z0], [it.a0, it.a1, it.z1, it.z1 + fr]].forEach(([a0, a1, z0, z1]) => wallPlane({ ...it, a0, a1, z0, z1 }, MAT.steel, { depth: 0.1 }));
        }
        // logo oficial: PNG original, proporção 1:1 preservada, sem recolorir (material não iluminado)
        const lt = new THREE.Texture(IMGS[it.logo]); lt.encoding = THREE.sRGBEncoding; lt.anisotropy = 8; lt.needsUpdate = true;
        const mat = new THREE.MeshBasicMaterial({ map: lt, transparent: true, toneMapped: false });
        const size = Math.min(it.a1 - it.a0, it.z1 - it.z0) - pad * 2;
        const mid = (it.a0 + it.a1) / 2, zc = (it.z0 + it.z1) / 2;
        wallPlane({ ...it, a0: mid - size / 2, a1: mid + size / 2, z0: zc - size / 2, z1: zc + size / 2 }, mat, { off: (lb ? 0.08 : 0.018) + 0.002 });
      } else if (it.kind === 'screen') {
        wallPlane(it, MAT.screenOff, { depth: 0.035 });
        const t = it.content === 'totem' ? SCREENS.totem : SCREENS[it.content];
        const inset = 0.012;
        wallPlane({ ...it, a0: it.a0 + inset, a1: it.a1 - inset, z0: it.z0 + inset, z1: it.z1 - inset }, basicTexMat(t, { color: 0xd8dddd }), { off: 0.036 });
      } else if (it.kind === 'frame') {
        wallPlane(it, MAT.steel, { depth: 0.03 });
        if (it.hang) [it.a0 + 0.06, it.a1 - 0.06].forEach(a => {
          const [nx, , nz] = FACE[it.face];
          const px = it.face === 'S' || it.face === 'N' ? a : it.p + nx * 0.015, py = it.face === 'S' || it.face === 'N' ? it.p + nz * 0.015 : a;
          const c = cyl(px, py, it.z1, M.H, 0.0025, MAT.steel, null, 6); c.castShadow = false;
        });
        const t = it.content === 'planta' ? plan : frameTex(it.stage);
        wallPlane({ ...it, a0: it.a0 + 0.03, a1: it.a1 - 0.03, z0: it.z0 + 0.03, z1: it.z1 - 0.03 }, std({ map: t, roughness: 0.5, color: 0xffffff }), { off: 0.031 });
      } else if (it.kind === 'board') {
        wallPlane(it, MAT.alu, { depth: 0.025 });
        wallPlane({ ...it, a0: it.a0 + 0.02, a1: it.a1 - 0.02, z0: it.z0 + 0.02, z1: it.z1 - 0.02 }, std({ map: boardTex(), roughness: 0.3 }), { off: 0.026 });
      } else if (it.kind === 'text' && it.content === 'eco-band') {
        wallPlane(it, new THREE.MeshBasicMaterial({ map: ecoBandTex(), transparent: true, toneMapped: false, color: 0xffffff }), { off: 0.03 });
      } else if (it.kind === 'text' && it.content === 'camera') {
        wallPlane(it, MAT.steel, { depth: 0.06 });
      } else if (it.kind === 'sign') {
        wallPlane(it, std({ map: signTex(it.text), roughness: 0.4 }), { depth: 0.008 });
      }
    });
  }

  /* ---------------------------------------------------------------- teto técnico e luz */
  function buildCeilingKit() {
    const C = groups.ceiling, H = M.H;
    // dutos de climatização aparentes (operações e galeria)
    const duct = (x0, y0, x1, y1, z, r) => {
      const len = Math.hypot(x1 - x0, y1 - y0), m = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), MAT.galv));
      m.position.set((x0 + x1) / 2, z, (y0 + y1) / 2);
      if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2;
      C.add(m); return m;
    };
    duct(6.0, 0.9, 12.2, 0.9, H - 0.3, 0.17); duct(6.0, 7.95, M.plate.w - 0.4, 7.95, H - 0.25, 0.13); duct(15.5, 11.2, M.plate.w - 0.3, 11.2, H - 0.25, 0.13);
    // eletrocalhas
    box(6.0, 3.55, 12.1, 3.75, H - 0.2, H - 0.14, MAT.steel, C);
    // baffles acústicos em feltro sobre as bancadas
    M.furniture.filter(o => o.t === 'bench').forEach(b => { for (let y = b.y + 0.45; y < b.y + b.d; y += 1.05) box(b.x - 0.1, y - 0.015, b.x + b.w + 0.1, y + 0.015, H - 0.5, H - 0.08, MAT.feltPetrol, C); });
    // nuvens acústicas na recepção e jogos
    box(0.6, 9.2, 5.0, 12.6, H - 0.12, H - 0.08, MAT.feltGraph, C);
    // luminárias lineares
    M.lights.forEach(l => {
      const recessed = l.z < M.FORRO + 0.001 && l.z > M.FORRO - 0.05;
      const along = Math.abs(l.x1 - l.x0) > Math.abs(l.y1 - l.y0);
      const w = 0.05;
      const x0 = Math.min(l.x0, l.x1) - (along ? 0 : w / 2), x1 = Math.max(l.x0, l.x1) + (along ? 0 : w / 2);
      const y0 = Math.min(l.y0, l.y1) - (along ? w / 2 : 0), y1 = Math.max(l.y0, l.y1) + (along ? w / 2 : 0);
      if (recessed) { box(x0, y0, x1, y1, l.z - 0.005, l.z, MAT.lightLine, C).castShadow = false; }
      else {
        box(x0, y0, x1, y1, l.z, l.z + 0.07, MAT.steel, C).castShadow = false;
        box(x0 + 0.005, y0 + 0.005, x1 - 0.005, y1 - 0.005, l.z - 0.004, l.z, MAT.lightLine, C).castShadow = false;
        // cabos de suspensão
        [[l.x0, l.y0], [l.x1, l.y1]].forEach(([x, y]) => { const m = cyl(x, y, l.z + 0.07, H, 0.003, MAT.steel, C, 6); m.castShadow = false; });
      }
    });
  }
  function buildLights() {
    const L = groups.lights;
    L.add(new THREE.HemisphereLight(0xeef3f5, 0x6f6a62, 0.34));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.5);
    sun.position.set(4, 22, -14); sun.target.position.set(10, 0, 6.5);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    L.add(sun); L.add(sun.target);
    // luz artificial: um ponto por luminária
    M.lights.forEach(l => {
      const p = new THREE.PointLight(0xffe6c4, 0.36, 6.5, 1.5);
      p.position.set((l.x0 + l.x1) / 2, l.z - 0.25, (l.y0 + l.y1) / 2);
      L.add(p);
    });
  }

  /* ---------------------------------------------------------------- paisagem externa */
  function skylineTex() {
    const W = 4096, Hh = 1024, c = cnv(W, Hh), g = c.getContext('2d'), r = rng(404);
    const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, '#a9c4d6'); sky.addColorStop(0.55, '#dfe7ea'); sky.addColorStop(0.62, '#ece6dc'); sky.addColorStop(1, '#b9b6ad');
    g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
    const horizon = Hh * 0.6;
    for (let layer = 0; layer < 3; layer++) {
      const tone = [214, 198, 178][layer], top = [0.12, 0.2, 0.3][layer];
      let x = 0;
      while (x < W) {
        const bw = 40 + r() * (120 - layer * 20), bh = (0.05 + r() * top) * Hh;
        g.fillStyle = `rgb(${tone - 6},${tone},${tone + 6})`; g.fillRect(x, horizon - bh, bw, bh + Hh);
        if (layer === 2) { g.fillStyle = 'rgba(236,240,242,0.22)'; for (let yy = horizon - bh + 8; yy < horizon + 200; yy += 12) g.fillRect(x + 4, yy, bw - 8, 2); }
        x += bw + r() * 12;
      }
    }
    g.fillStyle = 'rgba(120,140,110,0.5)'; for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(r() * W, horizon + 40 + r() * 300, 10 + r() * 30, 0, 7); g.fill(); }
    const haze = g.createLinearGradient(0, horizon - Hh * 0.35, 0, Hh); haze.addColorStop(0, 'rgba(226,232,234,0)'); haze.addColorStop(0.5, 'rgba(226,232,234,0.35)'); haze.addColorStop(1, 'rgba(210,214,212,0.5)');
    g.fillStyle = haze; g.fillRect(0, 0, W, Hh);
    const t = mkTex(c); t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(2, 1); return t;
  }
  function buildBackdrop() {
    const geo = new THREE.CylinderGeometry(70, 70, 90, 64, 1, true);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: skylineTex(), side: THREE.BackSide, toneMapped: false, fog: false }));
    m.position.set(M.plate.w / 2, -8, 6.5); groups.backdrop.add(m);
  }

  /* ---------------------------------------------------------------- montagem */
  let built = null;
  async function build() {
    if (built) return built;
    if (document.fonts) { try { await Promise.all(['800 40px Archivo', '700 40px Archivo', '600 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"'].map(f => document.fonts.load(f))); } catch (e) { /* segue com fonte de fallback */ } }
    await loadLogos();
    if (!TX.concreteFloor) buildTextures();
    buildMaterials();
    MAT.ripadoMat = std({ color: 0xffffff, map: TX.ripado, bumpMap: TX.ripadoBump, bumpScale: 0.015, roughness: 0.6 });
    MAT.concretePanelMat = std({ color: 0xffffff, map: TX.concretePanel, roughness: 0.85 });
    MAT.oakPanelMat = std({ color: 0xffffff, map: TX.oakPanel, roughness: 0.6 });
    MAT.tileMat = std({ color: 0xffffff, map: TX.tile, roughness: 0.2 });
    const sg = M.wallItems.find(x => x.mat === 'supergrafico'); MAT.superMat = std({ map: supergraficoTex(sg ? sg.a1 - sg.a0 : 4.05), roughness: 0.85 });
    SCREENS = { totem: totemTex(), reuniao: slideTex(), ceo: ceoScreenTex(), tv: tvTex() };
    ['obras', 'cronograma', 'rdo', 'restricoes', 'suprimentos', 'produtividade'].forEach(k => { SCREENS[k] = dashboard(k); });
    for (let i = 0; i < 5; i++) SCREENS['m' + i] = monitorTex(i + 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe4eaec);
    groups = { main: new THREE.Group(), ceiling: new THREE.Group(), lights: new THREE.Group(), backdrop: new THREE.Group() };
    Object.values(groups).forEach(g => scene.add(g));
    buildShell(); buildFurniture(); await buildWallItems(); buildCeilingKit(); buildLights(); buildBackdrop();
    built = { scene, groups };
    return built;
  }
  function makeRenderer(canvas, w, h, preserve) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!preserve });
    r.setPixelRatio(1); r.setSize(w, h, false);
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.8;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.physicallyCorrectLights = false;
    return r;
  }
  let envReady = false;
  function ensureEnv(renderer) {
    if (envReady) return; envReady = true;
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  }
  function viewCamera(v, aspect) {
    const cam = new THREE.PerspectiveCamera(v.fov, aspect, 0.05, 200);
    cam.position.copy(V(...v.pos)); cam.lookAt(V(...v.at)); return cam;
  }
  function applyView(v) { groups.ceiling.visible = v.ceiling !== false; groups.backdrop.visible = v.ceiling !== false; }

  // renderiza uma perspectiva e devolve um dataURL (JPEG)
  let stillR = null;
  async function renderStill(id, w = 1600, h = 900, type = 'image/jpeg') {
    await build();
    if (!stillR) { stillR = makeRenderer(document.createElement('canvas'), w, h, true); ensureEnv(stillR); }
    stillR.setSize(w, h, false);
    const v = M.views.find(x => x.id === id); applyView(v);
    const cam = viewCamera(v, w / h);
    stillR.render(scene, cam);
    return stillR.domElement.toDataURL(type, 0.9);
  }
  async function renderInto(canvas, id) {
    await build();
    const w = canvas.clientWidth || 1600, h = canvas.clientHeight || 900;
    const r = makeRenderer(canvas, w, h, true); ensureEnv(r);
    const v = M.views.find(x => x.id === id); applyView(v);
    r.render(scene, viewCamera(v, w / h));
    return r;
  }

  // visualizador interativo (órbita)
  async function mountViewer(canvas, ui) {
    await build();
    const r = makeRenderer(canvas, canvas.clientWidth, canvas.clientHeight, false); ensureEnv(r);
    const cam = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.05, 200);
    const ctl = new THREE.OrbitControls(cam, canvas);
    ctl.enableDamping = true; ctl.dampingFactor = 0.09; ctl.maxPolarAngle = Math.PI * 0.495;
    let raf = 0, alive = true, lastT = null;
    const frameFns = [];   // animações externas (bonecos): devolvem true enquanto precisam de quadro
    const loop = (t) => {
      raf = 0; if (!alive) return;
      const dt = lastT === null ? 0 : Math.min(0.05, Math.max(0, (t - lastT) / 1000)); lastT = t;
      const moved = ctl.update();
      let anim = false; for (const f of frameFns) { if (f(dt, t / 1000)) anim = true; }
      r.render(scene, cam);
      if (moved || anim) req(); else lastT = null;
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(loop); };
    ctl.addEventListener('change', req);
    function go(id) {
      const v = M.views.find(x => x.id === id); applyView(v);
      cam.fov = v.fov; cam.position.copy(V(...v.pos)); ctl.target.copy(V(...v.at)); cam.updateProjectionMatrix(); ctl.update(); req();
      if (ui && ui.onView) ui.onView(id);
    }
    function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); req(); }
    new ResizeObserver(resize).observe(canvas);
    go('aerea');
    // aproxima a câmera de um ponto da planta (x, y em metros), mantendo a direção atual
    function focus(x, y, z = 1.0, dist = 5.5) {
      const tgt = V(x, y, z), dir = cam.position.clone().sub(ctl.target).normalize();
      if (dir.y < 0.35) { dir.y = 0.55; dir.normalize(); }
      ctl.target.copy(tgt); cam.position.copy(tgt.clone().add(dir.multiplyScalar(dist))); ctl.update(); req();
    }
    return {
      go, focus, setCeiling(on) { groups.ceiling.visible = on; groups.backdrop.visible = on; req(); }, render: req, stop() { alive = false; },
      scene, camera: cam, controls: ctl, renderer: r, canvas, onFrame(fn) { frameFns.push(fn); req(); },
    };
  }

  // exporta o modelo em .glb (abre no Blender, SketchUp, Enscape, D5 Render, Twinmotion)
  async function exportGLB() {
    await build();
    return new Promise((res, rej) => {
      const ex = new THREE.GLTFExporter();
      ex.parse(scene, (glb) => res(new Blob([glb], { type: 'model/gltf-binary' })), rej, { binary: true, onlyVisible: false, maxTextureSize: 2048 });
    });
  }

  // amostras de material geradas das mesmas texturas do modelo
  function swatches() {
    if (!TX.concreteFloor) buildTextures();
    const crop = (img, color, mode) => {
      const c = cnv(320, 240), g = c.getContext('2d');
      if (color) { g.fillStyle = color; g.fillRect(0, 0, 320, 240); }
      if (img) { g.globalCompositeOperation = mode || 'source-over'; g.drawImage(img, 0, 0, Math.min(img.width, 640), Math.min(img.height, 480), 0, 0, 320, 240); g.globalCompositeOperation = 'source-over'; }
      return c.toDataURL('image/jpeg', 0.88);
    };
    const flat = (a, b, lines) => {
      const c = cnv(320, 240), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 320, 240);
      gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 320, 240);
      if (lines) { const r = rng(3); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(0, r() * 240, 320, 1); } }
      return c.toDataURL('image/jpeg', 0.88);
    };
    return {
      concreteFloor: crop(TX.concreteFloor.image), concretePanel: crop(TX.concretePanel.image), ripado: crop(TX.ripado.image), oakFloor: crop(TX.oakFloor.image),
      steel: flat('#2c3032', '#141617', true), felt: crop(TX.felt.image, '#245f64', 'multiply'), slab: flat('#3a3e40', '#2a2d2f', false), orange: flat('#d0601f', '#b84c14', false),
    };
  }

  window.VEX3D = { build, renderStill, renderInto, mountViewer, exportGLB, swatches, views: M.views };
})();
