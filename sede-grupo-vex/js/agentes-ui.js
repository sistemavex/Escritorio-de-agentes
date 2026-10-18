/*
 * Painel do escritório de agentes 3D.
 * Usa a API do servidor do Escritório de Agentes (server.js): /api/equipe, /api/sistemas, /api/agentes/:id/chat,
 * /api/reuniao, /api/claude. A equipe é a mesma do escritório isométrico (data/equipe.json).
 * Sem servidor (ex.: GitHub Pages) a página roda em modo demonstração, com a equipe salva só no navegador.
 */
(function () {
  const M = window.VEX_MODEL;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DEMO_KEY = 'vex-agentes-demo-v1';
  const STATUS = { trabalhando: 'trabalhando', descanso: 'descansando', reuniao: 'em reunião', fora: 'fora' };

  /* ------------------------------------------------------------ aparência (compatível com o escritório isométrico) */
  const SKIN = ['#f7d7bd', '#f0c29b', '#e0a878', '#c9854f', '#a2643b', '#7a4a2c', '#5a3620'];
  const HAIR_C = ['#140f0c', '#241a13', '#3d2a1a', '#6b4423', '#a8702f', '#d9b56a', '#8e8e93'];
  const HAIR_S = ['curto', 'fade', 'ondulado', 'cacheado', 'longo', 'coque', 'raspado'];
  const SHIRT = ['#1f5e63', '#2b3d44', '#e9edf8', '#c8561a', '#334155', '#2f8f94', '#1b2856', '#5b6b70'];
  const PANTS = ['#26304a', '#1b2030', '#3b3f52', '#4b5563', '#1e293b'];
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }
  const rnd = (a, s) => a[Math.abs(hash(s)) % a.length];
  function makeLook(seed, hints = {}) {
    const h = Math.abs(hash(seed));
    return Object.assign({ skin: rnd(SKIN, seed + 'sk'), hair: rnd(HAIR_C, seed + 'hc'), style: rnd(HAIR_S, seed + 'hs'), shirt: rnd(SHIRT, seed + 'sh'),
      pants: rnd(PANTS, seed + 'pt'), shoes: (h % 3) ? '#15181f' : '#e9edf8', glasses: (h % 5 === 0) ? 'retangular' : null,
      beard: (h % 4 === 0) ? 'cavanhaque' : null, tattoo: false, cap: false, uniforme: false }, hints);
  }

  /* ------------------------------------------------------------ vagas sugeridas para o Grupo VEX */
  const CATALOG = [
    { key: 'vex-controller', name: 'Otto', role: 'Controller de Obras', emoji: '🏗️', desc: 'Acompanha avanço físico, RDOs e restrições de cada obra e avisa o que saiu do plano.' },
    { key: 'vex-planejamento', name: 'Paula', role: 'Planejamento & Cronograma', emoji: '📅', desc: 'Mantém cronogramas, caminho crítico e o lookahead de seis semanas em dia.' },
    { key: 'vex-suprimentos', name: 'Sérgio', role: 'Suprimentos & Compras', emoji: '📦', desc: 'Cota, acompanha pedidos e aponta material com risco de faltar na obra.' },
    { key: 'vex-rdo', name: 'Lia', role: 'Diário de Obra (RDO)', emoji: '📋', desc: 'Cobra e organiza os RDOs de cada canteiro e resume o dia.' },
    { key: 'vex-qualidade', name: 'Caio', role: 'Qualidade & Segurança', emoji: '⛑️', desc: 'Checklists, não conformidades e prazos de correção.' },
    { key: 'vex-financeiro', name: 'Rita', role: 'Financeiro', emoji: '🧾', desc: 'Fluxo de caixa, medições e contas a pagar e a receber por obra.' },
    { key: 'vex-juridico', name: 'Júlio', role: 'Contratos & Jurídico', emoji: '⚖️', desc: 'Prazos contratuais, aditivos e pendências jurídicas.' },
    { key: 'vex-comercial', name: 'Marta', role: 'Comercial & Propostas', emoji: '📈', desc: 'Orçamentos, propostas e funil de novos clientes.' },
    { key: 'vex-marketing', name: 'Nina', role: 'Marketing & Conteúdo', emoji: '📱', desc: 'Calendário de redes, cases de obra e materiais da marca.' },
    { key: 'vex-view', name: 'Vítor', role: 'VEX View · Imagens aéreas', emoji: '🛰️', desc: 'Organiza voos de drone, imagens e relatórios visuais por obra.' },
    { key: 'vex-bi', name: 'Dora', role: 'Indicadores & BI', emoji: '📊', desc: 'Junta os números dos outros agentes e mostra o que mudou na semana.' },
  ];

  /* ------------------------------------------------------------ estado */
  let live = false, team = [], sistemas = [], claude = null, selected = null, world = null, viewer = null, reuniao = null, tab = 'equipe';
  const sys = (id) => sistemas.find(s => s.id === id) || null;
  const agent = (id) => team.find(a => a.id === id) || null;
  const donoNome = () => (window.ESCRITORIO && window.ESCRITORIO.dono && window.ESCRITORIO.dono !== 'Você') ? window.ESCRITORIO.dono : 'Thiago Siqueira';

  function boss() {
    return { id: 'boss-1', name: donoNome(), role: 'CEO · Grupo VEX', emoji: '⭐', boss: true, dept: 'diretoria', slotId: 'DIR-1', status: 'trabalhando', locked: true,
      source: 'Diretoria', sistema: null, brief: 'Quem manda aqui. Sempre em serviço.',
      look: { skin: '#d9a17a', hair: '#2a1d14', style: 'curto', shirt: '#334155', pants: '#1e293b', shoes: '#15181f', glasses: null, beard: null, tattoo: false, cap: false, uniforme: false } };
  }
  function fromCatalog(c, extra = {}) {
    return Object.assign({ id: 'ag-' + c.key, key: c.key, name: c.name, role: c.role, emoji: c.emoji, system: null, sistema: null, path: null, brief: c.desc,
      dept: 'servico', slotId: null, status: 'trabalhando', boss: false, locked: false, look: makeLook(c.key) }, extra);
  }

  /* ------------------------------------------------------------ persistência */
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (live) fetch('/api/equipe', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team, v: 1 }) })
        .then(r => r.json()).then(d => { if (!d.ok) toast('Não salvei a equipe: ' + (d.motivo || 'erro')); }).catch(() => toast('Servidor fora do ar: a equipe não foi salva.'));
      else try { localStorage.setItem(DEMO_KEY, JSON.stringify({ team })); } catch (e) { /* navegador sem storage */ }
    }, 250);
  }
  async function api(path, opts) {
    const r = await fetch(path, opts); const t = await r.text();
    try { return JSON.parse(t); } catch (e) { return { ok: false, motivo: 'resposta inesperada do servidor' }; }
  }
  const post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  async function refreshSistemas() {
    if (!live) return;
    try { const d = await api('/api/sistemas'); if (Array.isArray(d)) sistemas = d; } catch (e) { /* mantém o último */ }
  }

  /* ------------------------------------------------------------ utilidades de tela */
  let toastT = null;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 4200); }
  const dlg = $('#dlg');
  let onDlgClose = null;
  function openDialog(title, html, onClose) { $('#dlg-title').textContent = title; $('#dlg-body').innerHTML = html; onDlgClose = onClose || null; if (!dlg.open) dlg.showModal(); return $('#dlg-body'); }
  function closeDialog() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => { if (onDlgClose) { const f = onDlgClose; onDlgClose = null; f(); } });
  $('#dlg-close').addEventListener('click', closeDialog);
  const sysPill = (s) => s ? `<span class="pill sys-${(s.estado || '').replace(/ /g, '-')}">${esc(s.estado === 'web' ? 'site' : s.estado)}</span>` : '<span class="pill" style="color:#7b8687">sem sistema</span>';
  const statusPill = (a) => `<span class="pill st-${a.status}">${STATUS[a.status] || a.status}</span>`;
  const demoNote = '<p class="notice">Modo demonstração: este link não está ligado ao seu computador. Para ligar sistemas, conversar com o Claude Code e reunir os agentes, abra pelo servidor do escritório (<b>npm start</b> e depois <b>http://localhost:4321/sede</b>).</p>';

  /* ------------------------------------------------------------ ações de equipe */
  function setStatus(a, st) { a.status = st; save(); world.sync(team); render(); }
  function setAll(st) { team.forEach(a => { if (!a.boss || st !== 'descanso') a.status = st; }); save(); world.sync(team); render(); }
  function hire(c, extra) {
    if (team.some(a => a.key === c.key)) return toast(c.name + ' já está na equipe.');
    const a = fromCatalog(c, extra); team.push(a); save(); world.sync(team, { walkIn: true }); select(a.id); toast(`${a.name} contratado. Está indo para a mesa.`);
    return a;
  }
  function fire(a) {
    if (a.locked) return;
    team = team.filter(x => x.id !== a.id); if (selected === a.id) selected = null; save(); world.sync(team); render(); toast(a.name + ' saiu da equipe.');
  }
  function select(id) {
    selected = id; world.setSelected(id); if (id) world.focusAgent(id);
    switchTab('equipe'); render();
  }

  /* ------------------------------------------------------------ cadastro (agente + sistema) */
  function cadastroForm(a) {
    const opts = sistemas.map(s => `<option value="${esc(s.id)}">${esc(s.nome)} · ${esc(s.tipo === 'web' ? 'site' : 'local')}</option>`).join('');
    const body = openDialog(a ? 'Ligar um sistema a ' + a.name : 'Cadastrar agente', `
      ${live ? '' : demoNote}
      <form id="f-cad" class="card" style="background:none;border:0;padding:0">
        ${a ? '' : `<div class="grid2"><div class="field"><label for="f-nome">Nome</label><input id="f-nome" required maxlength="40" placeholder="Ex.: Otto"></div>
        <div class="field"><label for="f-emoji">Emoji</label><input id="f-emoji" maxlength="4" value="🤖"></div></div>
        <div class="field"><label for="f-funcao">Função</label><input id="f-funcao" required maxlength="60" placeholder="Ex.: Controller de Obras"></div>
        <div class="field"><label for="f-desc">O que ele faz</label><textarea id="f-desc" maxlength="300" placeholder="Uma ou duas frases"></textarea></div>`}
        <div class="field"><label for="f-tipo">Sistema que ele opera</label>
          <select id="f-tipo">${a ? '' : '<option value="nenhum">Nenhum por enquanto</option>'}${opts ? '<option value="existente">Um sistema já cadastrado</option>' : ''}<option value="local">Novo: roda neste computador</option><option value="web">Novo: site / URL</option></select></div>
        <div class="field" data-t="existente" hidden><label for="f-exist">Sistema</label><select id="f-exist">${opts}</select></div>
        <div data-t="local" hidden class="card" style="padding:12px">
          <div class="field"><label for="f-pasta">Pasta do projeto (caminho completo)</label><input id="f-pasta" placeholder="C:\\Users\\Thiago\\projetos\\controller-obras"></div>
          <div class="grid2"><div class="field"><label for="f-cmd">Comando</label><input id="f-cmd" placeholder="npm"></div><div class="field"><label for="f-args">Argumentos</label><input id="f-args" placeholder="run dev"></div></div>
          <div class="grid2"><div class="field"><label for="f-porta">Porta</label><input id="f-porta" inputmode="numeric" placeholder="4402"></div><div class="field"><label for="f-abre">Página inicial</label><input id="f-abre" value="/"></div></div>
          <p class="muted">O escritório sobe o sistema com a variável PORT igual à porta informada.</p>
        </div>
        <div data-t="web" hidden class="card" style="padding:12px">
          <div class="field"><label for="f-url">Endereço</label><input id="f-url" placeholder="https://…"></div>
          <label class="row muted"><input type="checkbox" id="f-espelho"> O site recusa abrir dentro do escritório (usar espelho)</label>
        </div>
        <p class="notice" id="f-erro" hidden></p>
        <div class="row"><button class="btn primary" type="submit">${a ? 'Ligar sistema' : 'Contratar'}</button></div>
      </form>`);
    const tipo = $('#f-tipo', body);
    const sync = () => body.querySelectorAll('[data-t]').forEach(el => { el.hidden = el.dataset.t !== tipo.value; });
    tipo.addEventListener('change', sync); sync();
    $('#f-cad', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = (m) => { const p = $('#f-erro', body); p.textContent = m; p.hidden = false; };
      let sistemaId = null;
      if (tipo.value === 'existente') sistemaId = $('#f-exist', body).value;
      if (tipo.value === 'local' || tipo.value === 'web') {
        if (!live) return err('No modo demonstração não dá para cadastrar sistema. Abra pelo servidor do escritório no seu computador.');
        const nome = a ? 'Sistema de ' + a.name : ($('#f-nome', body).value.trim() ? 'Sistema de ' + $('#f-nome', body).value.trim() : '');
        const b = tipo.value === 'web'
          ? { nome, tipo: 'web', url: $('#f-url', body).value.trim(), embutir: $('#f-espelho', body).checked ? 'espelho' : true }
          : { nome, tipo: 'local', pasta: $('#f-pasta', body).value.trim(), comando: $('#f-cmd', body).value.trim(), args: $('#f-args', body).value.trim(), porta: Number($('#f-porta', body).value), abre: $('#f-abre', body).value.trim() || '/' };
        if (!a) b.sobre = $('#f-desc', body).value.trim();
        const r = await post('/api/sistemas', b);
        if (!r.ok) return err(r.motivo || 'não consegui cadastrar o sistema');
        sistemaId = r.id; await refreshSistemas();
      }
      if (a) { a.sistema = sistemaId; a.system = (sys(sistemaId) || {}).nome || null; save(); closeDialog(); render(); toast('Sistema ligado a ' + a.name + '.'); return; }
      const key = 'custom-' + Date.now().toString(36);
      const novo = { key, name: $('#f-nome', body).value.trim(), role: $('#f-funcao', body).value.trim(), emoji: $('#f-emoji', body).value.trim() || '🤖', desc: $('#f-desc', body).value.trim() };
      closeDialog();
      hire(novo, { sistema: sistemaId, system: (sys(sistemaId) || {}).nome || null, custom: true, reuniao: true });
    });
  }

  /* ------------------------------------------------------------ sistema, log e conversa */
  async function ligar(a) {
    const s = sys(a.sistema); if (!s) return;
    toast('Ligando ' + s.nome + '…');
    const r = await post(`/api/sistemas/${s.id}/ligar`);
    if (r && r.ok === false) return toast(r.motivo || 'não consegui ligar');
    for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 1500)); await refreshSistemas(); const n = sys(s.id); if (n && (n.estado === 'no ar' || n.estado === 'caiu')) break; }
    const n = sys(s.id); toast(n && n.estado === 'no ar' ? s.nome + ' está no ar.' : s.nome + ' não subiu. Veja o log.'); render();
  }
  async function desligar(a) { const s = sys(a.sistema); if (!s) return; const r = await post(`/api/sistemas/${s.id}/desligar`); toast(r.ok === false ? (r.motivo || 'não consegui desligar') : s.nome + ' desligado.'); await refreshSistemas(); render(); }
  async function verLog(a) {
    const s = sys(a.sistema); if (!s) return;
    const d = await api(`/api/sistemas/${s.id}/log?n=160`);
    openDialog('Log · ' + s.nome, `<pre class="log">${esc((d.linhas || []).join('\n') || '(sem linhas ainda)')}</pre>`);
  }
  function abrirSistema(a) {
    const s = sys(a.sistema); if (!s) return;
    const url = s.urlEmbutida || s.url;
    if (s.tipo !== 'web' && s.estado !== 'no ar') return openDialog(s.nome, `<p>O sistema está <b>${esc(s.estado)}</b>.</p><div class="row"><button class="btn primary" id="d-ligar">Ligar agora</button></div>`) && $('#d-ligar').addEventListener('click', () => { closeDialog(); ligar(a); });
    const embed = s.embutir !== false;
    openDialog(s.nome, `${embed ? `<iframe src="${esc(url)}" title="${esc(s.nome)}"></iframe>` : '<p>Este sistema não abre dentro do escritório.</p>'}<div class="row"><a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener">Abrir em nova aba</a><span class="muted">${esc(s.url)}</span></div>`);
  }
  async function conversar(a) {
    const s = sys(a.sistema);
    if (!s || !s.pasta) return toast('A conversa precisa de um sistema local, com pasta de projeto.');
    let poll = null, alive = true;
    const body = openDialog('Conversar com ' + a.name, `
      <p class="muted">O Claude Code abre dentro da pasta <b>${esc(s.pasta)}</b> e responde sobre o projeto.</p>
      <div id="c-claude"></div>
      <div class="chatlog" id="c-log"></div>
      <div class="field"><label for="c-txt">Pergunta</label><textarea id="c-txt" placeholder="Ex.: quais obras estão com RDO atrasado?"></textarea></div>
      <div class="row"><select id="c-modo" class="btn" aria-label="Modo"><option value="investigar">Investigar (só lê)</option><option value="resolver">Resolver (pode editar o projeto)</option></select>
      <button class="btn primary" id="c-env">Enviar</button><button class="btn" id="c-limpar">Nova conversa</button><span class="muted" id="c-st"></span></div>`, () => { alive = false; clearTimeout(poll); });
    if (claude && (!claude.instalado || !claude.conectado)) $('#c-claude', body).innerHTML = `<p class="notice">${claude.instalado ? 'O Claude Code está instalado, mas não está logado nesta máquina. Rode <b>claude</b> no terminal e faça login.' : 'O Claude Code não foi encontrado nesta máquina.'}</p>`;
    async function load() {
      if (!alive) return;
      const d = await api(`/api/agentes/${s.id}/chat`);
      const log = $('#c-log', body);
      log.innerHTML = (d.historico || []).map(m => `<div class="msg ${m.quem === 'voce' ? 'voce' : 'agente'}">${esc(m.texto)}</div>`).join('') || '<p class="muted">Nenhuma mensagem ainda.</p>';
      log.scrollTop = log.scrollHeight;
      $('#c-st', body).textContent = d.rodando ? `${a.name} está respondendo…` : (d.erro ? d.erro : '');
      $('#c-env', body).disabled = !!d.rodando;
      if (d.rodando) poll = setTimeout(load, 1500);
    }
    $('#c-env', body).addEventListener('click', async () => {
      const texto = $('#c-txt', body).value.trim(); if (!texto) return;
      const r = await post(`/api/agentes/${s.id}/chat`, { texto, modo: $('#c-modo', body).value });
      if (r.ok === false) return toast(r.motivo || 'não consegui enviar');
      $('#c-txt', body).value = ''; load();
    });
    $('#c-limpar', body).addEventListener('click', async () => { await post(`/api/agentes/${s.id}/limpar`); load(); });
    load();
  }

  /* ------------------------------------------------------------ painéis */
  function switchTab(t) {
    tab = t;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.p === t)));
    ['equipe', 'contratar', 'reuniao'].forEach(p => { $('#p-' + p).hidden = p !== t; });
    if (t === 'reuniao') pollReuniao();
    render();
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.p)));

  function agentCard(a) {
    const s = sys(a.sistema), occ = world.occupied(a.id);
    const stations = world.slots.work.filter(x => !x.spare && (x.id !== 'ceo' || a.boss));
    const options = stations.map(x => { const who = occ.get(x.id); const n = who && agent(who); return `<option value="${x.id}" ${a.slot3d === x.id ? 'selected' : ''} ${n ? 'disabled' : ''}>${esc(x.label)}${n ? ' · ' + esc(n.name) : ''}</option>`; }).join('');
    const isLocal = s && s.tipo !== 'web';
    return `<div class="card" id="card">
      <div class="head"><div class="em">${esc(a.emoji || '🤖')}</div><div><h2>${esc(a.name)}</h2><p class="muted">${esc(a.role || '')}</p></div></div>
      ${a.brief ? `<p class="muted">${esc(a.brief)}</p>` : ''}
      <div class="row">${['trabalhando', 'descanso', 'reuniao'].map(st => `<button class="btn" data-st="${st}" aria-pressed="${a.status === st}" ${a.boss && st === 'descanso' ? '' : ''}>${{ trabalhando: 'Trabalhar', descanso: 'Descansar', reuniao: 'Reunião' }[st]}</button>`).join('')}</div>
      ${a.boss ? '<p class="muted">Mesa fixa: Sala do CEO.</p>' : `<div class="field"><label for="k-mesa">Mesa</label><select id="k-mesa"><option value="">Escolher automaticamente</option>${options}</select></div>`}
      <h3>Sistema</h3>
      ${s ? `<div class="row">${sysPill(s)}<b>${esc(s.nome)}</b></div>
        <div class="row">${isLocal ? (s.estado === 'no ar' ? '<button class="btn" data-a="desligar">Desligar</button>' : '<button class="btn primary" data-a="ligar">Ligar</button>') : ''}
        <button class="btn" data-a="abrir">Abrir</button>${isLocal ? '<button class="btn" data-a="log">Log</button>' : ''}${s.pasta ? '<button class="btn primary" data-a="chat">💬 Conversar</button>' : ''}</div>
        ${s.erro ? `<p class="notice">${esc(s.erro)}</p>` : ''}`
        : a.sistema ? `<p class="notice">O sistema "${esc(a.sistema)}" não está no registro deste computador.</p>` : `<p class="muted">Sem sistema ligado. ${live ? '' : '(modo demonstração)'}</p>`}
      ${a.boss ? '' : `<div class="row"><button class="btn" data-a="vincular">${s ? 'Trocar sistema' : 'Ligar um sistema'}</button>
        <label class="row muted"><input type="checkbox" id="k-reu" ${a.reuniao !== false ? 'checked' : ''}> participa da reunião</label></div>`}
      <h3>Ficha</h3>
      <div class="grid2"><div class="field"><label for="k-nome">Nome</label><input id="k-nome" value="${esc(a.name)}" maxlength="40"></div><div class="field"><label for="k-emoji">Emoji</label><input id="k-emoji" value="${esc(a.emoji || '')}" maxlength="4"></div></div>
      <div class="field"><label for="k-role">Função</label><input id="k-role" value="${esc(a.role || '')}" maxlength="60"></div>
      ${a.locked ? '' : `<div class="row"><button class="btn danger" data-a="demitir">Tirar da equipe</button></div>`}
    </div>`;
  }
  function bindCard(a) {
    const c = $('#card'); if (!c) return;
    c.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => setStatus(a, b.dataset.st)));
    const mesa = $('#k-mesa', c); if (mesa) mesa.addEventListener('change', () => { a.slot3d = mesa.value || null; if (a.status !== 'trabalhando') a.status = 'trabalhando'; save(); world.sync(team); render(); });
    const reu = $('#k-reu', c); if (reu) reu.addEventListener('change', () => { a.reuniao = reu.checked; save(); });
    const upd = (id, field) => { const el = $(id, c); if (el) el.addEventListener('change', () => { a[field] = el.value.trim() || a[field]; save(); world.sync(team); world.bots.get(a.id) && world.bots.get(a.id).refreshTag(); renderList(); }); };
    upd('#k-nome', 'name'); upd('#k-emoji', 'emoji'); upd('#k-role', 'role');
    c.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.a;
      if (!live && act !== 'demitir' && act !== 'vincular') return toast('Disponível só com o servidor do escritório no seu computador.');
      if (act === 'ligar') ligar(a); else if (act === 'desligar') desligar(a); else if (act === 'log') verLog(a);
      else if (act === 'abrir') abrirSistema(a); else if (act === 'chat') conversar(a); else if (act === 'vincular') cadastroForm(a);
      else if (act === 'demitir') { if (b.dataset.confirm) fire(a); else { b.dataset.confirm = '1'; b.textContent = 'Confirmar: tirar ' + a.name; } }
    }));
  }
  function renderList() {
    const el = $('#lista'); if (!el) return;
    el.innerHTML = team.map(a => {
      const s = sys(a.sistema), slot = world.bots.get(a.id) && world.bots.get(a.id).slot;
      return `<button class="agent" data-id="${esc(a.id)}" aria-current="${selected === a.id}"><span class="em">${esc(a.emoji || '🤖')}</span>
        <span><b>${esc(a.name)}</b><span>${esc(a.role || '')}${slot && slot.label ? ' · ' + esc(slot.label.split(' · ')[0]) : ''}</span></span>
        <span class="row" style="gap:4px;justify-content:flex-end">${statusPill(a)}${s ? sysPill(s) : ''}</span></button>`;
    }).join('');
    el.querySelectorAll('.agent').forEach(b => b.addEventListener('click', () => select(b.dataset.id)));
  }
  function renderEquipe() {
    const p = $('#p-equipe'), a = selected && agent(selected);
    const n = (st) => team.filter(x => x.status === st).length;
    p.innerHTML = `${live ? '' : demoNote}
      ${a ? agentCard(a) : '<p class="muted">Clique num boneco no escritório ou num nome abaixo para abrir a ficha.</p>'}
      <div class="row" style="justify-content:space-between"><h3>Equipe · ${team.length}</h3><span class="muted">${n('trabalhando')} trabalhando · ${n('descanso')} descansando · ${n('reuniao')} em reunião</span></div>
      <div class="row"><button class="btn" id="all-work">Todos trabalhar</button><button class="btn" id="all-rest">Todos descansar</button><button class="btn primary" id="go-hire">+ Contratar</button></div>
      <div class="list" id="lista"></div>`;
    renderList();
    $('#all-work').addEventListener('click', () => setAll('trabalhando'));
    $('#all-rest').addEventListener('click', () => { setAll('descanso'); toast('Equipe liberada para a copa e a sala de jogos.'); });
    $('#go-hire').addEventListener('click', () => switchTab('contratar'));
    if (a) bindCard(a);
  }
  function renderContratar() {
    const p = $('#p-contratar');
    const livres = sistemas.filter(s => !team.some(a => a.sistema === s.id));
    p.innerHTML = `${live ? '' : demoNote}
      <div class="row" style="justify-content:space-between"><h2>Contratar</h2><button class="btn primary" id="cad">+ Cadastrar agente</button></div>
      <p class="muted">Cada agente ganha uma mesa real na sede. Para trabalhar de verdade, ligue a ele o sistema que ele opera (um projeto no seu computador ou um site).</p>
      ${livres.length ? `<h3>Sistemas cadastrados sem agente</h3>${livres.map(s => `<div class="hire"><span class="em">🖥️</span><div><b>${esc(s.nome)}</b><p>${esc(s.sobre || (s.tipo === 'web' ? s.url : s.pasta) || '')}</p></div><button class="btn primary" data-sis="${esc(s.id)}">Contratar</button></div>`).join('')}` : ''}
      <h3>Vagas sugeridas para o Grupo VEX</h3>
      ${CATALOG.map(c => { const tem = team.some(a => a.key === c.key); return `<div class="hire"><span class="em">${c.emoji}</span><div><b>${esc(c.name)} · ${esc(c.role)}</b><p>${esc(c.desc)}</p></div><button class="btn ${tem ? '' : 'primary'}" data-key="${c.key}" ${tem ? 'disabled' : ''}>${tem ? 'Na equipe' : 'Contratar'}</button></div>`; }).join('')}`;
    $('#cad', p).addEventListener('click', () => cadastroForm(null));
    p.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => hire(CATALOG.find(c => c.key === b.dataset.key))));
    p.querySelectorAll('[data-sis]').forEach(b => b.addEventListener('click', () => { const s = sys(b.dataset.sis); hire({ key: 'sis-' + s.id, name: s.nome.replace(/^Sistema de /, ''), role: 'Opera ' + s.nome, emoji: '🤖', desc: s.sobre || '' }, { sistema: s.id, system: s.nome, reuniao: true }); }));
  }
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  function renderReuniao() {
    const p = $('#p-reuniao'), r = reuniao;
    if (!live) {
      p.innerHTML = `${demoNote}<h2>Reunião</h2><p class="muted">Aqui os agentes se juntam na sala de reunião. Com o servidor ligado, cada um consulta o próprio projeto pelo Claude Code e no fim sai um briefing para você.</p>
        <div class="row"><button class="btn primary" id="r-sala">Levar todos para a sala</button><button class="btn" id="r-volta">Voltar ao trabalho</button></div>`;
    } else if (!r) { p.innerHTML = '<p class="muted">Carregando a reunião…</p>'; return; }
    else {
      const conv = r.convocados || [], fora = r.foraDaMesa || [];
      p.innerHTML = `<div class="row" style="justify-content:space-between"><h2>Reunião</h2>${r.rodando ? `<span class="pill st-reuniao">${esc(r.fase)}</span>` : ''}</div>
        ${r.rodando ? `<p class="muted">Acontecendo agora. Cada fala é uma consulta do Claude Code dentro do projeto do agente.</p><div class="row"><button class="btn danger" id="r-parar">Encerrar</button></div>`
          : `<p class="muted">Convocados: ${conv.length ? conv.map(c => esc(c.nome)).join(', ') : 'ninguém ainda'}.</p>
             ${fora.length ? `<p class="muted">Fora da mesa: ${fora.map(f => `${esc(f.nome)} (${esc(f.motivo)})`).join('; ')}.</p>` : ''}
             <p class="notice">Cada fala consome a cota do seu plano do Claude. A reunião leva alguns minutos.</p>
             <div class="row"><button class="btn primary" id="r-ini" ${conv.length ? '' : 'disabled'}>Reunir agora</button><button class="btn" id="r-sala">Só levar para a sala</button><button class="btn" id="r-volta">Voltar ao trabalho</button></div>`}
        ${r.erro ? `<p class="notice">${esc(r.erro)}</p>` : ''}
        ${(r.falas || []).length ? `<h3>Falas</h3><div class="falas">${r.falas.map(f => `<div class="fala"><b>${esc(f.quem)} · ${esc(f.papel || '')}</b>${md(f.texto || (f.erro ? 'não respondeu' : ''))}</div>`).join('')}</div>` : ''}
        ${r.briefing ? `<h3>Briefing do dia</h3><div class="fala">${md(typeof r.briefing === 'string' ? r.briefing : (r.briefing.texto || ''))}</div>` : ''}`;
      const ini = $('#r-ini', p);
      if (ini) ini.addEventListener('click', async () => {
        if (!ini.dataset.ok) { ini.dataset.ok = '1'; ini.textContent = 'Confirmar: usar a cota do Claude'; return; }
        ini.disabled = true;
        convocar(conv.map(c => c.id));
        const res = await post('/api/reuniao/iniciar');
        if (res.ok === false) { toast(res.motivo || 'a reunião não começou'); voltarTodos(); }
        else toast('Reunião começou. Os agentes estão indo para a sala.');
        pollReuniao();
      });
      const parar = $('#r-parar', p); if (parar) parar.addEventListener('click', async () => { await post('/api/reuniao/parar'); toast('Encerrando a reunião…'); pollReuniao(); });
    }
    const sala = $('#r-sala', p); if (sala) sala.addEventListener('click', () => convocar(null));
    const volta = $('#r-volta', p); if (volta) volta.addEventListener('click', voltarTodos);
  }
  function convocar(sistemaIds) {
    team.forEach(a => { if (a.boss || !sistemaIds || sistemaIds.includes(a.sistema)) a.status = 'reuniao'; });
    save(); world.sync(team); renderEquipe();
  }
  function voltarTodos() { team.forEach(a => { if (a.status === 'reuniao') a.status = 'trabalhando'; }); save(); world.sync(team); render(); }
  let reuT = null, estavaRodando = false;
  async function pollReuniao() {
    clearTimeout(reuT); if (!live) return render();
    try { reuniao = await api('/api/reuniao'); } catch (e) { /* tenta de novo */ }
    if (reuniao) {
      if (reuniao.rodando) { if (!estavaRodando) convocar((reuniao.participantes || []).map(x => x.id)); estavaRodando = true; }
      else if (estavaRodando) { estavaRodando = false; toast('A reunião terminou. O briefing está na aba Reunião.'); voltarTodos(); }
    }
    if (tab === 'reuniao') renderReuniao();
    if ((reuniao && reuniao.rodando) || tab === 'reuniao') reuT = setTimeout(pollReuniao, 3000);
  }
  function render() {
    if (tab === 'equipe') renderEquipe(); else if (tab === 'contratar') renderContratar(); else renderReuniao();
  }

  /* ------------------------------------------------------------ início */
  async function boot() {
    $('#logo').src = window.VEX_LOGOS['grupo-vex'];
    try { const r = await fetch('/api/sistemas'); if (r.ok) { const d = await r.json(); if (Array.isArray(d)) { live = true; sistemas = d; } } } catch (e) { /* sem servidor */ }
    if (live) {
      try { const d = await api('/api/equipe'); if (d && Array.isArray(d.team)) team = d.team; } catch (e) { /* começa vazio */ }
      api('/api/claude').then(d => { claude = d; showConn(); }).catch(() => {});
    } else {
      try { const d = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); if (d && Array.isArray(d.team)) team = d.team; } catch (e) { /* sem storage */ }
      if (!team.length) team = [boss(), ...['vex-controller', 'vex-planejamento', 'vex-suprimentos', 'vex-financeiro', 'vex-juridico'].map(k => fromCatalog(CATALOG.find(c => c.key === k)))];
    }
    if (!team.some(a => a.id === 'boss-1')) team.unshift(boss());
    team.forEach(a => {
      if (!a.look || !a.look.skin) a.look = makeLook(a.key || a.id);
      if (!STATUS[a.status]) a.status = 'trabalhando';
      if (a.id === 'boss-1' && (a.name === 'Você' || !a.name)) a.name = donoNome();
    });
    showConn();

    viewer = await window.VEX3D.mountViewer($('#c'));
    world = window.VEXAgents3D.createWorld(viewer);
    world.onPick = (id) => select(id);
    window.VEXAgentes = { world, team: () => team };
    world.sync(team);
    $('#loading').hidden = true;
    save();

    const sel = $('#view');
    sel.innerHTML = M.views.map(v => `<option value="${v.id}">${esc(v.title)}</option>`).join('');
    sel.addEventListener('change', () => { viewer.go(sel.value); $('#ceiling').checked = M.views.find(v => v.id === sel.value).ceiling !== false; });
    $('#ceiling').addEventListener('change', (e) => viewer.setCeiling(e.target.checked));
    render();
    if (live) { setInterval(async () => { await refreshSistemas(); if (tab !== 'reuniao' && !document.activeElement.closest('#card')) render(); }, 6000); pollReuniao(); }
  }
  function showConn() {
    const c = $('#conn');
    if (!live) { c.innerHTML = '<i style="background:#e0a238"></i>modo demonstração · equipe salva só neste navegador'; return; }
    const cl = !claude ? 'verificando o Claude Code…' : claude.conectado ? 'Claude Code conectado' : claude.instalado ? 'Claude Code sem login' : 'Claude Code não encontrado';
    c.innerHTML = `<i style="background:#3fae7a"></i>servidor do escritório conectado · ${sistemas.length} sistema(s) · ${esc(cl)}`;
  }
  boot().catch(e => { console.error(e); $('#loading').textContent = 'Não consegui montar o escritório 3D neste navegador (WebGL). Tente o Chrome ou o Edge atualizados.'; });
})();
