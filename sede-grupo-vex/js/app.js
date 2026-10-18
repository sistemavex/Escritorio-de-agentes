/* Monta a apresentação: logos, planta, quadro de áreas, amostras, perspectivas e visualizador 3D. */
(function () {
  const M = window.VEX_MODEL, L = window.VEX_LOGOS;
  const $ = (s, el = document) => el.querySelector(s);
  const f2 = (n) => n.toFixed(2).replace('.', ',');

  /* logos ---------------------------------------------------------------- */
  $('#cover-logo').src = L['grupo-vex'];
  const LOGO_INFO = [
    { k: 'grupo-vex', name: 'Grupo VEX', file: 'grupo-vex.png', colors: [['#0f0f0f', 'preto'], ['#285058', 'azul-petróleo']], note: 'Símbolo quadrado com o "V" em transparência. Marca principal do ecossistema.' },
    { k: 'sistema-vex', name: 'Sistema VEX', file: 'sistema-vex.png', colors: [['#0a0a0a', 'preto'], ['#1c6468', 'azul-petróleo']], note: 'Linha de apoio em corpo muito pequeno: só fica legível em placas a partir de ~0,8 m.' },
    { k: 'eap-goiania', name: 'EAP Goiânia', file: 'eap-goiania.png', colors: [['#1b2856', 'azul-marinho'], ['#dd9520', 'âmbar']], note: 'Única marca do grupo fora da família preto/petróleo; convive bem sobre branco.' },
    { k: 'vexor-engenharia', name: 'Vexor Engenharia', file: 'vexor-engenharia.png', colors: [['#404040', 'grafite'], ['#ff6400', 'laranja']], note: 'O laranja da Vexor é a referência para os detalhes em laranja queimado do projeto.' },
    { k: 'vex-view', name: 'VEX View', file: 'vex-view.png', colors: [['#0f0f0f', 'preto'], ['#005a60', 'azul-petróleo']], note: 'Moldura de câmera e linha de apoio finas: pedem fundo limpo e boa iluminação.' },
  ];
  $('#logo-grid').innerHTML = LOGO_INFO.map(i => `
    <article class="logo-card">
      <div class="plate"><img src="${L[i.k]}" alt="Logo oficial ${i.name}" width="500" height="500"></div>
      <h4>${i.name}</h4>
      <dl>
        <dt>Arquivo</dt><dd>${i.file} · PNG 500 × 500 · fundo transparente</dd>
        <dt>Cores medidas</dt><dd>${i.colors.map(([h, n]) => `<span class="sw" style="background:${h}"></span>${n} <span style="font-family:var(--f-mono);font-size:12px">${h}</span>`).join('<br>')}</dd>
        <dt>Observação</dt><dd>${i.note}</dd>
      </dl>
    </article>`).join('');

  /* planta --------------------------------------------------------------- */
  const LAYERS = ['furniture', 'dims', 'axes', 'notes', 'escape', 'noise'];
  function drawPlan() {
    const layers = {}; LAYERS.forEach(k => { layers[k] = $('#lyr-' + k).checked; });
    $('#plan').innerHTML = window.VEXPlan.svg(M, { layers, id: 'plan-svg' });
  }
  LAYERS.forEach(k => $('#lyr-' + k).addEventListener('change', drawPlan));
  drawPlan();

  /* quadro de áreas ------------------------------------------------------ */
  const PRI = { recepcao: 1, operacoes: 2, reuniao: 3, ceo: 4, planejamento: 5, financeiro: 6, juridico: 7, copa: 8, jogos: 9, wcf: 10, wcm: 10, apoio: 10, galeria: '—' };
  const total = M.rooms.reduce((a, r) => a + r.area, 0);
  const rows = M.rooms.slice().sort((a, b) => a.n.localeCompare(b.n)).map(r => `
    <tr><td><span class="code">${r.n}</span>${r.name}${r.sub ? ` <span style="color:var(--ink-2)">· ${r.sub}</span>` : ''}</td>
    <td class="n">${f2(r.area)}</td><td class="n">${(r.area / total * 100).toFixed(1).replace('.', ',')}%</td>
    <td>${r.cap || '—'}</td><td class="n">${PRI[r.id]}</td></tr>`).join('');
  $('#areas').innerHTML = `<thead><tr><th>Ambiente</th><th class="n">Área m²</th><th class="n">%</th><th>Capacidade</th><th class="n">Prioridade</th></tr></thead>
    <tbody>${rows}<tr class="total"><td>Total interno</td><td class="n">${f2(total)}</td><td class="n">100%</td><td>15 postos fixos</td><td></td></tr></tbody>`;

  /* amostras de material ------------------------------------------------- */
  const SW = [
    ['concreteFloor', 'Concreto polido', 'piso das áreas abertas, juntas a cada 2 m'],
    ['concretePanel', 'Placa cimentícia', '1,20 × 2,40 m com furos de fôrma; parede do ecossistema e painel de operações'],
    ['ripado', 'Ripado de carvalho', 'parede institucional, do piso à laje'],
    ['oakFloor', 'Carvalho natural', 'piso do CEO e do jurídico; tampos de decisão'],
    ['steel', 'Aço preto', 'esquadrias, batentes, estrutura de mobiliário e régua do piso'],
    ['felt', 'Feltro azul-petróleo', 'baffles, divisórias de bancada, cabine e painéis acústicos'],
    ['slab', 'Laje aparente grafite', 'teto das áreas abertas, com dutos e eletrocalhas à mostra'],
    ['orange', 'Laranja queimado', 'sinalização, supergráfico e detalhes pontuais'],
  ];
  function paintSwatches() {
    const urls = window.VEX3D && window.VEX3D.swatches ? window.VEX3D.swatches() : {};
    $('#swatches').innerHTML = SW.map(([k, t, d]) => `<div class="swatch"><div class="chipimg" style="background-image:url('${urls[k] || ''}')"></div><b>${t}</b><span>${d}</span></div>`).join('');
  }
  try { paintSwatches(); } catch (e) { console.warn(e); }

  /* certo e errado ------------------------------------------------------- */
  const g = L['grupo-vex'];
  $('#dodont').innerHTML = `
    <div class="dd"><div class="demo white"><span class="chip mark">usar</span><img src="${g}" alt="Logo sobre placa branca"></div><p>Sobre placa branca: o arquivo aparece como foi desenhado.</p></div>
    <div class="dd"><div class="demo lightbox"><span class="chip mark">usar</span><div class="lb"><img src="${g}" alt="Logo em caixa de luz branca"></div></div><p>Em parede escura, só dentro de caixa de luz branca com moldura.</p></div>
    <div class="dd"><div class="demo graphite"><span class="chip o mark">não usar</span><img src="${g}" alt="Logo direto sobre fundo grafite, com o V desaparecendo"></div><p>Direto sobre grafite ou concreto: o "V" transparente some.</p></div>
    <div class="dd"><div class="demo white"><span class="chip o mark">não usar</span><img class="stretched" src="${g}" alt="Logo esticada horizontalmente"></div><p>Esticar, comprimir ou recolorir. Proporção sempre 1:1.</p></div>`;

  /* perspectivas --------------------------------------------------------- */
  const figs = [...document.querySelectorAll('figure.render[data-view]')];
  const queue = [];
  let running = false;
  async function pump() {
    if (running) return; running = true;
    while (queue.length) {
      const fig = queue.shift(), id = fig.dataset.view, st = $('.status', fig), img = $('img', fig);
      st.hidden = false; st.textContent = 'renderizando perspectiva…';
      try {
        const url = await window.VEX3D.renderStill(id, 1600, 900);
        img.src = url; st.hidden = true;
      } catch (e) {
        console.error(e); st.textContent = 'Não foi possível renderizar aqui (WebGL indisponível). As imagens estão na pasta renders/ do repositório.';
      }
      await new Promise(r => setTimeout(r, 30));
    }
    running = false;
  }
  figs.forEach(fig => {
    const img = $('img', fig), st = $('.status', fig);
    img.addEventListener('load', () => { st.hidden = true; }, { once: true });
    img.addEventListener('error', () => { queue.push(fig); pump(); }, { once: true });
    img.src = `renders/${fig.dataset.view}.jpg`;
  });

  /* visualizador --------------------------------------------------------- */
  const poster = $('#viewer-poster');
  poster.style.backgroundImage = "linear-gradient(rgba(20,24,25,.35),rgba(20,24,25,.35)), url('renders/aerea.jpg')";
  const bar = $('#viewbar');
  bar.innerHTML = M.views.map(v => `<button type="button" data-v="${v.id}" aria-pressed="false">${v.title.replace('Maquete — ', 'Maquete ')}</button>`).join('');
  let viewer = null;
  async function startViewer(id) {
    if (!viewer) {
      poster.hidden = true;
      try {
        viewer = await window.VEX3D.mountViewer($('#viewer-canvas'), { onView: (v) => bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))) });
      } catch (e) { console.error(e); poster.hidden = false; $('#viewer-start').textContent = 'WebGL indisponível neste navegador'; return; }
    }
    if (id) viewer.go(id);
    $('#viewer-ceiling').checked = id ? M.views.find(v => v.id === id).ceiling : false;
  }
  $('#viewer-start').addEventListener('click', () => startViewer());
  bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) startViewer(b.dataset.v); });
  $('#viewer-ceiling').addEventListener('change', (e) => { if (viewer) viewer.setCeiling(e.target.checked); });

  /* exportação local (só com o servidor de desenvolvimento: node tools/serve.js) */
  window.VEXExport = async function (opts = {}) {
    const save = (path, body, type) => fetch('/save?path=' + encodeURIComponent(path), { method: 'POST', headers: { 'Content-Type': type }, body }).then(r => { if (!r.ok) throw new Error(path + ' ' + r.status); return path; });
    const done = [];
    if (opts.renders !== false) for (const v of M.views) {
      const url = await window.VEX3D.renderStill(v.id, 1920, 1080, 'image/jpeg');
      done.push(await save(`renders/${v.id}.jpg`, await (await fetch(url)).blob(), 'image/jpeg'));
    }
    if (opts.glb) done.push(await save('modelo/sede-grupo-vex.glb', await window.VEX3D.exportGLB(), 'model/gltf-binary'));
    return done;
  };
})();
