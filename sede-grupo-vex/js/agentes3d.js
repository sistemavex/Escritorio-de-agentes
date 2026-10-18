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
    const standRest = [[16.6, 6.6, 0], [18.9, 6.95, 300], [16.5, 11.9, 90], [18.4, 11.0, 200], [17.0, 5.3, 40], [16.4, 12.6, 60]];
    standRest.forEach(([x, y, r], i) => rest.push({ id: 'pe-' + (i + 1), room: roomOf(x, y), x, y, r, h: 0, pose: 'stand', label: 'Em pé · ' + ROOM_NAME[roomOf(x, y)], spare: true }));
    const standMeet = [[10.3, 12.5, 270], [10.3, 9.45, 270], [6.4, 12.55, 60], [7.4, 12.6, 0]];
    standMeet.forEach(([x, y, r], i) => meet.push({ id: 'reu-pe-' + (i + 1), room: 'reuniao', x, y, r, h: 0, pose: 'stand', label: 'Sala de reunião · em pé', spare: true }));
    const standWork = [[14.9, 2.2, 90], [14.9, 4.9, 90], [10.2, 0.55, 180], [6.55, 6.0, 90]];
    standWork.forEach(([x, y, r], i) => work.push({ id: 'ops-pe-' + (i + 1), room: 'operacoes', x, y, r, h: 0, pose: 'stand', label: 'Operações · em pé (sem mesa livre)', spare: true }));
    return { work, rest, meet, all: [...work, ...rest, ...meet] };
  }
  const SLOTS = buildSlots();
  const slotById = (id) => SLOTS.all.find(s => s.id === id);

  /* ------------------------------------------------------------ grade de circulação */
  const RES = 0.2, GW = Math.ceil(20 / RES), GH = Math.ceil(13 / RES);
  const grid = new Uint8Array(GW * GH);
  const cell = (x, y) => [Math.floor(x / RES), Math.floor(y / RES)];
  const free = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && !grid[j * GW + i];
  function blockRect(x0, y0, x1, y1, inf = 0.14) {
    const [i0, j0] = cell(Math.max(0, x0 - inf), Math.max(0, y0 - inf)), [i1, j1] = cell(Math.min(19.99, x1 + inf), Math.min(12.99, y1 + inf));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grid[j * GW + i] = 1;
  }
  (function buildGrid() {
    M.walls.forEach(w => P.wallSegments(w).forEach(([s0, s1]) => {
      if (w.axis === 'h') blockRect(s0, w.c - w.t / 2, s1, w.c + w.t / 2, 0.12); else blockRect(w.c - w.t / 2, s0, w.c + w.t / 2, s1, 0.12);
    }));
    M.columns.forEach(c => blockRect(c.x - c.s / 2, c.y - c.s / 2, c.x + c.s / 2, c.y + c.s / 2));
    const RECT = ['bench', 'desk', 'table', 'hightable', 'coffeetable', 'barcounter', 'cabinet', 'lockers', 'credenza', 'balcao', 'planter', 'booth', 'fridge', 'tower', 'counter', 'printer', 'shelf', 'rack', 'pebolim', 'sofa', 'shower', 'whiteboard'];
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

  function makeBody(look) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const L = Object.assign({ skin: '#d9a17a', hair: '#2a1d14', shirt: '#334155', pants: '#1e293b', shoes: '#15181f' }, look || {});
    const mSkin = mat(L.skin, 0.6), mHair = mat(L.hair, 0.9), mShirt = mat(L.shirt, 0.85), mPants = mat(L.pants, 0.85), mShoe = mat(L.shoes, 0.5), mDark = mat('#141617', 0.4);
    const legs = [];
    [-0.09, 0.09].forEach(sx => {
      const hip = new THREE.Group(); hip.position.set(sx, 0.92, 0); body.add(hip);
      part(hip, G('thigh', () => rounded(0.14, 0.48, 0.16, 0.05)), mPants, 0, -0.23, 0);
      const knee = new THREE.Group(); knee.position.set(0, -0.46, 0); hip.add(knee);
      part(knee, G('shin', () => rounded(0.13, 0.44, 0.14, 0.05)), mPants, 0, -0.21, 0);
      part(knee, G('shoe', () => rounded(0.13, 0.08, 0.26, 0.035)), mShoe, 0, -0.43, -0.05);
      legs.push({ hip, knee });
    });
    part(body, G('torso', () => rounded(0.4, 0.58, 0.24, 0.09)), mShirt, 0, 1.2, 0);
    part(body, G('neck', () => new THREE.CylinderGeometry(0.05, 0.055, 0.08, 12)), mSkin, 0, 1.52, 0);
    const head = new THREE.Group(); head.position.set(0, 1.67, 0); body.add(head);
    const hd = part(head, G('head', () => new THREE.SphereGeometry(0.12, 24, 18)), mSkin, 0, 0, 0); hd.scale.set(0.95, 1.08, 1);
    const hair = part(head, G('hair', () => new THREE.SphereGeometry(0.128, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52)), mHair, 0, 0.012, 0.012); hair.rotation.x = -0.32;
    if (L.style === 'longo' || L.style === 'coque') part(head, G('hairBack', () => rounded(0.22, 0.24, 0.08, 0.04)), mHair, 0, -0.08, 0.09);
    if (L.style === 'coque') part(head, G('bun', () => new THREE.SphereGeometry(0.06, 14, 10)), mHair, 0, 0.1, 0.11);
    [-0.042, 0.042].forEach(ex => part(head, G('eye', () => new THREE.SphereGeometry(0.014, 8, 6)), mDark, ex, 0.012, -0.112));
    if (L.glasses) { const gl = part(head, G('glasses', () => new THREE.BoxGeometry(0.17, 0.035, 0.01)), mDark, 0, 0.014, -0.121); gl.castShadow = false; }
    if (L.beard) part(head, G('beard', () => rounded(0.15, 0.07, 0.06, 0.025)), mHair, 0, -0.085, -0.085);
    const arms = [];
    [-0.245, 0.245].forEach(sx => {
      const sh = new THREE.Group(); sh.position.set(sx, 1.44, 0); body.add(sh);
      part(sh, G('arm', () => rounded(0.1, 0.56, 0.11, 0.045)), mShirt, 0, -0.26, 0);
      part(sh, G('hand', () => new THREE.SphereGeometry(0.048, 12, 8)), mSkin, 0, -0.57, 0);
      sh.rotation.z = sx < 0 ? -0.06 : 0.06; arms.push(sh);
    });
    // anel de seleção e etiqueta
    const ring = new THREE.Mesh(G('ring', () => new THREE.RingGeometry(0.34, 0.42, 40)), new THREE.MeshBasicMaterial({ color: 0x2f9ea3, transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.015; ring.visible = false; root.add(ring);
    return { root, body, legs, arms, head, ring };
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
  const STATUS_COLOR = { trabalhando: '#3fae7a', descanso: '#e0a238', reuniao: '#a78bfa', fora: '#6b7376' };

  /* ------------------------------------------------------------ agente animado */
  class Bot {
    constructor(world, a) {
      this.w = world; this.a = a; this.b = makeBody(a.look);
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
      B.root.position.set(this.pos.x, seated ? seatH + 0.06 - 0.92 : 0, this.pos.y);
      // sentado: quadril um pouco para trás, perto do encosto
      if (seated) { B.root.position.x -= Math.sin(this.facing * DEG) * 0.05; B.root.position.z += Math.cos(this.facing * DEG) * 0.05; }
      B.root.rotation.y = -this.facing * DEG;
      const s = Math.sin(this.phase);
      B.legs.forEach((l, i) => {
        if (pose === 'walk') { const k = i ? s : -s; l.hip.rotation.x = k * 0.55; l.knee.rotation.x = -Math.max(0, -k) * 0.7; }
        else if (seated) { l.hip.rotation.x = Math.PI / 2; l.knee.rotation.x = pose === 'stool' ? -Math.PI / 2 + 0.35 : -Math.PI / 2; }
        else { l.hip.rotation.x = 0; l.knee.rotation.x = 0; }
      });
      B.arms.forEach((a, i) => {
        if (pose === 'walk') a.rotation.x = (i ? -s : s) * 0.45;
        else if (pose === 'work') a.rotation.x = 1.15 + Math.sin(t * 9 + i * 1.7) * 0.05;
        else if (pose === 'play') a.rotation.x = 1.35 + Math.sin(t * 12 + i * 2.1) * 0.12;
        else a.rotation.x = seated ? 0.35 : 0.04;
      });
      B.body.position.y = pose === 'walk' ? Math.abs(Math.cos(this.phase)) * 0.025 : Math.sin(this.phase) * 0.004;
      B.head.rotation.y = pose === 'sit' || pose === 'stand' ? Math.sin(t * 0.4 + this.phase) * 0.35 : 0;
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
        b.a = a; b.b.root.visible = a.status !== 'fora';
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
    world.sync = sync; world.setSelected = setSelected; world.slotFor = slotFor; world.occupied = occupied;
    world.focusAgent = (id) => { const b = bots.get(id); if (b) viewer.focus(b.pos.x, b.pos.y, 1.0, 5.5); };
    return world;
  }

  window.VEXAgents3D = { createWorld, SLOTS, slotById, ROOM_NAME, findPath };
})();
