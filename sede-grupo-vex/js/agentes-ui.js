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
  const DEMO_KEY = 'vex-agentes-demo-v2';
  const STATUS = { trabalhando: 'trabalhando', descanso: 'descanso', reuniao: 'reunião', offline: 'offline' };
  const STATUS_BTN = { trabalhando: '💻 Trabalhando', descanso: '🎮 Descanso', reuniao: '🗣️ Reunião', offline: '💤 Offline' };

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

  /* ------------------------------------------------------------ os 9 agentes do Grupo VEX (pasta agentes-vex/) */
  const CATALOG = [
    { key: 'exemplo', name: 'EXEMPLO', role: 'Agente de demonstração', emoji: '🤖', sistema: 'exemplo', system: 'Agente de exemplo', desc: 'Um sistema mínimo que vem junto, na pasta exemplo-agente: sobe na porta 4401 e mostra uma página. Serve de molde para cadastrar os seus.' },
    { key: 'vex-diretor-operacoes', name: 'Heitor', role: 'Diretor de Operações e Portfólio', emoji: '🧭', sistema: 'vex-diretor-operacoes', system: '01 · Diretor de Operações e Portfólio', desc: 'Coordenar a operação do Grupo VEX, transformar objetivos em prioridades, conectar os agentes e levar à direção decisões baseadas em dados.' },
    { key: 'vex-planejamento', name: 'Paula', role: 'Planejamento e Controle de Obras', emoji: '📅', sistema: 'vex-planejamento-obras', system: '02 · Planejamento e Controle de Obras', desc: 'Manter cronogramas e restrições atualizados, analisar desvios e transformar o planejamento em ações executáveis.' },
    { key: 'vex-controller', name: 'Otto', role: 'Controller Operacional', emoji: '🔎', sistema: 'vex-controller-operacional', system: '03 · Controller Operacional', desc: 'Auditar completude e consistência dos registros de obra, preparar lançamentos e cobrar correções sem inventar fatos de campo.' },
    { key: 'vex-coordenador-obras', name: 'Caio', role: 'Coordenador de Obras', emoji: '🦺', sistema: 'vex-coordenador-obras', system: '04 · Coordenador de Obras', desc: 'Conduzir a resolução dos problemas operacionais de campo e garantir que cada impedimento tenha dono, prazo e evidência de conclusão.' },
    { key: 'vex-suprimentos', name: 'Sérgio', role: 'Suprimentos e Compras', emoji: '📦', sistema: 'vex-suprimentos-compras', system: '05 · Suprimentos e Compras', desc: 'Conduzir o fluxo de suprimentos do pedido até a conferência do recebimento e o vínculo documental, monitorando prazos e divergências.' },
    { key: 'vex-financeiro', name: 'Rita', role: 'Financeiro, Custos e Performance', emoji: '💰', sistema: 'vex-financeiro-custos', system: '06 · Financeiro, Custos e Performance', desc: 'Consolidar dados financeiros e custos por obra, identificar desvios e preparar análises confiáveis para decisão.' },
    { key: 'vex-comercial', name: 'Marta', role: 'Comercial, Propostas e Contratos', emoji: '🤝', sistema: 'vex-comercial-contratos', system: '07 · Comercial, Propostas e Contratos', desc: 'Organizar prospecção, oportunidades, propostas e obrigações contratuais das empresas do grupo.' },
    { key: 'vex-marketing', name: 'Nina', role: 'Marketing e Conteúdo', emoji: '📣', sistema: 'vex-marketing-conteudo', system: '08 · Marketing e Conteúdo', desc: 'Planejar e organizar comunicação e conteúdo de cada marca, gerando materiais coerentes com a estratégia e medindo resultados reais.' },
    { key: 'vex-atendimento', name: 'Bruna', role: 'Atendimento, Pós-obra e Assistência', emoji: '🛠️', sistema: 'vex-atendimento-pos-obra', system: '09 · Atendimento, Pós-obra e Assistência', desc: 'Triar solicitações de clientes, organizar chamados e acompanhar a resolução com rastreabilidade até o encerramento.' }
  ];

  // mesma aparência das vagas no escritório isométrico (js/roster.js)
  const LOOKS = {
    'vex-controller': { skin: '#e0a878', hair: '#241a13', style: 'curto', shirt: '#1f5e63', pants: '#1b2030', glasses: null, beard: 'cavanhaque' },
    'vex-planejamento': { skin: '#f0c29b', hair: '#3d2a1a', style: 'longo', shirt: '#e9edf8', pants: '#26304a', glasses: 'retangular', beard: null },
    'vex-diretor-operacoes': { skin: '#c9854f', hair: '#2a1d14', style: 'curto', shirt: '#1b2030', pants: '#1e293b', glasses: 'retangular', beard: 'cheia' },
    'vex-coordenador-obras': { skin: '#c9854f', hair: '#1a120d', style: 'raspado', shirt: '#2b3d44', pants: '#3b3f52', glasses: null, beard: 'cheia' },
    'vex-atendimento': { skin: '#e0a878', hair: '#3d2a1a', style: 'cacheado', shirt: '#2f8f94', pants: '#26304a', glasses: null, beard: null },
    'vex-suprimentos': { skin: '#a2643b', hair: '#140f0c', style: 'fade', shirt: '#334155', pants: '#1b2030', glasses: null, beard: null },
    'vex-rdo': { skin: '#f7d7bd', hair: '#a8702f', style: 'coque', shirt: '#c8561a', pants: '#26304a', glasses: null, beard: null },
    'vex-qualidade': { skin: '#c9854f', hair: '#1a120d', style: 'raspado', shirt: '#2b3d44', pants: '#3b3f52', glasses: null, beard: 'cheia' },
    'vex-financeiro': { skin: '#7a4a2c', hair: '#140f0c', style: 'cacheado', shirt: '#1b2856', pants: '#1b2030', glasses: 'redondo', beard: null },
    'vex-juridico': { skin: '#f0c29b', hair: '#8e8e93', style: 'curto', shirt: '#f2f2ef', pants: '#1e293b', glasses: 'retangular', beard: null },
    'vex-comercial': { skin: '#e0a878', hair: '#6b4423', style: 'chanel', shirt: '#2f8f94', pants: '#26304a', glasses: null, beard: null },
    'vex-marketing': { skin: '#f7d7bd', hair: '#241a13', style: 'rabo', shirt: '#c8561a', pants: '#1b2030', glasses: null, beard: null },
    'vex-view': { skin: '#c9854f', hair: '#140f0c', style: 'curto', shirt: '#0f0f0f', pants: '#3b3f52', glasses: null, beard: 'cavanhaque' },
    'vex-bi': { skin: '#f0c29b', hair: '#140f0c', style: 'longo', shirt: '#5b6b70', pants: '#1b2030', glasses: 'redondo', beard: null }
  };

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
    return Object.assign({ id: 'ag-' + c.key, key: c.key, name: c.name, role: c.role, emoji: c.emoji, system: c.system || null, sistema: c.sistema || null, path: null, brief: c.desc, reuniao: true,
      dept: 'servico', slotId: null, status: 'trabalhando', boss: false, locked: false, look: makeLook(c.key, LOOKS[c.key] || {}) }, extra);
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

  /* ------------------------------------------------------------ horário de trabalho (mesma regra do escritório base) */
  const emMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  function dentroDoHorario(h, d = new Date()) {
    if (!h || !h.inicio || !h.fim) return null;
    const dias = Array.isArray(h.dias) && h.dias.length ? h.dias : [0, 1, 2, 3, 4, 5, 6];
    if (!dias.includes(d.getDay())) return false;
    const i = emMin(h.inicio), f = emMin(h.fim); if (i == null || f == null) return null;
    const agora = d.getHours() * 60 + d.getMinutes();
    return i <= f ? (agora >= i && agora < f) : (agora >= i || agora < f);
  }
  function textoHorario(a) {
    const h = a.horario; if (!h || !h.inicio || !h.fim) return 'sem horário · sempre em serviço';
    const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const dias = Array.isArray(h.dias) && h.dias.length ? h.dias : [0, 1, 2, 3, 4, 5, 6];
    const quais = dias.length === 7 ? 'todo dia' : (dias.length === 5 && [1, 2, 3, 4, 5].every(d => dias.includes(d))) ? 'seg a sex' : dias.map(d => nomes[d]).join(', ');
    return `${h.inicio} às ${h.fim} · ${quais}`;
  }
  function aplicarAgenda() {
    let mudou = false;
    for (const a of team) {
      if (a.boss) continue;
      const dentro = dentroDoHorario(a.horario);
      if (dentro === null) { a._fase = null; continue; }
      const fase = dentro ? 'trabalhando' : 'descanso';
      if (a._fase === fase) continue;
      a._fase = fase;
      if (a.status !== fase && a.status !== 'offline') { a.status = fase; mudou = true; }
    }
    if (mudou) { save(); world.sync(team); render(); }
  }

  /* ------------------------------------------------------------ ações de equipe */
  function setStatus(a, st) { a.status = st; save(); world.sync(team); render(); }
  function setAll(st) { team.forEach(a => { if (!a.boss) a.status = st; }); save(); world.sync(team); render(); }
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
  function portaLivre() { const usadas = sistemas.map(s => s.porta).filter(Boolean); let p = 4401; while (usadas.includes(p)) p++; return p; }
  function cadastroForm(a) {
    const opts = sistemas.map(s => `<option value="${esc(s.id)}">${esc(s.nome)} · ${esc(s.tipo === 'web' ? 'site' : 'local')}</option>`).join('');
    const body = openDialog(a ? 'Ligar um sistema a ' + a.name : 'Cadastrar agente', `
      ${live ? '' : demoNote}
      ${a ? '' : '<p class="muted">Ele entra pela recepção e vai até uma estação livre. Se ele tem um sistema, cadastre junto: o computador dele passa a abrir esse sistema aqui dentro.</p>'}
      <form id="f-cad" class="card" style="background:none;border:0;padding:0">
        ${a ? '' : `<div class="grid2"><div class="field"><label for="f-nome">Nome</label><input id="f-nome" required maxlength="22" placeholder="ex.: Tati"></div>
        <div class="field"><label for="f-emoji">Emoji</label><input id="f-emoji" maxlength="4" value="🤖"></div></div>
        <div class="field"><label for="f-funcao">Função</label><input id="f-funcao" maxlength="48" placeholder="ex.: Controller de Obras"></div>
        <div class="field"><label for="f-desc">O que ele faz</label><textarea id="f-desc" maxlength="300" placeholder="Uma frase sobre a função dele."></textarea></div>`}
        <div class="field"><label for="f-tipo">Sistema do agente</label>
          <select id="f-tipo">${a ? '' : '<option value="nenhum">Nenhum</option>'}${opts ? '<option value="existente">Um sistema já cadastrado</option>' : ''}<option value="local">Roda nesta máquina</option><option value="web">Site / URL</option></select></div>
        <div class="field" data-t="existente" hidden><label for="f-exist">Sistema</label><select id="f-exist">${opts}</select></div>
        <div data-t="local" hidden class="card" style="padding:12px">
          <div class="field"><label for="f-pasta">Pasta do projeto</label><input id="f-pasta" placeholder="C:\\projetos\\meu-agente"></div>
          <div class="grid2"><div class="field"><label for="f-cmd">Comando</label><input id="f-cmd" value="npm"></div><div class="field"><label for="f-args">Argumentos</label><input id="f-args" value="run dev"></div></div>
          <div class="grid2"><div class="field"><label for="f-porta">Porta</label><input id="f-porta" type="number" min="1024" max="65535" value="${portaLivre()}"></div><div class="field"><label for="f-abre">Página inicial</label><input id="f-abre" value="/"></div></div>
          <p class="muted">O escritório sobe o sistema com PORT igual à porta acima. Se o seu projeto escolhe a porta de outro jeito, ponha nos argumentos (ex.: <b>run dev -- --port 4402</b>).</p>
        </div>
        <div data-t="web" hidden class="card" style="padding:12px">
          <div class="field"><label for="f-url">Endereço</label><input id="f-url" placeholder="https://meu-sistema.com"></div>
          <label class="row muted"><input type="checkbox" id="f-espelho"> O site recusa abrir dentro do escritório (usar o espelho)</label>
        </div>
        ${a ? '' : '<label class="row muted"><input type="checkbox" id="f-reun" checked> Participa da reunião dos agentes</label>'}
        <p class="notice" id="f-erro" hidden></p>
        <div class="row"><button class="btn primary" type="submit">${a ? 'Ligar sistema' : 'Contratar'}</button><button class="btn" type="button" id="f-cancel">Cancelar</button></div>
      </form>`);
    const tipo = $('#f-tipo', body);
    const sync = () => body.querySelectorAll('[data-t]').forEach(el => { el.hidden = el.dataset.t !== tipo.value; });
    tipo.addEventListener('change', sync); sync();
    $('#f-cancel', body).addEventListener('click', closeDialog);
    $('#f-cad', body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = (m) => { const p = $('#f-erro', body); p.textContent = m; p.hidden = false; };
      const name = a ? a.name : $('#f-nome', body).value.trim();
      if (!name) return $('#f-nome', body).focus();
      const brief = a ? (a.brief || '') : $('#f-desc', body).value.trim();
      let sistemaId = null;
      if (tipo.value === 'existente') sistemaId = $('#f-exist', body).value;
      if (tipo.value === 'local' || tipo.value === 'web') {
        if (!live) return err('No modo demonstração não dá para cadastrar sistema. Abra pelo servidor do escritório no seu computador.');
        const b = tipo.value === 'web'
          ? { tipo: 'web', nome: name, url: $('#f-url', body).value.trim(), embutir: $('#f-espelho', body).checked ? 'espelho' : true, sobre: brief }
          : { tipo: 'local', nome: name, pasta: $('#f-pasta', body).value.trim(), comando: $('#f-cmd', body).value.trim(), args: $('#f-args', body).value.trim(),
              porta: Number($('#f-porta', body).value), abre: $('#f-abre', body).value.trim() || '/', sobre: brief };
        const btn = body.querySelector('button[type=submit]'); btn.disabled = true;
        const r = await post('/api/sistemas', b).catch(() => ({ ok: false, motivo: 'o escritório não respondeu' }));
        btn.disabled = false;
        if (!r.ok) return err(r.motivo || 'não consegui cadastrar o sistema');
        sistemaId = r.id; await refreshSistemas();
      }
      const pasta = tipo.value === 'local' ? $('#f-pasta', body).value.trim() : null;
      if (a) { a.sistema = sistemaId; a.system = (sys(sistemaId) || {}).nome || null; if (pasta) a.path = pasta; save(); closeDialog(); render(); toast('Sistema ligado a ' + a.name + '.'); return; }
      const key = 'custom-' + Date.now().toString(36);
      const novo = { key, name: name.slice(0, 22), role: ($('#f-funcao', body).value.trim() || 'Função a definir').slice(0, 48), emoji: $('#f-emoji', body).value.trim() || '🤖', desc: brief };
      closeDialog();
      hire(novo, { sistema: sistemaId, system: (sys(sistemaId) || {}).nome || null, path: pasta, custom: true, reuniao: $('#f-reun', body).checked });
      if (sistemaId) toast(`${novo.name} entrou no quadro. Clique nele para abrir o sistema.`);
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
      <p class="muted">O Claude Code abre dentro da pasta <b>${esc(s.pasta)}</b>${(s.comandos || []).length ? ', com o prompt completo do agente (CLAUDE.md) e a memória dele' : ' e responde sobre o projeto'}.</p>
      <div id="c-claude"></div>
      <div class="chatlog" id="c-log"></div>
      ${(s.comandos || []).length ? `<div class="row" id="c-cmds" aria-label="Comandos rápidos">${s.comandos.map(c => `<button class="btn" data-cmd="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
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
    body.querySelectorAll('[data-cmd]').forEach(x => x.addEventListener('click', () => { const t = $('#c-txt', body); t.value = x.dataset.cmd; t.focus(); }));
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
    const dias = (a.horario && a.horario.dias) || [1, 2, 3, 4, 5];
    return `<div class="card" id="card">
      <div class="head"><div class="em">${esc(a.emoji || '🤖')}</div><div><h2>${esc(a.name)}</h2><p class="muted">${esc(a.role || '')}</p></div></div>
      ${a.brief ? `<p class="muted">${esc(a.brief)}</p>` : ''}
      ${a.path ? `<p class="muted" style="font-family:var(--f-mono);font-size:11px">${esc(a.path)}</p>` : ''}
      <h3>Situação</h3>
      <div class="row">${Object.keys(STATUS_BTN).map(st => `<button class="btn" data-st="${st}" aria-pressed="${a.status === st}">${STATUS_BTN[st]}</button>`).join('')}</div>
      ${a.boss ? '<p class="muted">Mesa fixa: Sala do CEO.</p>' : `<div class="field"><label for="k-mesa">Estação</label><select id="k-mesa"><option value="">Escolher automaticamente</option>${options}</select></div>
      <h3>Horário de trabalho</h3>
      <div class="row"><input type="time" id="k-h1" value="${esc((a.horario && a.horario.inicio) || '')}" class="btn"><input type="time" id="k-h2" value="${esc((a.horario && a.horario.fim) || '')}" class="btn"><button class="btn" id="k-hoff" title="Sem horário: trabalha sempre">✕ sem horário</button></div>
      <div class="row" id="k-dias">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((n, i) => `<button class="btn" data-d="${i}" aria-pressed="${dias.includes(i)}">${n}</button>`).join('')}</div>
      <p class="muted">${esc(textoHorario(a))}. Fora do horário ele vai para a copa ou a sala de jogos sozinho; dentro, volta para a estação.</p>`}
      <h3>Sistema</h3>
      ${s ? `<div class="row">${sysPill(s)}<b>${esc(s.nome)}</b></div>
        <div class="row">${isLocal ? (s.estado === 'no ar' ? '<button class="btn" data-a="desligar">Desligar sistema</button>' : '<button class="btn primary" data-a="ligar">Ligar sistema</button>') : ''}
        <button class="btn" data-a="abrir">🖥️ Abrir o sistema</button>${isLocal ? '<button class="btn" data-a="log">Log</button>' : ''}${s.pasta ? '<button class="btn primary" data-a="chat">💬 Conversar</button>' : ''}</div>
        ${s.erro ? `<p class="notice">${esc(s.erro)}</p>` : ''}`
        : a.sistema ? `<p class="notice">O sistema "${esc(a.sistema)}" não está no registro deste computador.</p>` : `<p class="muted">Sem sistema ligado. ${live ? '' : '(modo demonstração)'}</p>`}
      ${a.boss ? '' : `<div class="row"><button class="btn" data-a="vincular">${s ? 'Trocar sistema' : 'Ligar um sistema'}</button>
        <label class="row muted"><input type="checkbox" id="k-reu" ${a.reuniao !== false ? 'checked' : ''}> participa da reunião</label></div>`}
      <h3>Ficha</h3>
      <div class="grid2"><div class="field"><label for="k-nome">Nome exibido</label><input id="k-nome" value="${esc(a.name)}" maxlength="22"></div><div class="field"><label for="k-emoji">Emoji</label><input id="k-emoji" value="${esc(a.emoji || '')}" maxlength="4"></div></div>
      <div class="field"><label for="k-role">Função</label><input id="k-role" value="${esc(a.role || '')}" maxlength="48"></div>
      <div class="row"><button class="btn" data-a="sortear">🎲 Sortear aparência</button><button class="btn" data-a="localizar">📍 Localizar</button>${a.locked ? '' : '<button class="btn danger" data-a="demitir">Desligar da equipe</button>'}</div>
    </div>`;
  }
  function bindCard(a) {
    const c = $('#card'); if (!c) return;
    c.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => setStatus(a, b.dataset.st)));
    const mesa = $('#k-mesa', c); if (mesa) mesa.addEventListener('change', () => { a.slot3d = mesa.value || null; if (a.status !== 'trabalhando') a.status = 'trabalhando'; save(); world.sync(team); render(); });
    const reu = $('#k-reu', c); if (reu) reu.addEventListener('change', () => { a.reuniao = reu.checked; save(); });
    // horário de trabalho
    const salvaHorario = () => {
      const i = $('#k-h1', c).value, f = $('#k-h2', c).value;
      const dias = [...c.querySelectorAll('#k-dias [data-d]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => +b.dataset.d);
      a.horario = (i && f && dias.length) ? { inicio: i, fim: f, dias } : null; a._fase = null;
      save(); aplicarAgenda(); render();
    };
    if ($('#k-h1', c)) {
      $('#k-h1', c).addEventListener('change', salvaHorario); $('#k-h2', c).addEventListener('change', salvaHorario);
      $('#k-hoff', c).addEventListener('click', () => { $('#k-h1', c).value = ''; $('#k-h2', c).value = ''; salvaHorario(); });
      c.querySelectorAll('#k-dias [data-d]').forEach(b => b.addEventListener('click', () => { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); salvaHorario(); }));
    }
    const upd = (id, field) => { const el = $(id, c); if (el) el.addEventListener('change', () => { a[field] = el.value.trim() || a[field]; save(); world.sync(team); world.bots.get(a.id) && world.bots.get(a.id).refreshTag(); renderList(); }); };
    upd('#k-nome', 'name'); upd('#k-emoji', 'emoji'); upd('#k-role', 'role');
    c.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.a;
      if (act === 'sortear') { const keep = a.look && a.look.uniforme; a.look = makeLook(a.id + Math.random(), { uniforme: keep }); save(); world.rebuild(a.id, team); world.setSelected(a.id); return; }
      if (act === 'localizar') { world.focusAgent(a.id); return; }
      if (!live && act !== 'demitir' && act !== 'vincular') return toast('Disponível só com o servidor do escritório no seu computador.');
      if (act === 'ligar') ligar(a); else if (act === 'desligar') desligar(a); else if (act === 'log') verLog(a);
      else if (act === 'abrir') abrirSistema(a); else if (act === 'chat') conversar(a); else if (act === 'vincular') cadastroForm(a);
      else if (act === 'demitir') { if (b.dataset.confirm) fire(a); else { b.dataset.confirm = '1'; b.textContent = 'Confirmar: desligar ' + a.name; } }
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
      <div class="list" id="lista"></div>
      <h3>Equipe salva</h3>
      <div class="row"><button class="btn" id="eq-exp">⬇ Exportar equipe (.json)</button><button class="btn" id="eq-imp">⬆ Importar equipe</button><button class="btn danger" id="eq-reset">↺ Restaurar padrão</button></div>
      <input type="file" id="eq-file" accept="application/json,.json" hidden>`;
    renderList();
    $('#all-work').addEventListener('click', () => setAll('trabalhando'));
    $('#all-rest').addEventListener('click', () => { setAll('descanso'); toast('Equipe liberada para a copa e a sala de jogos.'); });
    $('#go-hire').addEventListener('click', () => switchTab('contratar'));
    $('#eq-exp').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ team, v: 1 }, null, 2)], { type: 'application/json' });
      const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = 'equipe.json'; el.click();
      setTimeout(() => URL.revokeObjectURL(el.href), 1000);
    });
    $('#eq-imp').addEventListener('click', () => $('#eq-file').click());
    $('#eq-file').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try { const d = JSON.parse(r.result); if (!Array.isArray(d.team) || !d.team.length) throw 0; team = d.team; prepararEquipe(); save(); world.sync(team); selected = null; render(); toast('Equipe importada.'); }
        catch (_) { toast('Arquivo inválido.'); }
      };
      r.readAsText(f);
    });
    const rs = $('#eq-reset');
    rs.addEventListener('click', () => {
      if (!rs.dataset.ok) { rs.dataset.ok = '1'; rs.textContent = 'Confirmar: voltar ao padrão'; return; }
      team = padrao(); prepararEquipe(); save(); world.sync(team); selected = null; render(); toast('Equipe restaurada ao padrão.');
    });
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

  /* ------------------------------------------------------------ equipe padrão */
  // igual ao escritório base: o dono e o agente de exemplo; sem servidor, uma equipe de demonstração
  function padrao() {
    // os 9 agentes do Grupo VEX; com servidor, cada um ligado ao sistema dele (agentes-vex/NN-*)
    return [boss(), ...CATALOG.filter(c => /^vex-/.test(c.key)).map(c => fromCatalog(c, live ? {} : { sistema: null, system: null }))];
  }
  function prepararEquipe() {
    if (!team.some(a => a.id === 'boss-1')) team.unshift(boss());
    team.forEach(a => {
      if (!a.look || !a.look.skin) a.look = makeLook(a.key || a.id, LOOKS[a.key] || {});
      if (a.status === 'fora') a.status = 'offline';
      if (!STATUS[a.status]) a.status = 'trabalhando';
      if (a.id === 'boss-1' && (a.name === 'Você' || !a.name)) a.name = donoNome();
    });
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
      if (!team.length) team = padrao();
    }
    if (!team.length) team = padrao();
    prepararEquipe();
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
    aplicarAgenda(); setInterval(aplicarAgenda, 30000);
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
