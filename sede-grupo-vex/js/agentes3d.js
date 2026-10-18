/*
 * Agentes dentro do modelo 3D da sede.
 * - Estações: as cadeiras reais do modelo (bancadas, CEO, planejamento, jurídico, financeiro, recepção).
 * - Descanso: copa e sala de jogos. Reunião: as 11 cadeiras da sala de reunião.
 * - Bonecos 3D com a mesma "look" (cores) usada no escritório isométrico.
 * - Caminhada com A* numa grade de 20 cm gerada das paredes e móveis do modelo.
 */
(function () {
  const THREE = window.THREE, M = window.VEX_MODEL, P = window.VEXPlan;
  const DEG = Math.PI / 180;

  /* ------------------------------------------------------------ lugares */
  const roomOf = (x, y) => (M.rooms.find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || {}).id;
  const ROOM_NAME = Object.fromEntries(M.rooms.map(r => [r.id, r.short || r.name]));

  function buildSlots() {
    const work = [], rest = [], meet = [];
    M.furniture.filter(o => o.t === 'bench').forEach((b, bi) => {
      window.VEXPlan.benchParts(b).chairs.forEach((c, i) => {
        const n = bi * 8 + i + 1, lado = i % 2 === 0 ? b.label[0] : b.label[1];
        work.push({ id: 'ops-' + n, room: 'operacoes', x: c.x, y: c.y, r: c.r, h: 0.53, pose: 'work', label: `Operações · posto ${String(n).padStart(2, '0')} · ${lado.toLowerCase()}` });
      });
    });
    let fin = 0;
    M.furniture.filter(o => o.t === 'chair').forEach(c => {
      const room = roomOf(c.x, c.y);
      if (c.kind === 'meeting') return meet.push({ id: 'reu-' + (meet.length + 1), room, x: c.x, y: c.y, r: c.r, h: 0.53, pose: 'sit', label: 'Sala de reunião' });
      if (c.kind === 'cafe') return rest.push({ id: 'copa-' + (rest.length + 1), room, x: c.x, y: c.y, r: c.r, h: 0.49, pose: 'sit', label: 'Copa' });
      if (c.kind === 'guest') return;
      const id = room === 'financeiro' ? 'fin-' + (++fin) : room;
      const label = { ceo: 'Sala do CEO', planejamento: 'Sala de planejamento', juridico: 'Jurídico', recepcao: 'Recepção', financeiro: 'Financeiro · posto ' + fin }[room] || room;
      work.push({ id, room, x: c.x, y: c.y, r: c.r, h: c.kind === 'exec' ? 0.55 : 0.53, pose: 'work', label });
    });
    M.furniture.filter(o => o.t === 'stool' && roomOf(o.x, o.y) === 'copa').forEach(s => rest.push({ id: 'copa-' + (rest.length + 1), room: 'copa', x: s.x, y: s.y, r: s.r || 90, h: 0.76, pose: 'stool', label: 'Copa · balcão' }));
    const sofa = M.furniture.find(o => o.t === 'sofa');
    if (sofa) [0.3, 0.75].forEach((f, i) => rest.push({ id: 'sofa-' + (i + 1), room: 'jogos', x: sofa.x + 0.38, y: sofa.y + sofa.d * f + 0.05, r: 270, h: 0.44, pose: 'sit', label: 'Jogos · sofá' }));
    M.furniture.filter(o => o.t === 'armchair' && roomOf(o.x, o.y) === 'jogos').forEach(a => rest.push({ id: 'poltrona-jogos', room: 'jogos', x: a.x, y: a.y, r: a.r, h: 0.44, pose: 'sit', label: 'Jogos · poltrona' }));
    const peb = M.furniture.find(o => o.t === 'pebolim');
    if (peb) {
      rest.push({ id: 'pebolim-1', room: 'jogos', x: peb.x - 0.42, y: peb.y + peb.d / 2, r: 90, h: 0, pose: 'play', label: 'Jogos · pebolim' });
      rest.push({ id: 'pebolim-2', room: 'jogos', x: peb.x + peb.w + 0.42, y: peb.y + peb.d / 2, r: 270, h: 0, pose: 'play', label: 'Jogos · pebolim' });
    }
    // lugares em pé para quando faltar cadeira
    const standRest = [[13.0, 4.95, 90], [17.2, 6.85, 300], [16.25, 11.05, 90], [17.35, 11.15, 200], [16.9, 4.75, 40], [13.15, 6.6, 60]];
    standRest.forEach(([x, y, r], i) => rest.push({ id: 'pe-' + (i + 1), room: roomOf(x, y), x, y, r, h: 0, pose: 'stand', label: 'Em pé · ' + ROOM_NAME[roomOf(x, y)], spare: true }));
    const standMeet = [[9.55, 12.45, 270], [9.5, 9.5, 270], [6.3, 12.55, 60], [7.2, 12.6, 0]];
    standMeet.forEach(([x, y, r], i) => meet.push({ id: 'reu-pe-' + (i + 1), room: 'reuniao', x, y, r, h: 0, pose: 'stand', label: 'Sala de reunião · em pé', spare: true }));
    const standWork = [[11.9, 2.2, 90], [11.9, 4.9, 90], [9.9, 0.55, 180], [6.55, 6.0, 90]];
    standWork.forEach(([x, y, r], i) => work.push({ id: 'ops-pe-' + (i + 1), room: 'operacoes', x, y, r, h: 0, pose: 'stand', label: 'Operações · em pé (sem mesa livre)', spare: true }));
    return { work, rest, meet, all: [...work, ...rest, ...meet] };
  }
  const SLOTS = buildSlots();
  const slotById = (id) => SLOTS.all.find(s => s.id === id);

  /* ------------------------------------------------------------ grade de circulação */
  const PW = M.plate.w, RES = 0.2, GW = Math.ceil(PW / RES), GH = Math.ceil(13 / RES);
  const grid = new Uint8Array(GW * GH);
  const cell = (x, y) => [Math.floor(x / RES), Math.floor(y / RES)];
  const free = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && !grid[j * GW + i];
  function blockRect(x0, y0, x1, y1, inf = 0.14) {
    const [i0, j0] = cell(Math.max(0, x0 - inf), Math.max(0, y0 - inf)), [i1, j1] = cell(Math.min(PW - 0.01, x1 + inf), Math.min(12.99, y1 + inf));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grid[j * GW + i] = 1;
  }
  (function buildGrid() {
    M.walls.forEach(w => P.wallSegments(w).forEach(([s0, s1]) => {
      if (w.axis === 'h') blockRect(s0, w.c - w.t / 2, s1, w.c + w.t / 2, 0.12); else blockRect(w.c - w.t / 2, s0, w.c + w.t / 2, s1, 0.12);
    }));
    M.columns.forEach(c => blockRect(c.x - c.s / 2, c.y - c.s / 2, c.x + c.s / 2, c.y + c.s / 2));
    const RECT = ['bench', 'desk', 'table', 'hightable', 'coffeetable', 'barcounter', 'cabinet', 'lockers', 'credenza', 'balcao', 'planter', 'booth', 'fridge', 'tower', 'counter', 'printer', 'shelf', 'rack', 'pebolim', 'sofa', 'shower', 'whiteboard', 'panel', 'totem'];
    M.furniture.forEach(o => {
      if (RECT.includes(o.t)) blockRect(o.x, o.y, o.x + o.w, o.y + (o.d || 0.1));
      else if (['roundtable', 'sidetable', 'plant'].includes(o.t)) blockRect(o.x - o.s / 2, o.y - o.s / 2, o.x + o.s / 2, o.y + o.s / 2, 0.08);
      else if (o.t === 'armchair') blockRect(o.x - 0.38, o.y - 0.38, o.x + 0.38, o.y + 0.38, 0.05);
    });
  })();
  // só vale como ponto de chegada a área livre ligada à circulação (evita bolsões entre móveis)
  const reach = new Uint8Array(GW * GH);
  (function flood() {
    const [si, sj] = cell(12, 8.15), st = [[si, sj]]; reach[sj * GW + si] = 1;
    while (st.length) {
      const [i, j] = st.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => { const ni = i + di, nj = j + dj; if (free(ni, nj) && !reach[nj * GW + ni]) { reach[nj * GW + ni] = 1; st.push([ni, nj]); } });
    }
  })();
  function nearestFree(x, y) {
    let [ci, cj] = cell(x, y);
    for (let r = 0; r < 14; r++) {
      let best = null, bd = 1e9;
      for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || !free(i, j) || !reach[j * GW + i]) continue;
        const d = Math.hypot((i + 0.5) * RES - x, (j + 0.5) * RES - y); if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) return best;
    }
    return [ci, cj];
  }
  function lineFree(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.08);
    for (let k = 1; k < n; k++) { const t = k / n, [i, j] = cell(ax + (bx - ax) * t, ay + (by - ay) * t); if (!free(i, j)) return false; }
    return true;
  }
  function findPath(ax, ay, bx, by) {
    const [si, sj] = nearestFree(ax, ay), [gi, gj] = nearestFree(bx, by);
    const N = GW * GH, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open = [[0, si, sj]]; g[sj * GW + si] = 0;
    const hfn = (i, j) => Math.hypot(i - gi, j - gj);
    let found = false, guard = 0;
    while (open.length && guard++ < 20000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [, i, j] = open.splice(bi, 1)[0], id = j * GW + i;
      if (closed[id]) continue; closed[id] = 1;
      if (i === gi && j === gj) { found = true; break; }
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj; if (!free(ni, nj)) continue;
        if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;
        const nid = nj * GW + ni, ng = g[id] + (di && dj ? 1.414 : 1);
        if (ng < g[nid]) { g[nid] = ng; came[nid] = id; open.push([ng + hfn(ni, nj), ni, nj]); }
      }
    }
    if (!found) return [[bx, by]];
    const pts = []; let c = gj * GW + gi;
    while (c >= 0) { pts.push([(c % GW + 0.5) * RES, (Math.floor(c / GW) + 0.5) * RES]); c = came[c]; }
    pts.reverse();
    // encurta o caminho onde houver linha de visada
    const out = [[ax, ay]]; let k = 0;
    while (k < pts.length - 1) {
      let far = k + 1;
      for (let m = pts.length - 1; m > k + 1; m--) if (lineFree(pts[k][0], pts[k][1], pts[m][0], pts[m][1])) { far = m; break; }
      out.push(pts[far]); k = far;
    }
    out.push([bx, by]);
    return out;
  }

  /* ------------------------------------------------------------ boneco */
  const geo = {};
  function G(name, make) { return geo[name] || (geo[name] = make()); }
  const mat = (c, rough = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, envMapIntensity: 0.4 });
  function part(g, geometry, material, x, y, z) { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; }
  function rounded(w, h, d, r) { return THREE.RoundedBoxGeometry ? new THREE.RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d); }

  // materiais compartilhados por cor (muitos bonecos, poucas cores); as cores das fichas estão em sRGB
  const MATS = new Map();
  function matC(hex, rough = 0.85, extra) { const k = hex + rough + (extra || ''); if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).convertSRGBToLinear(), roughness: rough, envMapIntensity: 0.45 })); return MATS.get(k); }
  const caps = (r, len, seg = 14) => THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(r, len, 6, seg) : new THREE.CylinderGeometry(r, r, len + 2 * r, seg);
  function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h | 0); }
  const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };

  /*
   * Corpo humano proporcional (~1,74 m), articulado em quadril, joelho, ombro, cotovelo e pescoço.
   * Frente = -z local. Roupa: camisa social, polo ou camiseta (manga curta), calça, sapato; o dono usa blazer.
   */
  function makeBody(look, seed) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const L = Object.assign({ skin: '#d9a17a', hair: '#2a1d14', shirt: '#334155', pants: '#1e293b', shoes: '#15181f', style: 'curto' }, look || {});
    const h = hashStr(String(seed || '') + L.shirt);
    const top = L.top || ['social', 'polo', 'camiseta', 'social'][h % 4];
    const curta = top !== 'social' && !L.jacket;
    const mSkin = matC(L.skin, 0.55), mHair = matC(L.hair, 0.75), mTop = matC(L.jacket || L.shirt, 0.9), mShirt = matC(L.shirt, 0.88);
    const mPants = matC(L.pants, 0.9), mShoe = matC(L.shoes, 0.45), mSole = matC('#0e0f10', 0.7), mWhite = matC('#f4f2ee', 0.3), mIris = matC('#2a1d14', 0.2), mLip = matC(shade(L.skin, 0.78), 0.6), mBrow = matC(shade(L.hair, 0.9), 0.8);
    const add = (g, geo, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (sx) o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };

    // quadril e pernas
    const pelvis = new THREE.Group(); pelvis.position.y = 0.95; body.add(pelvis);
    add(pelvis, G('hipsB', () => rounded(0.33, 0.17, 0.21, 0.07)), mPants, 0, -0.02, 0.0);
    const legs = [];
    [-0.092, 0.092].forEach(sx => {
      const hip = new THREE.Group(); hip.position.set(sx, -0.05, 0); pelvis.add(hip);
      add(hip, G('thighB', () => caps(0.072, 0.3)), mPants, 0, -0.2, 0);
      const knee = new THREE.Group(); knee.position.set(0, -0.43, 0); hip.add(knee);
      add(knee, G('shinB', () => caps(0.056, 0.32)), mPants, 0, -0.2, 0);
      const ankle = new THREE.Group(); ankle.position.set(0, -0.39, 0); knee.add(ankle);
      add(ankle, G('shoeB', () => rounded(0.1, 0.075, 0.25, 0.035)), mShoe, 0, -0.03, -0.045);
      add(ankle, G('soleB', () => rounded(0.104, 0.02, 0.26, 0.01)), mSole, 0, -0.07, -0.045);
      legs.push({ hip, knee });
    });

    // tronco (abdômen + peito), gola, pescoço
    const spine = new THREE.Group(); spine.position.y = 0.95; body.add(spine);
    add(spine, G('abdB', () => caps(0.145, 0.16, 18)), mTop, 0, 0.17, 0, 1.12, 1, 0.74);
    const chest = add(spine, G('chestB', () => caps(0.165, 0.12, 18)), mTop, 0, 0.37, -0.005, 1.18, 1, 0.72);
    add(spine, G('shoulderB', () => caps(0.075, 0.26, 12)), mTop, 0, 0.47, 0.005, 1, 1, 0.8).rotation.z = Math.PI / 2;
    if (L.jacket) { // camisa e lapela aparecendo no peito
      add(spine, G('vB', () => new THREE.BoxGeometry(0.1, 0.2, 0.01)), mShirt, 0, 0.44, -0.118);
      add(spine, G('lapB', () => new THREE.BoxGeometry(0.02, 0.24, 0.012)), matC(shade(L.jacket, 0.7), 0.8), -0.06, 0.4, -0.12).rotation.z = 0.25;
      add(spine, G('lapB', () => new THREE.BoxGeometry(0.02, 0.24, 0.012)), matC(shade(L.jacket, 0.7), 0.8), 0.06, 0.4, -0.12).rotation.z = -0.25;
    }
    if (top !== 'camiseta') add(spine, G('collarB', () => new THREE.TorusGeometry(0.06, 0.018, 8, 18)), L.jacket ? mShirt : mTop, 0, 0.545, -0.01).rotation.x = Math.PI / 2 - 0.25;
    add(spine, G('neckB', () => new THREE.CylinderGeometry(0.047, 0.054, 0.12, 14)), mSkin, 0, 0.59, 0.005);

    // cabeça
    const head = new THREE.Group(); head.position.set(0, 0.72, 0.0); spine.add(head);
    add(head, G('skullB', () => new THREE.SphereGeometry(0.104, 28, 22)), mSkin, 0, 0, 0.006, 0.9, 1.06, 1);
    add(head, G('jawB', () => new THREE.SphereGeometry(0.08, 22, 16)), mSkin, 0, -0.05, -0.008, 0.95, 0.9, 0.92);
    add(head, G('noseB', () => new THREE.ConeGeometry(0.016, 0.042, 10)), mSkin, 0, -0.012, -0.1).rotation.x = -Math.PI / 2 + 0.25;
    [-1, 1].forEach(k => {
      add(head, G('earB', () => new THREE.SphereGeometry(0.022, 10, 8)), mSkin, k * 0.094, -0.005, 0.01, 0.45, 1, 0.8);
      add(head, G('eyeB', () => new THREE.SphereGeometry(0.0155, 12, 10)), mWhite, k * 0.034, 0.014, -0.083);
      add(head, G('irisB', () => new THREE.SphereGeometry(0.0088, 10, 8)), mIris, k * 0.034, 0.014, -0.096);
      add(head, G('browB', () => rounded(0.034, 0.008, 0.01, 0.003)), mBrow, k * 0.035, 0.042, -0.09).rotation.z = k * -0.08;
    });
    add(head, G('lipB', () => rounded(0.038, 0.009, 0.01, 0.004)), mLip, 0, -0.058, -0.087);
    // cabelo por estilo
    const st = L.style || 'curto', short = ['raspado', 'fade'].includes(st);
    const cap = add(head, G('capB' + (short ? 's' : ''), () => new THREE.SphereGeometry(0.112, 28, 16, 0, Math.PI * 2, 0, Math.PI * (short ? 0.42 : 0.55))), mHair, 0, 0.008, 0.016, 0.94, short ? 0.9 : 1.04, 1.04);
    cap.rotation.x = 0.32; // inclina para trás: testa livre, nuca coberta
    add(head, G('napeB', () => new THREE.SphereGeometry(0.106, 20, 12, 0, Math.PI, Math.PI * 0.3, Math.PI * 0.3)), mHair, 0, 0.0, 0.012, 0.92, 1, 0.98);
    if (['ondulado', 'cacheado', 'afro'].includes(st)) for (let k = 0; k < (st === 'afro' ? 22 : 12); k++) {
      const a = k * 2.399, rr = st === 'afro' ? 0.11 : 0.095;
      add(head, G('curlB', () => new THREE.SphereGeometry(0.03, 8, 6)), mHair, Math.cos(a) * rr * 0.85, 0.05 + (k % 3) * 0.02, Math.sin(a) * rr * 0.8 + 0.02);
    }
    if (['longo', 'chanel', 'rabo'].includes(st) || st === 'coque') {
      if (st === 'longo' || st === 'chanel') add(head, G('longB', () => caps(0.085, st === 'longo' ? 0.16 : 0.06, 14)), mHair, 0, st === 'longo' ? -0.1 : -0.05, 0.045, 1.15, 1, 0.65);
      if (st === 'rabo') add(head, G('tailB', () => caps(0.03, 0.14, 10)), mHair, 0, -0.06, 0.12).rotation.x = 0.35;
      if (st === 'coque') add(head, G('bunB', () => new THREE.SphereGeometry(0.048, 14, 10)), mHair, 0, 0.07, 0.1);
    }
    if (L.beard) add(head, G('beardB', () => new THREE.SphereGeometry(0.084, 18, 12, Math.PI * 1.08, Math.PI * 0.84, Math.PI * 0.55, Math.PI * 0.4)), mHair, 0, -0.035, -0.012, 1.0, 1.0, 1.0);
    if (L.glasses) {
      const mG = matC('#151718', 0.3);
      [-1, 1].forEach(k => add(head, G('lensB', () => new THREE.TorusGeometry(0.021, 0.003, 6, 16)), mG, k * 0.034, 0.014, -0.1));
      add(head, G('bridgeB', () => new THREE.BoxGeometry(0.026, 0.003, 0.003)), mG, 0, 0.018, -0.1);
    }

    // braços
    const arms = [];
    [-1, 1].forEach(k => {
      const sh = new THREE.Group(); sh.position.set(k * 0.205, 0.46, 0.005); spine.add(sh);
      add(sh, G(curta ? 'upperS' : 'upperB', () => caps(0.05, curta ? 0.12 : 0.2, 12)), mTop, 0, curta ? -0.09 : -0.13, 0);
      if (curta) add(sh, G('upperSk', () => caps(0.043, 0.1, 12)), mSkin, 0, -0.2, 0);
      const el = new THREE.Group(); el.position.set(0, -0.29, 0); sh.add(el);
      add(el, G('foreB', () => caps(0.042, 0.17, 12)), curta ? mSkin : mTop, 0, -0.12, 0);
      if (!curta) add(el, G('cuffB', () => new THREE.CylinderGeometry(0.044, 0.044, 0.02, 12)), L.jacket ? mShirt : mTop, 0, -0.235, 0);
      add(el, G('handB', () => rounded(0.055, 0.09, 0.03, 0.014)), mSkin, 0, -0.29, 0);
      sh.rotation.z = k * 0.07;
      arms.push({ sh, el, k });
    });

    // anel de seleção
    const ring = new THREE.Mesh(G('ring', () => new THREE.RingGeometry(0.34, 0.42, 40)), new THREE.MeshBasicMaterial({ color: 0x2f9ea3, transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.015; ring.visible = false; root.add(ring);
    return { root, body, legs, arms, head, spine, chest, ring };
  }

  function tagTexture(a, color) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 112;
    const g = c.getContext('2d'); g.font = "600 40px 'IBM Plex Mono', ui-monospace, monospace";
    const txt = `${a.emoji || ''} ${a.name}`.trim(); const w = Math.min(500, g.measureText(txt).width + 84);
    const x0 = (512 - w) / 2;
    g.fillStyle = 'rgba(15,19,20,0.86)'; g.beginPath(); g.roundRect(x0, 18, w, 76, 38); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc(x0 + 38, 56, 12, 0, 7); g.fill();
    g.fillStyle = '#eef2f1'; g.textBaseline = 'middle'; g.fillText(txt, x0 + 62, 58);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  const STATUS_COLOR = { trabalhando: '#3fae7a', descanso: '#e0a238', reuniao: '#a78bfa', offline: '#6b7376' };

  /* ------------------------------------------------------------ agente animado */
  class Bot {
    constructor(world, a) {
      this.w = world; this.a = a; this.b = makeBody(a.boss ? Object.assign({ jacket: '#2b3237', shirt: '#f2f2ef', top: 'social' }, a.look) : a.look, a.key || a.id);
      this.b.root.traverse(o => { if (o.isMesh) o.userData.agentId = a.id; });
      world.group.add(this.b.root);
      this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(a, STATUS_COLOR[a.status] || '#888'), depthTest: true, depthWrite: false, transparent: true, toneMapped: false, sizeAttenuation: false }));
      // tamanho fixo na tela: legível tanto na maquete quanto dentro das salas
      this.tag.scale.set(0.155, 0.034, 1); this.tag.renderOrder = 999; this.b.root.add(this.tag);
      this.pos = { x: 3, y: 12.6 }; this.facing = 0; this.path = null; this.slot = null; this.phase = Math.random() * 6;
      this.pose = 'stand';
    }
    refreshTag() { this.tag.material.map.dispose(); this.tag.material.map = tagTexture(this.a, STATUS_COLOR[this.a.status] || '#888'); this.tag.material.needsUpdate = true; }
    place(slot) { this.slot = slot; this.path = null; this.pos = { x: slot.x, y: slot.y }; this.facing = slot.r; this.pose = slot.pose; }
    goTo(slot) {
      this.slot = slot;
      if (Math.hypot(slot.x - this.pos.x, slot.y - this.pos.y) < 0.05) return this.place(slot);
      this.path = findPath(this.pos.x, this.pos.y, slot.x, slot.y); this.pathI = 1; this.pose = 'walk';
      if (this.path.length < 2) this.place(slot);
    }
    update(dt, t) {
      const B = this.b;
      if (this.path) {
        const tgt = this.path[this.pathI];
        if (!tgt) { this.place(this.slot); return this.update(0, t); }
        const dx = tgt[0] - this.pos.x, dy = tgt[1] - this.pos.y, d = Math.hypot(dx, dy), step = 1.35 * dt;
        const want = Math.atan2(dx, -dy) / DEG; // 0 = norte, 90 = leste
        let diff = ((want - this.facing + 540) % 360) - 180; this.facing += Math.max(-1, Math.min(1, diff / 30)) * 420 * dt;
        if (d <= step) { this.pos.x = tgt[0]; this.pos.y = tgt[1]; this.pathI++; if (this.pathI >= this.path.length) { this.place(this.slot); } }
        else { this.pos.x += dx / d * step; this.pos.y += dy / d * step; }
        this.phase += dt * 9;
      } else this.phase += dt * 2.2;
      // postura
      const pose = this.pose, seated = pose === 'work' || pose === 'sit' || pose === 'stool';
      const seatH = this.slot && seated ? this.slot.h : 0;
      B.root.position.set(this.pos.x, seated ? seatH + 0.08 - 0.9 : 0, this.pos.y);
      // sentado: quadril um pouco para trás, perto do encosto
      if (seated) { B.root.position.x -= Math.sin(this.facing * DEG) * 0.06; B.root.position.z += Math.cos(this.facing * DEG) * 0.06; }
      B.root.rotation.y = -this.facing * DEG;
      const s = Math.sin(this.phase), c = Math.cos(this.phase);
      B.legs.forEach((l, i) => {
        if (pose === 'walk') { const k = i ? s : -s; l.hip.rotation.x = k * 0.48; l.knee.rotation.x = -Math.max(0, i ? -c : c) * 0.75 - 0.05; }
        else if (seated) { l.hip.rotation.x = Math.PI / 2 - 0.08 + (i ? 0.04 : -0.02); l.knee.rotation.x = pose === 'stool' ? -Math.PI / 2 + 0.45 : -Math.PI / 2 + 0.1; l.hip.rotation.z = i ? -0.06 : 0.06; }
        else { l.hip.rotation.x = 0; l.knee.rotation.x = 0; l.hip.rotation.z = 0; }
      });
      B.spine.rotation.x = pose === 'work' ? 0.1 : pose === 'sit' ? -0.06 : pose === 'walk' ? 0.04 : 0;
      B.arms.forEach((a, i) => {
        const k = a.k;
        if (pose === 'walk') { a.sh.rotation.x = (i ? -s : s) * 0.38; a.el.rotation.x = 0.25 + Math.max(0, (i ? -s : s)) * 0.3; a.sh.rotation.z = k * 0.08; }
        else if (pose === 'work') { a.sh.rotation.x = 0.42; a.el.rotation.x = 1.15 + Math.sin(t * 10 + i * 1.9) * 0.05; a.sh.rotation.z = k * 0.16; }
        else if (pose === 'play') { a.sh.rotation.x = 0.55 + Math.sin(t * 11 + i * 2.3) * 0.12; a.el.rotation.x = 0.95; a.sh.rotation.z = k * 0.22; }
        else if (seated) { a.sh.rotation.x = 0.28; a.el.rotation.x = 0.95; a.sh.rotation.z = k * 0.12; }
        else { a.sh.rotation.x = Math.sin(t * 0.7 + i) * 0.03; a.el.rotation.x = 0.12; a.sh.rotation.z = k * 0.07; }
      });
      // respiração e balanço
      B.chest.scale.y = 1 + Math.sin(t * 1.6 + this.phase) * 0.012;
      B.body.position.y = pose === 'walk' ? Math.abs(c) * 0.022 : 0;
      B.head.rotation.y = pose === 'sit' || pose === 'stand' ? Math.sin(t * 0.35 + this.phase) * 0.4 : pose === 'work' ? Math.sin(t * 0.25 + this.phase) * 0.12 : 0;
      B.head.rotation.x = pose === 'work' ? 0.08 : 0;
      this.tag.position.set(0, seated ? 1.95 : 2.05, 0);
    }
  }

  /* ------------------------------------------------------------ mundo dos agentes */
  function createWorld(viewer) {
    const group = new THREE.Group(); viewer.scene.add(group);
    const bots = new Map();
    const world = { group, bots, slots: SLOTS, slotById, roomName: ROOM_NAME, selected: null, onPick: null };

    function occupied(exceptId) {
      const m = new Map();
      bots.forEach((b, id) => { if (id !== exceptId && b.slot) m.set(b.slot.id, id); });
      return m;
    }
    // escolhe o lugar do agente conforme o status
    function slotFor(a) {
      const occ = occupied(a.id);
      const freeIn = (list) => list.filter(s => !occ.has(s.id));
      if (a.status === 'reuniao') return freeIn(SLOTS.meet)[0] || SLOTS.meet[0];
      if (a.status === 'descanso') { const f = freeIn(SLOTS.rest); const seats = f.filter(s => !s.spare); const pool = seats.length ? seats : f; return pool[Math.floor(Math.random() * pool.length)] || SLOTS.rest[0]; }
      // trabalhando
      if (a.boss) return slotById('ceo');
      const pref = a.slot3d && slotById(a.slot3d);
      if (pref && !occ.has(pref.id) && pref.id !== 'ceo') return pref;
      const role = (a.role || '') + ' ' + (a.name || '');
      const room = /financ|contab|caixa|fiscal/i.test(role) ? 'financeiro' : /jur[ií]d|contrat|advog/i.test(role) ? 'juridico'
                 : /planej|cronog/i.test(role) && !occ.has('planejamento') ? 'planejamento' : /recep|atendimento ao visit/i.test(role) ? 'recepcao' : 'operacoes';
      const f = freeIn(SLOTS.work).filter(s => s.id !== 'ceo');
      const pick = f.find(s => s.room === room && !s.spare) || f.find(s => s.room === 'operacoes' && !s.spare) || f.find(s => !s.spare) || f[0] || SLOTS.work[0];
      a.slot3d = pick.spare ? null : pick.id;
      return pick;
    }
    function sync(team, opts = {}) {
      const ids = new Set(team.map(a => a.id));
      bots.forEach((b, id) => { if (!ids.has(id)) { group.remove(b.b.root); bots.delete(id); } });
      team.forEach(a => {
        let b = bots.get(a.id), fresh = false;
        if (!b) { b = new Bot(world, a); bots.set(a.id, b); fresh = true; }
        b.a = a; b.b.root.visible = a.status !== 'offline';
        const st = a.status + '|' + (a.slot3d || '');
        if (b.lastSt !== st || fresh) {
          const slot = slotFor(a);
          if (fresh && !opts.walkIn) b.place(slot);
          else { if (fresh) b.place({ x: 3.0, y: 12.7, r: 0, pose: 'stand', h: 0, id: '_entrada' }); b.goTo(slot); }
          b.lastSt = a.status + '|' + (a.slot3d || ''); b.refreshTag();
        }
      });
      viewer.render();
    }
    function setSelected(id) {
      bots.forEach((b, k) => { b.b.ring.visible = k === id; });
      world.selected = id; viewer.render();
    }
    viewer.onFrame((dt, t) => { bots.forEach(b => { try { b.update(dt, t); } catch (e) { console.error(e); if (b.slot) b.place(b.slot); } }); return bots.size > 0; });
    // clique no boneco
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
    viewer.canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    viewer.canvas.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = viewer.canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ndc, viewer.camera);
      const hit = ray.intersectObjects(group.children, true).find(h => h.object.userData.agentId);
      if (hit && world.onPick) world.onPick(hit.object.userData.agentId);
    });
    // recria o boneco (ex.: depois de sortear outra aparência)
    world.rebuild = (id, team) => { const b = bots.get(id); if (b) { group.remove(b.b.root); bots.delete(id); } sync(team); };
    world.sync = sync; world.setSelected = setSelected; world.slotFor = slotFor; world.occupied = occupied;
    world.focusAgent = (id) => { const b = bots.get(id); if (b) viewer.focus(b.pos.x, b.pos.y, 1.0, 5.5); };
    return world;
  }

  window.VEXAgents3D = { createWorld, SLOTS, slotById, ROOM_NAME, findPath };
})();
