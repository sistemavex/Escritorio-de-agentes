/* ===========================================================
   roster.js — quem trabalha aqui.
   BOSSES  : você (sempre em serviço, na Diretoria)
   CATALOG : o agente de exemplo + vagas sugeridas para começar
   =========================================================== */
const ROSTER = (() => {

  const KEY = 'escritorio-agentes-v1';

  /* ===========================================================
     O DONO — o nome vem de data/config.json ("dono")
     =========================================================== */
  const BOSSES = [
    {
      id: 'boss-1', name: (window.ESCRITORIO && ESCRITORIO.dono) || 'Você', role: 'CEO · Grupo VEX',
      emoji: '⭐', boss: true, dept: 'diretoria', slotId: 'DIR-1',
      status: 'trabalhando', locked: true,
      source: 'Diretoria', sistema: null,
      brief: 'Quem manda aqui. Sempre em serviço.',
      look: {
        skin: '#d9a17a', hair: '#2a1d14', style: 'curto',
        shirt: '#334155', pants: '#1e293b', shoes: '#15181f',
        glasses: null, beard: null, tattoo: false, cap: false,
        uniforme: false
      }
    }
  ];

  /* ===========================================================
     BANCO DE TALENTOS
     'detectado' = tem sistema no registro (data/sistemas.json)
     'sugerido'  = vaga de ideia; contrate e depois ligue um sistema a ela
     =========================================================== */
  const CATALOG = [
    {
      key: 'exemplo', name: 'EXEMPLO', role: 'Agente de demonstração', emoji: '🤖',
      cat: 'detectado', system: 'Agente de exemplo', sistema: 'exemplo',
      desc: 'Um sistema mínimo que vem junto, na pasta exemplo-agente: sobe na porta 4401 e mostra uma página.',
      why: 'Serve de molde. Clique no computador dele para ver o escritório ligar, embutir e conversar com um sistema. Depois cadastre os seus.',
      look: { skin: '#c9854f', hair: '#140f0c', style: 'cacheado', shirt: '#38bdf8', pants: '#26304a', glasses: null, beard: null }
    },
    { key: 'vex-controller', name: 'Otto', role: 'Controller de Obras', emoji: '🏗️', cat: 'sugerido',
      desc: 'Acompanha avanço físico, RDOs e restrições de cada obra e avisa o que saiu do plano.',
      why: 'É quem enxerga a obra inteira todo dia: sem ele, atraso só aparece quando já custou caro.',
      look: { skin: '#e0a878', hair: '#241a13', style: 'curto', shirt: '#1f5e63', pants: '#1b2030', glasses: null, beard: 'cavanhaque' } },
    { key: 'vex-planejamento', name: 'Paula', role: 'Planejamento & Cronograma', emoji: '📅', cat: 'sugerido',
      desc: 'Mantém cronogramas, caminho crítico e o lookahead de seis semanas em dia.',
      why: 'Plano atualizado é o que deixa as outras áreas trabalharem antes do problema.',
      look: { skin: '#f0c29b', hair: '#3d2a1a', style: 'longo', shirt: '#e9edf8', pants: '#26304a', glasses: 'retangular', beard: null } },
    { key: 'vex-suprimentos', name: 'Sérgio', role: 'Suprimentos & Compras', emoji: '📦', cat: 'sugerido',
      desc: 'Cota, acompanha pedidos e aponta material com risco de faltar na obra.',
      why: 'Material que falta para a frente de serviço. Ele avisa antes.',
      look: { skin: '#a2643b', hair: '#140f0c', style: 'fade', shirt: '#334155', pants: '#1b2030', glasses: null, beard: null } },
    { key: 'vex-rdo', name: 'Lia', role: 'Diário de Obra (RDO)', emoji: '📋', cat: 'sugerido',
      desc: 'Cobra e organiza os RDOs de cada canteiro e resume o dia.',
      why: 'RDO em dia é registro, prova e indicador ao mesmo tempo.',
      look: { skin: '#f7d7bd', hair: '#a8702f', style: 'coque', shirt: '#c8561a', pants: '#26304a', glasses: null, beard: null } },
    { key: 'vex-qualidade', name: 'Caio', role: 'Qualidade & Segurança', emoji: '⛑️', cat: 'sugerido',
      desc: 'Checklists, não conformidades e prazos de correção.',
      why: 'Retrabalho e acidente são os custos que mais doem; ele mede os dois.',
      look: { skin: '#c9854f', hair: '#1a120d', style: 'raspado', shirt: '#2b3d44', pants: '#3b3f52', glasses: null, beard: 'cheia' } },
    { key: 'vex-financeiro', name: 'Rita', role: 'Financeiro', emoji: '🧾', cat: 'sugerido',
      desc: 'Fluxo de caixa, medições e contas a pagar e a receber por obra.',
      why: 'Caixa por obra mostra qual contrato sustenta o grupo.',
      look: { skin: '#7a4a2c', hair: '#140f0c', style: 'cacheado', shirt: '#1b2856', pants: '#1b2030', glasses: 'redondo', beard: null } },
    { key: 'vex-juridico', name: 'Júlio', role: 'Contratos & Jurídico', emoji: '⚖️', cat: 'sugerido',
      desc: 'Prazos contratuais, aditivos e pendências jurídicas.',
      why: 'Aditivo esquecido vira prejuízo; ele controla os prazos.',
      look: { skin: '#f0c29b', hair: '#8e8e93', style: 'curto', shirt: '#f2f2ef', pants: '#1e293b', glasses: 'retangular', beard: null } },
    { key: 'vex-comercial', name: 'Marta', role: 'Comercial & Propostas', emoji: '📈', cat: 'sugerido',
      desc: 'Orçamentos, propostas e funil de novos clientes.',
      why: 'Sem proposta saindo, a carteira de obras seca em poucos meses.',
      look: { skin: '#e0a878', hair: '#6b4423', style: 'chanel', shirt: '#2f8f94', pants: '#26304a', glasses: null, beard: null } },
    { key: 'vex-marketing', name: 'Nina', role: 'Marketing & Conteúdo', emoji: '📱', cat: 'sugerido',
      desc: 'Calendário de redes, cases de obra e materiais da marca.',
      why: 'Obra bem entregue que ninguém vê não gera a próxima.',
      look: { skin: '#f7d7bd', hair: '#241a13', style: 'rabo', shirt: '#c8561a', pants: '#1b2030', glasses: null, beard: null } },
    { key: 'vex-view', name: 'Vítor', role: 'VEX View · Imagens aéreas', emoji: '🛰️', cat: 'sugerido',
      desc: 'Organiza voos de drone, imagens e relatórios visuais por obra.',
      why: 'Imagem aérea mostra avanço que planilha não mostra.',
      look: { skin: '#c9854f', hair: '#140f0c', style: 'curto', shirt: '#0f0f0f', pants: '#3b3f52', glasses: null, beard: 'cavanhaque' } },
    { key: 'vex-bi', name: 'Dora', role: 'Indicadores & BI', emoji: '📊', cat: 'sugerido',
      desc: 'Junta os números dos outros agentes e mostra o que mudou na semana.',
      why: 'Com vários agentes trabalhando, alguém precisa olhar o todo.',
      look: { skin: '#f0c29b', hair: '#140f0c', style: 'longo', shirt: '#5b6b70', pants: '#1b2030', glasses: 'redondo', beard: null } }
  ];

  /* ===========================================================
     ESTADO
     =========================================================== */
  let team = [];

  function defaults() {
    const base = BOSSES.map(b => Object.assign({}, b, { look: Object.assign({}, b.look) }));
    // começa só com o agente de exemplo, para mostrar como funciona
    for (const k of ['exemplo']) {
      const c = CATALOG.find(c => c.key === k);
      base.push(fromCatalog(c));
    }
    return base;
  }

  function fromCatalog(c) {
    return {
      id: 'ag-' + c.key,
      key: c.key,
      name: c.name,
      role: c.role,
      emoji: c.emoji,
      system: c.system || null,
      sistema: c.sistema || null,
      path: c.path || null,
      brief: c.desc,
      dept: 'servico',
      slotId: null,
      status: 'trabalhando',
      boss: false,
      locked: false,
      look: AVATAR.makeLook(c.key, c.look)
    };
  }

  /* ===========================================================
     PERSISTÊNCIA

     O disco manda. A equipe já morava só no localStorage do navegador
     e um dia voltou inteira ao padrão: nome que você deu, contratação,
     estação, horário — tudo perdido de uma vez, sem aviso. O navegador
     limpa storage quando quer. Agora o arquivo é data/equipe.json, no
     servidor, e o localStorage é só um espelho para quando ele estiver
     fora do ar.
     =========================================================== */
  const doLocal = () => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      return d && Array.isArray(d.team) && d.team.length ? d.team : null;
    } catch (e) { return null; }
  };

  async function load() {
    let vindoDoDisco = null;
    try {
      const d = await (await fetch('/api/equipe')).json();
      if (d && Array.isArray(d.team) && d.team.length) vindoDoDisco = d.team;
    } catch (e) { /* servidor fora: vale o que o navegador tiver */ }

    team = vindoDoDisco || doLocal() || defaults();
    recompor();              // equipe salva antes pode não ter os campos novos
    if (!vindoDoDisco) save();   // primeira vez ou migração: carimba no disco
  }

  /** reencaixa campos que chegaram depois de a equipe já ter sido salva,
      como o id do sistema que o agente opera */
  function recompor() {
    for (const a of team) {
      const c = CATALOG.find(c => c.key === a.key);
      if (c) {
        if (!a.sistema && c.sistema) a.sistema = c.sistema;
        if (c.path && a.path !== c.path) a.path = c.path;
      }
      const b = BOSSES.find(b => b.id === a.id);
      if (b && !a.sistema && b.sistema) a.sistema = b.sistema;
      // sem look o boneco não é desenhado: fica um funcionário invisível na
      // mesa. Reconstrói a partir da key, que é determinística — o mesmo
      // agente volta com a mesma cara de sempre.
      if (!a.look || !a.look.skin) {
        const base = (c && c.look) || (b && b.look) || {};
        a.look = AVATAR.makeLook(a.key || a.id, Object.assign({}, base));
      }
    }
  }

  let gravando = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ team, v: 1 })); }
    catch (e) { /* storage bloqueado: o disco ainda pega */ }
    // junta as chamadas seguidas num POST só — arrastar um agente dispara
    // save() várias vezes por segundo
    clearTimeout(gravando);
    gravando = setTimeout(() => {
      fetch('/api/equipe', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, v: 1 })
      }).catch(() => { /* offline: fica o espelho do navegador */ });
    }, 300);
  }

  function reset() { team = defaults(); save(); }

  /* ---------- operações ---------- */
  function hire(key) {
    const c = CATALOG.find(c => c.key === key);
    if (!c || team.some(a => a.key === key)) return null;
    const a = fromCatalog(c);
    team.push(a); save();
    return a;
  }

  function hireCustom(data) {
    const key = 'custom-' + Date.now().toString(36);
    const a = {
      id: 'ag-' + key, key,
      name: data.name || 'Novo agente',
      role: data.role || 'Função a definir',
      emoji: data.emoji || '🤖',
      system: data.system || null, path: data.path || null,
      sistema: data.sistema || null, reuniao: data.reuniao !== false,
      brief: data.brief || '',
      dept: 'servico', slotId: null, status: 'trabalhando',
      boss: false, locked: false, custom: true,
      look: AVATAR.makeLook(key, data.look || {})
    };
    team.push(a); save();
    return a;
  }

  function fire(id) {
    const i = team.findIndex(a => a.id === id);
    if (i < 0 || team[i].locked) return false;
    team.splice(i, 1); save();
    return true;
  }

  const get = (id) => team.find(a => a.id === id);
  const all = () => team;
  const isHired = (key) => team.some(a => a.key === key);
  const count = (st) => team.filter(a => a.status === st).length;

  return { BOSSES, CATALOG, load, save, reset, hire, hireCustom, fire,
           get, all, isHired, count, fromCatalog };
})();
