/*
 * Planta baixa humanizada gerada a partir de VEX_MODEL.
 * Coordenadas do SVG em metros (viewBox em metros). Funciona no navegador e no Node (gera planta-baixa.svg).
 */
(function (root) {
  const f2 = (n) => n.toFixed(2).replace('.', ',');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const r3 = (n) => +n.toFixed(3);

  // Rótulos posicionados à mão para não colidir com o mobiliário.
  const LABEL = {
    ceo: [2.25, 0.42], juridico: [1.75, 6.98], planejamento: [4.15, 6.25], recepcao: [2.55, 11.25],
    operacoes: [9.1, 0.42], financeiro: [14.7, 1.6], copa: [16.75, 7.0], galeria: [12.2, 8.62],
    reuniao: [8.0, 12.6], apoio: [11.2, 11.25], wcf: [12.6, 10.45], wcm: [14.4, 10.1], jogos: [16.95, 12.74],
  };
  const SMALL = { apoio: 1, wcf: 1, wcm: 1, galeria: 1 };

  function benchParts(b) {
    // bancada norte-sul: duas fileiras de mesas costas com costas, n mesas por lado
    const pitch = b.d / b.n, half = b.w / 2, desks = [], chairs = [];
    for (let i = 0; i < b.n; i++) {
      const y = b.y + i * pitch;
      desks.push({ x: b.x, y, w: half, d: pitch, side: 'O' });
      desks.push({ x: b.x + half, y, w: half, d: pitch, side: 'L' });
      chairs.push({ x: b.x - 0.42, y: y + pitch / 2, r: 90 });
      chairs.push({ x: b.x + b.w + 0.42, y: y + pitch / 2, r: 270 });
    }
    return { desks, chairs };
  }

  function wallSegments(w) {
    // trechos cheios (sem as aberturas) ao longo do eixo
    const cuts = w.open.slice().sort((p, q) => p.a - q.a);
    const segs = []; let s = w.a;
    cuts.forEach(o => { if (o.a > s) segs.push([s, o.a]); s = Math.max(s, o.b); });
    if (s < w.b) segs.push([s, w.b]);
    return segs;
  }
  const wallRect = (w, s0, s1, t) => w.axis === 'h'
    ? { x: s0, y: w.c - t / 2, w: s1 - s0, h: t }
    : { x: w.c - t / 2, y: s0, w: t, h: s1 - s0 };

  function rect(x, y, w, h, cls, extra = '') { return `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(w)}" height="${r3(h)}" class="${cls}" ${extra}/>`; }
  function line(x1, y1, x2, y2, cls, extra = '') { return `<line x1="${r3(x1)}" y1="${r3(y1)}" x2="${r3(x2)}" y2="${r3(y2)}" class="${cls}" ${extra}/>`; }
  function text(x, y, s, cls, extra = '') { return `<text x="${r3(x)}" y="${r3(y)}" class="${cls}" ${extra}>${esc(s)}</text>`; }

  // símbolo de cadeira: assento + encosto do lado oposto ao olhar
  function chairSym(c, cls = 'fu') {
    const s = c.kind === 'exec' ? 0.62 : 0.5;
    const rot = c.r || 0;
    return `<g transform="translate(${r3(c.x)} ${r3(c.y)}) rotate(${rot})">` +
      `<rect x="${-s / 2}" y="${-s / 2 + 0.04}" width="${s}" height="${s - 0.06}" rx="0.09" class="${cls}"/>` +
      `<rect x="${-s / 2 + 0.03}" y="${s / 2 - 0.1}" width="${s - 0.06}" height="0.1" rx="0.04" class="fu-d"/></g>`;
  }
  function armchairSym(c) {
    return `<g transform="translate(${r3(c.x)} ${r3(c.y)}) rotate(${c.r || 0})">` +
      `<rect x="-0.4" y="-0.38" width="0.8" height="0.78" rx="0.12" class="fu-soft"/>` +
      `<rect x="-0.4" y="0.2" width="0.8" height="0.2" rx="0.07" class="fu-d"/>` +
      `<rect x="-0.4" y="-0.3" width="0.14" height="0.66" rx="0.06" class="fu-d"/><rect x="0.26" y="-0.3" width="0.14" height="0.66" rx="0.06" class="fu-d"/></g>`;
  }
  function plantSym(p) {
    const r = p.s / 2; let s = `<circle cx="${p.x}" cy="${p.y}" r="${r}" class="pl-plant"/>`;
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      s += `<ellipse cx="${r3(p.x + Math.cos(a) * r * 0.5)}" cy="${r3(p.y + Math.sin(a) * r * 0.5)}" rx="${r3(r * 0.42)}" ry="${r3(r * 0.2)}" transform="rotate(${r3(a * 180 / Math.PI)} ${r3(p.x + Math.cos(a) * r * 0.5)} ${r3(p.y + Math.sin(a) * r * 0.5)})" class="pl-leaf"/>`;
    }
    return s;
  }

  function furnitureSVG(m) {
    let out = '';
    const items = m.furniture.filter(o => o.t === 'rug').concat(m.furniture.filter(o => o.t !== 'rug'));
    items.forEach(o => {
      switch (o.t) {
        case 'bench': {
          const p = benchParts(o);
          p.desks.forEach(d => { out += rect(d.x, d.y + 0.02, d.w, d.d - 0.04, 'fu'); });
          out += line(o.x + o.w / 2, o.y, o.x + o.w / 2, o.y + o.d, 'fu-div');
          p.desks.forEach(d => {
            const mx = d.side === 'O' ? d.x + d.w - 0.12 : d.x + 0.12;
            out += line(mx, d.y + d.d * 0.22, mx, d.y + d.d * 0.78, 'fu-mon');
          });
          p.chairs.forEach(c => { out += chairSym(c); });
          if (o.label) {
            out += text(o.x + 0.26, o.y + o.d / 2, o.label[0], 'pl-tiny', `transform="rotate(-90 ${r3(o.x + 0.26)} ${r3(o.y + o.d / 2)})" text-anchor="middle"`);
            out += text(o.x + o.w - 0.2, o.y + o.d / 2, o.label[1], 'pl-tiny', `transform="rotate(-90 ${r3(o.x + o.w - 0.2)} ${r3(o.y + o.d / 2)})" text-anchor="middle"`);
          }
          break;
        }
        case 'desk': {
          out += rect(o.x, o.y, o.w, o.d, o.exec ? 'fu-wood' : 'fu');
          const n = o.mon || 0;
          // monitores junto à borda oposta ao usuário
          const far = { 0: 'n', 180: 's', 90: 'e', 270: 'w' }[o.r || 0];
          for (let i = 0; i < n; i++) {
            if (far === 'n' || far === 's') {
              const span = o.w * 0.7, mw = span / n, x0 = o.x + (o.w - span) / 2 + i * mw;
              const yy = far === 'n' ? o.y + 0.12 : o.y + o.d - 0.12;
              out += line(x0 + 0.05, yy, x0 + mw - 0.05, yy, 'fu-mon');
            } else {
              const span = o.d * 0.5, mw = span / n, y0 = o.y + (o.d - span) / 2 + i * mw;
              const xx = far === 'e' ? o.x + o.w - 0.12 : o.x + 0.12;
              out += line(xx, y0 + 0.05, xx, y0 + mw - 0.05, 'fu-mon');
            }
          }
          break;
        }
        case 'chair': out += chairSym(o); break;
        case 'armchair': out += armchairSym(o); break;
        case 'stool': out += `<circle cx="${o.x}" cy="${o.y}" r="0.19" class="fu"/>`; break;
        case 'sidetable': out += `<circle cx="${o.x}" cy="${o.y}" r="${o.s / 2}" class="fu-wood"/>`; break;
        case 'roundtable': out += `<circle cx="${o.x}" cy="${o.y}" r="${o.s / 2}" class="fu-wood"/>`; break;
        case 'table': case 'coffeetable': case 'hightable': case 'barcounter':
          out += rect(o.x, o.y, o.w, o.d, 'fu-wood', o.t === 'table' ? 'rx="0.08"' : ''); break;
        case 'rug': out += rect(o.x, o.y, o.w, o.d, 'pl-rug'); break;
        case 'sofa': {
          out += rect(o.x, o.y, o.w, o.d, 'fu-soft', 'rx="0.1"');
          // encosto do lado leste (olha para oeste)
          out += rect(o.x + o.w - 0.2, o.y, 0.2, o.d, 'fu-d', 'rx="0.06"');
          out += rect(o.x, o.y, o.w, 0.16, 'fu-d', 'rx="0.06"') + rect(o.x, o.y + o.d - 0.16, o.w, 0.16, 'fu-d', 'rx="0.06"');
          break;
        }
        case 'cabinet': case 'lockers': case 'shelf': {
          out += rect(o.x, o.y, o.w, o.d, (o.mat || '').startsWith('oak') ? 'fu-wood' : 'fu');
          if (o.t !== 'shelf') out += line(o.x, o.y, o.x + o.w, o.y + o.d, 'fu-thin') + line(o.x + o.w, o.y, o.x, o.y + o.d, 'fu-thin');
          else for (let k = 1; k < 4; k++) { const yy = o.y + o.d * k / 4; if (o.d > o.w) out += line(o.x, yy, o.x + o.w, yy, 'fu-thin'); else { const xx = o.x + o.w * k / 4; out += line(xx, o.y, xx, o.y + o.d, 'fu-thin'); } }
          break;
        }
        case 'credenza': out += rect(o.x, o.y, o.w, o.d, 'fu-wood') + line(o.x + 0.04, o.y + o.d / 2, o.x + o.w - 0.04, o.y + o.d / 2, 'fu-thin'); break;
        case 'balcao':
          out += rect(o.x, o.y, o.w, o.d, 'fu-concrete') + rect(o.x + 0.06, o.y + 0.06, o.w - 0.12, 0.2, 'fu-wood');
          out += rect(o.x + o.w - 0.6, o.y, 0.6, o.d, 'fu-thin-fill');
          break;
        case 'monitor': break;
        case 'planter':
          out += rect(o.x, o.y, o.w, o.d, 'fu-concrete');
          for (let yy = o.y + 0.3; yy < o.y + o.d; yy += 0.45) out += plantSym({ x: o.x + o.w / 2, y: yy, s: 0.34 });
          break;
        case 'plant': out += plantSym(o); break;
        case 'booth':
          out += rect(o.x, o.y, o.w, o.d, 'fu-booth') + rect(o.x + 0.08, o.y + 0.08, o.w - 0.16, o.d - 0.16, 'fu');
          out += line(o.x, o.y + 0.25, o.x, o.y + o.d - 0.25, 'pl-glassline');
          out += rect(o.x + 0.45, o.y + 0.2, 0.55, 0.4, 'fu-wood');
          break;
        case 'whiteboard': out += rect(o.x, o.y, o.w, 0.08, 'fu-d'); break;
        case 'panel': out += rect(o.x, o.y, o.w, o.d, o.mat === 'ripado' || o.mat === 'oakPanel' ? 'fu-wood' : 'fu-concrete') + rect(o.x, o.y, o.w, o.d, 'fu-thin'); break;
        case 'totem': out += rect(o.x, o.y, o.w, o.d, 'fu-d'); break;
        case 'fridge': out += rect(o.x, o.y, o.w, o.d, 'fu') + text(o.x + o.w / 2, o.y + o.d / 2 + 0.06, 'GEL', 'pl-tiny', 'text-anchor="middle"'); break;
        case 'tower': out += rect(o.x, o.y, o.w, o.d, 'fu') + text(o.x + o.w / 2, o.y + o.d / 2 + 0.06, 'MO', 'pl-tiny', 'text-anchor="middle"'); break;
        case 'counter': {
          out += rect(o.x, o.y, o.w, o.d, 'fu-concrete');
          if (o.sink) out += rect(o.sink, o.y + 0.1, 0.55, 0.4, 'fu', 'rx="0.06"');
          if (o.coffee) out += `<circle cx="${o.coffee}" cy="${o.y + 0.3}" r="0.13" class="fu-d"/>`;
          if (o.frigobar) out += rect(o.x + 0.03, o.y + 0.5, o.w - 0.06, 0.55, 'fu') + text(o.x + o.w / 2, o.y + 0.84, 'FB', 'pl-tiny', 'text-anchor="middle"');
          break;
        }
        case 'printer': out += rect(o.x, o.y, o.w, o.d, 'fu') + text(o.x + o.w / 2, o.y + o.d / 2 + 0.06, 'IMP', 'pl-tiny', 'text-anchor="middle"'); break;
        case 'rack': out += rect(o.x, o.y, o.w, o.d, 'fu-d') + text(o.x + o.w / 2, o.y + o.d / 2 + 0.06, 'RACK', 'pl-tiny pl-inv', 'text-anchor="middle"'); break;
        case 'basin': out += `<g transform="translate(${o.x} ${o.y}) rotate(${(o.r || 0) - 90})"><path d="M -0.25 -0.2 L 0.25 -0.2 L 0.25 0.05 Q 0 0.3 -0.25 0.05 Z" class="fu"/><circle cx="0" cy="-0.02" r="0.04" class="fu-d"/></g>`; break;
        case 'toilet': out += `<g transform="translate(${o.x} ${o.y}) rotate(${(o.r || 0) - 180})"><rect x="-0.22" y="0.22" width="0.44" height="0.18" rx="0.04" class="fu"/><ellipse cx="0" cy="-0.02" rx="0.19" ry="0.27" class="fu"/></g>`; break;
        case 'urinal': out += `<g transform="translate(${o.x} ${o.y}) rotate(${(o.r || 0) - 90})"><path d="M -0.18 -0.14 L 0.18 -0.14 Q 0.16 0.16 0 0.18 Q -0.16 0.16 -0.18 -0.14 Z" class="fu"/></g>`; break;
        case 'shower':
          out += rect(o.x, o.y, o.w, o.d, 'pl-wet') + line(o.x, o.y, o.x + o.w, o.y + o.d, 'fu-thin') + line(o.x + o.w, o.y, o.x, o.y + o.d, 'fu-thin');
          out += line(o.x, o.y, o.x + o.w * 0.6, o.y, 'pl-glassline');
          break;
        case 'pebolim': {
          out += rect(o.x, o.y, o.w, o.d, 'fu-wood');
          for (let k = 1; k <= 8; k++) { const yy = o.y + o.d * k / 9; out += line(o.x - 0.18, yy, o.x + o.w + 0.18, yy, 'fu-thin'); }
          break;
        }
      }
    });
    return out;
  }

  function doorsSVG(m) {
    let out = '';
    m.walls.forEach(w => w.open.forEach(o => {
      if (o.kind === 'open') return;
      const width = o.b - o.a, s = o.into || 1;
      const cls = o.kind === 'glassdoor' ? 'pl-door-glass' : (o.kind === 'hidden' ? 'pl-door-hidden' : 'pl-door');
      const leaf = (hingeS, len, dir) => {
        // hingeS: posição da dobradiça ao longo do eixo; dir: +1 a folha fecha em direção a +s
        let hx, hy, lx, ly, ex, ey;
        if (w.axis === 'h') { hx = hingeS; hy = w.c; lx = hingeS; ly = w.c + s * len; ex = hingeS + dir * len; ey = w.c; }
        else { hx = w.c; hy = hingeS; lx = w.c + s * len; ly = hingeS; ex = w.c; ey = hingeS + dir * len; }
        const sweep = (w.axis === 'h') ? ((s > 0) === (dir > 0) ? 0 : 1) : ((s > 0) === (dir > 0) ? 1 : 0);
        return line(hx, hy, lx, ly, cls) + `<path d="M ${r3(lx)} ${r3(ly)} A ${r3(len)} ${r3(len)} 0 0 ${sweep} ${r3(ex)} ${r3(ey)}" class="pl-arc"/>`;
      };
      if (o.kind === 'double') { out += leaf(o.a, width / 2, 1) + leaf(o.b, width / 2, -1); }
      else if (o.kind === 'slide') {
        const off = (w.t / 2 + 0.04) * s;
        if (w.axis === 'h') out += rect(o.a - 0.05, w.c + off - (s > 0 ? 0 : 0.04), width + 0.1, 0.04, 'pl-slide');
        else out += rect(w.c + off - (s > 0 ? 0 : 0.04), o.a - 0.05, 0.04, width + 0.1, 'pl-slide');
      } else {
        const hinge = o.hinge === 'end' ? o.b : o.a, dir = o.hinge === 'end' ? -1 : 1;
        out += leaf(hinge, width, dir);
      }
    }));
    return out;
  }

  function wallsSVG(m) {
    let out = '';
    m.walls.forEach(w => {
      const segs = wallSegments(w);
      segs.forEach(([s0, s1]) => {
        const R = wallRect(w, s0, s1, w.t);
        if (w.type === 'glass' || w.type === 'fluted') {
          out += rect(R.x, R.y, R.w, R.h, w.base ? 'pl-glass pl-glass-base' : 'pl-glass');
          if (w.axis === 'h') out += line(s0, w.c, s1, w.c, 'pl-glassline'); else out += line(w.c, s0, w.c, s1, 'pl-glassline');
        } else if (w.type === 'facade') {
          out += rect(R.x, R.y, R.w, R.h, 'pl-facade');
          for (let k = Math.ceil(s0 / 1.25) * 1.25; k <= s1 + 1e-6; k += 1.25) {
            if (w.axis === 'h') out += rect(k - 0.03, R.y - 0.04, 0.06, R.h + 0.08, 'pl-mullion'); else out += rect(R.x - 0.04, k - 0.03, R.w + 0.08, 0.06, 'pl-mullion');
          }
        } else {
          out += rect(R.x, R.y, R.w, R.h, 'pl-wall pl-' + w.type);
        }
      });
      // batentes das portas
      w.open.forEach(o => {
        if (o.kind === 'open' || w.type === 'glass') return;
        [o.a, o.b].forEach(s => { const R = wallRect(w, s - 0.025, s + 0.025, w.t + 0.02); out += rect(R.x, R.y, R.w, R.h, 'pl-jamb'); });
      });
    });
    m.columns.forEach(c => { out += rect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s, 'pl-col'); });
    return out;
  }

  function dimChain(stops, at, axis, side) {
    // axis 'x': cotas horizontais numa linha y=at ; axis 'y': verticais numa linha x=at
    let out = '';
    const ext = 0.18 * side;
    if (axis === 'x') {
      out += line(stops[0], at, stops[stops.length - 1], at, 'pl-dim');
      stops.forEach(s => { out += line(s, at - ext * 1.6, s, at + ext * 0.6, 'pl-dim') + line(s - 0.1, at + 0.1, s + 0.1, at - 0.1, 'pl-tick'); });
      for (let i = 0; i < stops.length - 1; i++) {
        const mid = (stops[i] + stops[i + 1]) / 2;
        out += text(mid, at - 0.12, f2(stops[i + 1] - stops[i]), 'pl-dimtxt', 'text-anchor="middle"');
      }
    } else {
      out += line(at, stops[0], at, stops[stops.length - 1], 'pl-dim');
      stops.forEach(s => { out += line(at - ext * 1.6, s, at + ext * 0.6, s, 'pl-dim') + line(at - 0.1, s + 0.1, at + 0.1, s - 0.1, 'pl-tick'); });
      for (let i = 0; i < stops.length - 1; i++) {
        const mid = (stops[i] + stops[i + 1]) / 2;
        out += text(at - 0.12, mid, f2(stops[i + 1] - stops[i]), 'pl-dimtxt', `text-anchor="middle" transform="rotate(-90 ${r3(at - 0.12)} ${r3(mid)})"`);
      }
    }
    return out;
  }

  function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  const ESCAPE = [
    { from: 'Financeiro', pts: [[18.2, 0.5], [13.1, 0.7], [12.15, 0.7], [11.95, 1.2], [11.95, 5.85], [10.5, 6.4], [10.5, 8.15], [5.6, 8.15], [4.75, 9.7], [3.0, 11.6], [3.0, 13.2]] },
    { from: 'Jogos', pts: [[18.2, 9.45], [15.85, 9.55], [15.85, 8.15], [5.6, 8.15], [4.75, 9.7], [3.0, 11.6], [3.0, 13.2]] },
  ];
  ESCAPE.forEach(e => { e.len = pathLen(e.pts); });

  const STYLE = `
  .pl-bg{fill:var(--pl-paper,#f4f4f1)}
  .pl-f-concrete{fill:url(#pat-concrete)} .pl-f-oak{fill:url(#pat-oak)} .pl-f-carpet{fill:url(#pat-carpet)} .pl-f-porcelain{fill:url(#pat-porcelain)}
  .pl-wall{fill:var(--pl-wall,#1d2124)} .pl-drywall{fill:var(--pl-wall2,#4a5154)} .pl-ext{fill:var(--pl-wall,#1d2124)}
  .pl-glass{fill:var(--pl-glassfill,#cfe2e2);stroke:var(--pl-wall,#1d2124);stroke-width:0.012}
  .pl-glassline{stroke:var(--pl-petrol,#1f5e63);stroke-width:0.02;fill:none}
  .pl-glass-base{fill:var(--pl-wall2,#4a5154)}
  .pl-facade{fill:var(--pl-glassfill,#cfe2e2);stroke:var(--pl-wall,#1d2124);stroke-width:0.015}
  .pl-mullion,.pl-col{fill:var(--pl-wall,#1d2124)} .pl-jamb{fill:var(--pl-wall,#1d2124)}
  .pl-door{stroke:var(--pl-ink,#1d2124);stroke-width:0.03;fill:none} .pl-door-glass{stroke:var(--pl-petrol,#1f5e63);stroke-width:0.03;fill:none}
  .pl-door-hidden{stroke:var(--pl-ink,#1d2124);stroke-width:0.03;stroke-dasharray:0.08 0.06;fill:none}
  .pl-arc{stroke:var(--pl-ink2,#7a8285);stroke-width:0.012;fill:none;stroke-dasharray:0.06 0.05}
  .pl-slide{fill:var(--pl-ink,#1d2124)}
  .fu{fill:var(--pl-fu,#ffffff);stroke:var(--pl-fustroke,#6b7376);stroke-width:0.014}
  .fu-wood{fill:var(--pl-wood,#dcc29f);stroke:var(--pl-fustroke,#6b7376);stroke-width:0.014}
  .fu-soft{fill:var(--pl-soft,#b9c4c4);stroke:var(--pl-fustroke,#6b7376);stroke-width:0.014}
  .fu-concrete{fill:var(--pl-conc,#c9c6bf);stroke:var(--pl-fustroke,#6b7376);stroke-width:0.014}
  .fu-booth{fill:var(--pl-petrol,#1f5e63)}
  .fu-d{fill:var(--pl-fudark,#59615f)} .fu-thin{stroke:var(--pl-fustroke,#6b7376);stroke-width:0.01;fill:none}
  .fu-thin-fill{fill:none;stroke:var(--pl-fustroke,#6b7376);stroke-width:0.01;stroke-dasharray:0.05 0.04}
  .fu-div{stroke:var(--pl-petrol,#1f5e63);stroke-width:0.04}
  .fu-mon{stroke:var(--pl-ink,#1d2124);stroke-width:0.045;stroke-linecap:round}
  .pl-rug{fill:var(--pl-rug,#d9d4cb);stroke:var(--pl-fustroke,#6b7376);stroke-width:0.01;stroke-dasharray:0.06 0.04}
  .pl-wet{fill:var(--pl-glassfill,#cfe2e2);stroke:var(--pl-fustroke,#6b7376);stroke-width:0.014}
  .pl-plant{fill:var(--pl-plantbg,#cfdccb)} .pl-leaf{fill:var(--pl-leaf,#5e7d56);opacity:.85}
  .pl-room-n{font:600 0.2px 'IBM Plex Mono',ui-monospace,monospace;fill:var(--pl-petrol,#1f5e63);letter-spacing:0.02px}
  .pl-room{font:700 0.27px 'Archivo','Arial Narrow',Arial,sans-serif;fill:var(--pl-ink,#1d2124);letter-spacing:0.035px}
  .pl-room-s{font:700 0.2px 'Archivo','Arial Narrow',Arial,sans-serif;fill:var(--pl-ink,#1d2124);letter-spacing:0.02px}
  .pl-area{font:400 0.19px 'IBM Plex Mono',ui-monospace,monospace;fill:var(--pl-ink2,#5c6466)}
  .pl-labelbg{fill:var(--pl-paper,#f4f4f1);opacity:.82}
  .pl-tiny{font:500 0.14px 'IBM Plex Mono',ui-monospace,monospace;fill:var(--pl-ink2,#5c6466);letter-spacing:0.01px}
  .pl-inv{fill:#ffffff}
  .pl-note{font:italic 400 0.17px 'IBM Plex Sans',Arial,sans-serif;fill:var(--pl-petrol,#1f5e63)}
  .pl-note-o{font:italic 400 0.17px 'IBM Plex Sans',Arial,sans-serif;fill:var(--pl-orange,#c8561a)}
  .pl-dim{stroke:var(--pl-ink2,#5c6466);stroke-width:0.012;fill:none} .pl-tick{stroke:var(--pl-ink,#1d2124);stroke-width:0.03}
  .pl-dimtxt{font:500 0.2px 'IBM Plex Mono',ui-monospace,monospace;fill:var(--pl-ink,#1d2124)}
  .pl-axis{stroke:var(--pl-ink2,#5c6466);stroke-width:0.012;stroke-dasharray:0.3 0.08 0.04 0.08;fill:none}
  .pl-bubble{fill:var(--pl-paper,#f4f4f1);stroke:var(--pl-ink,#1d2124);stroke-width:0.02}
  .pl-bubtxt{font:600 0.26px 'IBM Plex Mono',ui-monospace,monospace;fill:var(--pl-ink,#1d2124)}
  .pl-brand{stroke:var(--pl-petrol,#1f5e63);stroke-width:0.07;stroke-linecap:butt}
  .pl-screen{stroke:var(--pl-orange,#c8561a);stroke-width:0.07}
  .pl-regua{stroke:var(--pl-ink,#1d2124);stroke-width:0.025} .pl-regua-t{stroke:var(--pl-ink,#1d2124);stroke-width:0.015}
  .pl-escape{stroke:#1e8a4c;stroke-width:0.06;fill:none;stroke-dasharray:0.22 0.1;stroke-linecap:round}
  .pl-escape-t{font:600 0.19px 'IBM Plex Mono',ui-monospace,monospace;fill:#1e8a4c}
  .pl-n-quiet{fill:#1f5e63;opacity:.2} .pl-n-medium{fill:#9aa3a5;opacity:.12} .pl-n-loud{fill:#d9601f;opacity:.26} .pl-n-buffer{fill:url(#pat-buffer)}
  .pl-hall{fill:var(--pl-hall,#e4e4e0)}
  .pl-title{font:700 0.34px 'Archivo',Arial,sans-serif;fill:var(--pl-ink,#1d2124);letter-spacing:0.08px}
  .pl-sub{font:400 0.2px 'IBM Plex Mono',ui-monospace,monospace;fill:var(--pl-ink2,#5c6466)}
  `;

  const DEFS = `
  <pattern id="pat-concrete" patternUnits="userSpaceOnUse" width="1.2" height="1.2">
    <rect width="1.2" height="1.2" fill="var(--pl-concrete,#e5e3de)"/>
    <circle cx="0.21" cy="0.33" r="0.012" fill="#b9b5ad"/><circle cx="0.83" cy="0.15" r="0.009" fill="#b9b5ad"/><circle cx="0.57" cy="0.91" r="0.011" fill="#b9b5ad"/><circle cx="1.02" cy="0.66" r="0.008" fill="#b9b5ad"/><circle cx="0.36" cy="0.74" r="0.007" fill="#c8c4bc"/>
  </pattern>
  <pattern id="pat-oak" patternUnits="userSpaceOnUse" width="1.8" height="0.2">
    <rect width="1.8" height="0.2" fill="var(--pl-oak,#ead9bf)"/><line x1="0" y1="0.2" x2="1.8" y2="0.2" stroke="#cdb593" stroke-width="0.01"/><line x1="1.1" y1="0" x2="1.1" y2="0.2" stroke="#cdb593" stroke-width="0.008"/>
  </pattern>
  <pattern id="pat-carpet" patternUnits="userSpaceOnUse" width="0.5" height="0.5">
    <rect width="0.5" height="0.5" fill="var(--pl-carpet,#cfd3d4)"/><line x1="0" y1="0.5" x2="0.5" y2="0.5" stroke="#bfc4c5" stroke-width="0.006"/><line x1="0.5" y1="0" x2="0.5" y2="0.5" stroke="#bfc4c5" stroke-width="0.006"/>
  </pattern>
  <pattern id="pat-porcelain" patternUnits="userSpaceOnUse" width="0.6" height="1.2">
    <rect width="0.6" height="1.2" fill="var(--pl-porc,#dfe1e0)"/><path d="M0 1.2 H0.6 M0.6 0 V1.2" stroke="#c4c8c7" stroke-width="0.008"/>
  </pattern>
  <pattern id="pat-buffer" patternUnits="userSpaceOnUse" width="0.25" height="0.25" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="0.25" stroke="#7a8285" stroke-width="0.03" opacity=".35"/>
  </pattern>`;

  function svg(m, opt = {}) {
    const L = Object.assign({ furniture: true, dims: true, axes: true, notes: true, noise: false, escape: false, labels: true }, opt.layers || {});
    const W = m.plate.w;
    const vb = [-3.1, -3.1, W + 6.4, 19.0];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" ${opt.id ? `id="${opt.id}"` : ''} role="img" aria-label="Planta baixa humanizada da sede do Grupo VEX">`;
    s += `<style>${STYLE}</style><defs>${DEFS}</defs>`;
    s += rect(vb[0], vb[1], vb[2], vb[3], 'pl-bg');
    // hall do edifício (fora da unidade)
    s += rect(-0.2, 13.2, W + 0.3, 0.7, 'pl-hall');
    // pisos
    s += '<g id="lyr-floors">';
    m.rooms.forEach(r => { s += rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 'pl-f-' + r.floor); });
    // régua VEX no piso da galeria: linha de cota com marcas a cada metro
    s += line(5.8, 8.15, W - 0.1, 8.15, 'pl-regua');
    for (let x = 6; x <= W - 0.1; x += 1) s += line(x, 8.15 - (x % 5 === 0 ? 0.14 : 0.07), x, 8.15 + (x % 5 === 0 ? 0.14 : 0.07), 'pl-regua-t');
    s += '</g>';
    if (L.noise) {
      s += '<g id="lyr-noise">';
      m.rooms.forEach(r => { s += rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 'pl-n-' + m.noise[r.id]); });
      s += '</g>';
    }
    if (L.furniture) s += `<g id="lyr-furniture">${furnitureSVG(m)}</g>`;
    s += `<g id="lyr-walls">${wallsSVG(m)}${doorsSVG(m)}</g>`;
    if (L.notes) {
      s += '<g id="lyr-notes">';
      // aplicações de marca (azul-petróleo) e telas (laranja)
      s += line(2.35, 7.67, 3.65, 7.67, 'pl-brand') + line(0.07, 8.2, 0.07, 12.55, 'pl-brand') + line(12.31, 1.62, 12.31, 5.32, 'pl-screen');
      s += line(4.6, 7.67, 5.22, 7.67, 'pl-screen') + line(10.29, 10.0, 10.29, 11.9, 'pl-screen');
      s += line(5.8, 8.78, 9.1, 8.78, 'pl-brand');
      s += text(3.0, 7.95, 'painel institucional · logo Grupo VEX', 'pl-note', 'text-anchor="middle"');
      s += text(0.62, 10.4, 'parede do ecossistema · 4 marcas', 'pl-note', 'text-anchor="middle" transform="rotate(-90 0.62 10.4)"');
      s += text(12.05, 3.47, 'painel central · 3×2 telas 55"', 'pl-note-o', 'text-anchor="middle" transform="rotate(90 12.05 3.47)"');
      s += text(7.4, 8.64, 'galeria de obras (quadros suspensos)', 'pl-note', 'text-anchor="middle"');
      s += text(4.9, 7.95, 'totem', 'pl-note-o', 'text-anchor="middle"');
      s += text(6.7, 8.0, 'acesso controlado', 'pl-tiny');
      s += text(W - 0.25, 8.36, 'régua VEX no piso', 'pl-tiny', 'text-anchor="end"');
      s += text(W / 2, -0.35, 'FACHADA NORTE · VIDRO DE CONTROLE SOLAR + ROLÔ SCREEN', 'pl-tiny', 'text-anchor="middle"');
      s += text(W + 0.42, 6.5, 'FACHADA LESTE · VIDRO', 'pl-tiny', 'text-anchor="middle" transform="rotate(90 ' + (W + 0.42) + ' 6.5)"');
      s += text(-0.42, 6.5, 'EMPENA CEGA', 'pl-tiny', 'text-anchor="middle" transform="rotate(-90 -0.42 6.5)"');
      s += text(W / 2 + 1.5, 13.68, 'HALL DO EDIFÍCIO · ELEVADORES / ESCADAS (FORA DA UNIDADE)', 'pl-tiny', 'text-anchor="middle"');
      s += `<path d="M 3.0 14.1 L 3.0 13.35 M 2.85 13.55 L 3.0 13.35 L 3.15 13.55" stroke="var(--pl-ink,#1d2124)" stroke-width="0.035" fill="none"/>`;
      s += text(3.0, 14.32, 'ENTRADA', 'pl-dimtxt', 'text-anchor="middle"');
      s += '</g>';
    }
    if (L.escape) {
      s += '<g id="lyr-escape">';
      ESCAPE.forEach(e => {
        s += `<polyline points="${e.pts.map(p => p.join(',')).join(' ')}" class="pl-escape"/>`;
        s += `<circle cx="${e.pts[0][0]}" cy="${e.pts[0][1]}" r="0.1" fill="#1e8a4c"/>`;
        s += text(e.pts[0][0] - 0.15, e.pts[0][1] + (e.from === 'Jogos' ? -0.2 : 0.42), `${e.from}: ${f2(e.len)} m`, 'pl-escape-t', 'text-anchor="end"');
      });
      s += '</g>';
    }
    if (L.labels) {
      s += '<g id="lyr-labels">';
      m.rooms.forEach(r => {
        const [x, y] = LABEL[r.id]; const small = SMALL[r.id];
        const nm = (r.short || r.name).toUpperCase();
        const name = r.id === 'operacoes' ? r.name.toUpperCase() : nm;
        const fs = small ? 0.2 : 0.27;
        const wEst = Math.max(name.length * fs * 0.66, 1.2) + 0.2;
        s += rect(x - wEst / 2, y - fs - 0.12, wEst, small ? 0.58 : 0.7, 'pl-labelbg', 'rx="0.06"');
        s += text(x, y - fs * 0.05, `${r.n}  ${name}`, small ? 'pl-room-s' : 'pl-room', 'text-anchor="middle"');
        s += text(x, y + (small ? 0.24 : 0.3), `${f2(r.area)} m²`, 'pl-area', 'text-anchor="middle"');
      });
      s += '</g>';
    }
    if (L.axes) {
      s += '<g id="lyr-axes">';
      m.axesX.forEach(a => { s += line(a.v, -2.45, a.v, 13.9, 'pl-axis') + `<circle cx="${a.v}" cy="-2.65" r="0.24" class="pl-bubble"/>` + text(a.v, -2.56, a.id, 'pl-bubtxt', 'text-anchor="middle"'); });
      m.axesY.forEach(a => { s += line(-2.45, a.v, W + 1.9, a.v, 'pl-axis') + `<circle cx="-2.65" cy="${a.v}" r="0.24" class="pl-bubble"/>` + text(-2.65, a.v + 0.09, a.id, 'pl-bubtxt', 'text-anchor="middle"'); });
      s += '</g>';
    }
    if (L.dims) {
      s += '<g id="lyr-dims">';
      s += dimChain([0, 5.6, 12.6, W], -1.05, 'x', 1) + dimChain([0, W], -1.7, 'x', 1);
      s += dimChain([0, 4.2, 7.4, 13], -1.05, 'y', 1) + dimChain([0, 13], -1.7, 'y', 1);
      s += dimChain([0, 5.6, 10.6, 11.8, 13.5, 15.2, W], 14.85, 'x', -1);
      s += dimChain([0, 3.6, 7.4, 8.9, 13], W + 1.15, 'y', -1);
      s += '</g>';
    }
    // norte, escala, título
    s += `<g transform="translate(${W + 1.75} -2.35)"><circle r="0.42" class="pl-bubble"/><path d="M0 -0.36 L0.15 0.2 L0 0.1 L-0.15 0.2 Z" fill="var(--pl-ink,#1d2124)"/><text y="0.75" class="pl-bubtxt" text-anchor="middle">N</text></g>`;
    s += `<g transform="translate(0 15.55)">`;
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]].forEach(([a, b], i) => { s += rect(a, 0, b - a, 0.12, '', `fill="${i % 2 ? 'var(--pl-paper,#f4f4f1)' : 'var(--pl-ink,#1d2124)'}" stroke="var(--pl-ink,#1d2124)" stroke-width="0.012"`); });
    [0, 1, 2, 5].forEach(v => { s += text(v, 0.45, v + (v === 5 ? ' m' : ''), 'pl-sub', 'text-anchor="middle"'); });
    s += text(6.0, 0.13, 'ESCALA GRÁFICA', 'pl-sub');
    s += '</g>';
    const area = m.rooms.reduce((a, r) => a + r.area, 0);
    s += text(W + 3.1, 15.72, 'SEDE GRUPO VEX · PLANTA BAIXA HUMANIZADA', 'pl-title', 'text-anchor="end"');
    s += text(W + 3.1, 16.05, 'estudo preliminar · ' + f2(area) + ' m² internos · rev. 01 · não é projeto executivo', 'pl-sub', 'text-anchor="end"');
    s += '</svg>';
    return s;
  }

  root.VEXPlan = { svg, benchParts, wallSegments, escape: ESCAPE };
})(typeof window !== 'undefined' ? window : globalThis);
