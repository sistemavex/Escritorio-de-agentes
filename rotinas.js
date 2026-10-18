/* ===========================================================
   rotinas.js — tarefas com dia e hora para cada agente

   Ex.: "Otto, seg a sáb às 7h30: AUDITAR RDOs". Na hora marcada o
   escritório manda o comando ao agente como se você tivesse clicado no
   botão: o Claude Code abre na pasta dele (CLAUDE.md, memória, Sistema VEX
   se estiver conectado), em modo SOMENTE LEITURA, e a resposta vira uma
   entrega em agentes-vex/<pasta>/entregas/, que aparece no painel dele.

   - Fica em data/rotinas.json (fora do git). Na primeira vez nasce de
     data/rotinas.exemplo.json.
   - Uma de cada vez. Se o escritório estava desligado na hora, roda quando
     voltar, desde que não tenham passado mais de 12 horas. Nunca roda duas
     vezes a mesma hora marcada.
   - Cada execução é uma chamada ao Claude e consome a cota do seu plano.
   =========================================================== */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const JANELA = 12 * 3600 * 1000;       // atraso máximo para ainda rodar uma rotina perdida
const LIMITE = 10 * 60 * 1000;         // tempo máximo de uma execução
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

let dep = null;     // { ROOT, lerRegistro, CLAUDE_BIN, INTEGRACOES, avisar, nomeDoAgente }
let rodando = null; // { id, desde }
const arq = () => path.join(dep.ROOT, 'data', 'rotinas.json');

function ler() {
  try {
    const d = JSON.parse(fs.readFileSync(arq(), 'utf8'));
    return { rotinas: Array.isArray(d.rotinas) ? d.rotinas : [], historico: Array.isArray(d.historico) ? d.historico : [] };
  } catch (e) { return { rotinas: [], historico: [] }; }
}
function gravar(d) {
  fs.mkdirSync(path.dirname(arq()), { recursive: true });
  fs.writeFileSync(arq(), JSON.stringify({ _leia: 'Rotinas dos agentes. Edite pela ficha do agente no escritório 3D. dias: 0 = domingo ... 6 = sábado.', ...d }, null, 2) + '\n');
}

/* ---------------- calendário ---------------- */
const horaMin = (h) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(h || '')); return m ? [+m[1], +m[2]] : null; };
function vezEm(r, dia) {
  const hm = horaMin(r.hora); if (!hm) return null;
  const d = new Date(dia); d.setHours(hm[0], hm[1], 0, 0);
  return (r.dias || []).includes(d.getDay()) ? d.getTime() : null;
}
/** última hora marcada que já passou (até 8 dias atrás) */
function ultimaDevida(r, agora = Date.now()) {
  for (let i = 0; i <= 8; i++) {
    const t = vezEm(r, agora - i * 86400000);
    if (t && t <= agora) return t;
  }
  return null;
}
/** próxima hora marcada no futuro */
function proxima(r, agora = Date.now()) {
  for (let i = 0; i <= 8; i++) {
    const t = vezEm(r, agora + i * 86400000);
    if (t && t > agora) return t;
  }
  return null;
}
const textoDias = (dias) => {
  const d = [...new Set(dias || [])].sort();
  if (d.length === 7) return 'todo dia';
  if (d.join() === '1,2,3,4,5') return 'seg a sex';
  if (d.join() === '1,2,3,4,5,6') return 'seg a sáb';
  return d.map(x => DIAS[x]).join(', ');
};

/* ---------------- execução ---------------- */
const slug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'rotina';
const dois = (n) => String(n).padStart(2, '0');

function executar(r, agendada, manual) {
  return new Promise((resolve) => {
    const s = dep.lerRegistro()[r.sistema];
    if (!s || !s.pasta || !fs.existsSync(s.pasta)) return resolve({ ok: false, erro: 'agente sem pasta no registro: ' + r.sistema });
    const nome = dep.nomeDoAgente(r.sistema) || s.nome || r.sistema;
    const quando = new Date(agendada);
    const prompt =
      `ROTINA AGENDADA — ${DIAS[quando.getDay()]} ${quando.toLocaleDateString('pt-BR')} ${dois(quando.getHours())}:${dois(quando.getMinutes())}` +
      `${manual ? ' (disparada agora pelo dono)' : ''}\n\n` +
      `Comando: ${r.comando}\n\n` +
      `Execute este comando conforme a sua missão e entregue no seu FORMATO padrão. Esta execução é automática e ninguém ` +
      `está acompanhando: não faça perguntas e não faça o onboarding. Use as fontes conectadas (veja agente.json), a sua ` +
      `memória e as entregas recentes. O que faltar vira a seção "dados pendentes". Comece com um resumo de até 3 linhas. ` +
      `O escritório salva a sua resposta nas suas entregas; não tente gravar arquivos.` +
      (dep.WHATS && dep.WHATS.ligado() ?
        `\n\nNo FINAL da resposta, escreva um bloco para o grupo da equipe no WhatsApp, entre as linhas <<<WHATSAPP e WHATSAPP>>>: ` +
        `até 10 linhas, só os pontos principais com número e obra, e as ações com responsável. Sem tabelas; use *negrito* do WhatsApp e "•" nas listas.` : '');
    const args = ['-p', '--output-format', 'json', '--permission-mode', 'plan',
                  '--append-system-prompt', s.papel || ('Você é ' + nome + ', agente do escritório. Responda em português do Brasil.')];
    for (const d of s.compartilhar || []) args.push('--add-dir', d);
    args.push(...dep.INTEGRACOES.argsDoAgente(s.pasta).args);

    let saida = '', erroSaida = '';
    let proc;
    try { proc = spawn(dep.CLAUDE_BIN, args, { cwd: s.pasta, env: dep.INTEGRACOES.ambiente(), stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { return resolve({ ok: false, erro: 'não consegui executar o claude: ' + e.message }); }
    const corta = setTimeout(() => { try { proc.kill(); } catch (e) {} }, LIMITE);
    proc.stdin.on('error', () => {});
    proc.stdin.end(prompt, 'utf8');
    proc.stdout.on('data', d => saida += d);
    proc.stderr.on('data', d => erroSaida += d);
    proc.on('error', e => { clearTimeout(corta); resolve({ ok: false, erro: 'não consegui executar o claude: ' + e.message }); });
    proc.on('exit', () => {
      clearTimeout(corta);
      let j = null; try { j = JSON.parse(saida); } catch (e) {}
      const texto = j ? String(j.result || '').trim() : '';
      if (!j || !texto) return resolve({ ok: false, erro: (erroSaida || saida || 'sem resposta (tempo esgotado?)').slice(0, 300) });
      if (/not logged in|please run \/login|failed to authenticate|oauth session expired/i.test(texto))
        return resolve({ ok: false, erro: 'O Claude Code não está autenticado nesta máquina. Rode claude no terminal e faça /login.' });
      const custo = +j.total_cost_usd || 0;
      // a resposta vira uma entrega no painel do agente
      const d = new Date();
      const nomeArq = `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}-${dois(d.getHours())}${dois(d.getMinutes())}-${slug(r.comando)}.md`;
      try {
        fs.mkdirSync(path.join(s.pasta, 'entregas'), { recursive: true });
        fs.writeFileSync(path.join(s.pasta, 'entregas', nomeArq),
          `# ${r.comando}\n\n> Rotina ${manual ? 'disparada manualmente' : 'automática'} · ${nome} · ${d.toLocaleString('pt-BR')}` +
          ` · ${textoDias(r.dias)} às ${r.hora} · custo US$ ${custo.toFixed(2)}\n\n${texto}\n`);
      } catch (e) { return resolve({ ok: false, erro: 'não consegui salvar a entrega: ' + e.message, custo }); }
      resolve({ ok: !j.is_error, erro: j.is_error ? texto.slice(0, 300) : null, arquivo: nomeArq, custo, texto,
                resumo: (dep.WHATS ? dep.WHATS.extrairBloco(texto).resto : texto).slice(0, 400) });
    });
  });
}

/** roda uma rotina e registra o resultado (relendo o arquivo: a tela pode ter mudado a lista enquanto isso) */
async function rodar(id, agendada, manual) {
  if (rodando) return { ok: false, motivo: 'outra rotina está rodando agora' };
  const r = ler().rotinas.find(x => x.id === id);
  if (!r) return { ok: false, motivo: 'rotina não encontrada' };
  rodando = { id, desde: Date.now() };
  const marca = (fn) => { const d = ler(); const x = d.rotinas.find(y => y.id === id); if (x) fn(x, d); gravar(d); };
  marca(x => { x.emCurso = { agendada, desde: Date.now() }; });
  const nome = dep.nomeDoAgente(r.sistema) || r.sistema;
  console.log(`  ⏰ rotina: ${nome} → ${r.comando}${manual ? ' (manual)' : ''}`);
  let res;
  try { res = await executar(r, agendada, manual); } catch (e) { res = { ok: false, erro: String(e && e.message || e) }; }
  // resultado no grupo do WhatsApp (via Make)
  let whatsapp = null;
  if (res.ok && res.texto && dep.WHATS && dep.WHATS.ligado()) {
    const s = dep.lerRegistro()[r.sistema] || {};
    let emoji = null; try { emoji = JSON.parse(fs.readFileSync(path.join(s.pasta, 'agente.json'), 'utf8')).emoji; } catch (e) {}
    const q = new Date(agendada);
    const w = await dep.WHATS.enviar(dep.WHATS.mensagemRotina({ emoji, nome, comando: r.comando,
      quando: `${DIAS[q.getDay()]} ${q.toLocaleDateString('pt-BR').slice(0, 5)} ${dois(q.getHours())}:${dois(q.getMinutes())}`, texto: res.texto }), 'rotinas');
    whatsapp = w.ok ? 'enviado' : w.motivo;
  }
  const ultima = { agendada, quando: Date.now(), manual: !!manual, ok: res.ok, erro: res.erro || null, arquivo: res.arquivo || null, custo: res.custo || 0, resumo: res.resumo || null, whatsapp };
  marca((x, d) => {
    delete x.emCurso;
    x.ultima = ultima;
    d.historico.unshift({ id, sistema: x.sistema, agente: nome, comando: x.comando, ...ultima });
    d.historico = d.historico.slice(0, 100);
  });
  rodando = null;
  dep.avisar(res.ok ? `${nome}: ${r.comando}` : `Rotina falhou: ${nome}`,
    res.ok ? (res.resumo || '').split('\n').filter(Boolean).slice(0, 3).join('\n').slice(0, 300) : (res.erro || 'erro'),
    res.ok ? 'normal' : 'alta');
  return { ok: true, resultado: ultima };
}

/* ---------------- relógio ---------------- */
async function conferir() {
  if (rodando) return;
  const agora = Date.now();
  const devidas = ler().rotinas
    .filter(r => r.ativo !== false && r.comando && r.sistema)
    .map(r => ({ r, t: ultimaDevida(r, agora) }))
    .filter(({ r, t }) => t && t >= (r.desde || 0) && agora - t < JANELA && !(r.ultima && r.ultima.agendada >= t) && !(r.emCurso && r.emCurso.agendada >= t))
    .sort((a, b) => a.t - b.t);
  if (devidas.length) await rodar(devidas[0].r.id, devidas[0].t, false);
}

/* ---------------- validação da lista que vem da tela ---------------- */
function salvarLista(lista) {
  if (!Array.isArray(lista)) return { ok: false, motivo: 'lista inválida' };
  const reg = dep.lerRegistro();
  const antes = new Map(ler().rotinas.map(r => [r.id, r]));
  const limpa = [];
  for (const x of lista.slice(0, 200)) {
    const dias = [...new Set((x.dias || []).map(Number).filter(n => n >= 0 && n <= 6))].sort();
    const comando = String(x.comando || '').trim().slice(0, 400);
    if (!reg[x.sistema]) return { ok: false, motivo: 'agente desconhecido: ' + x.sistema };
    if (!horaMin(x.hora)) return { ok: false, motivo: 'hora inválida: ' + x.hora };
    if (!comando) return { ok: false, motivo: 'rotina sem comando' };
    const id = /^[a-z0-9-]{3,60}$/.test(x.id || '') ? x.id : 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const velho = antes.get(id) || {};
    const hora = x.hora.padStart(5, '0');
    // rotina nova, ou que mudou de dia/hora, só vale daqui para frente: não "recupera" um horário que já passou
    const mudou = !velho.id || velho.hora !== hora || String(velho.dias) !== String(dias) || (velho.ativo === false && x.ativo !== false);
    limpa.push({ id, sistema: x.sistema, dias, hora, comando, ativo: x.ativo !== false, desde: mudou ? Date.now() : (velho.desde || 0),
                 ultima: velho.ultima || null, ...(velho.emCurso ? { emCurso: velho.emCurso } : {}) });
  }
  const d = ler(); d.rotinas = limpa; gravar(d);
  return { ok: true };
}

function estadoAtual() {
  const d = ler(), agora = Date.now();
  return {
    rodando,
    rotinas: d.rotinas.map(r => ({ ...r, proxima: r.ativo === false ? null : proxima(r, agora), quando: textoDias(r.dias) + ' às ' + r.hora })),
    historico: d.historico.slice(0, 30)
  };
}

function init(d) {
  dep = d;
  if (!fs.existsSync(arq())) {
    // as do exemplo também só valem a partir de agora
    try { const ex = JSON.parse(fs.readFileSync(path.join(dep.ROOT, 'data', 'rotinas.exemplo.json'), 'utf8'));
          gravar({ rotinas: (ex.rotinas || []).map(r => ({ ...r, desde: Date.now() })), historico: [] }); } catch (e) { /* começa sem rotinas */ }
  }
  // execução interrompida (escritório caiu no meio) não fica presa
  try { const x = ler(); x.rotinas.forEach(r => delete r.emCurso); gravar(x); } catch (e) {}
  // espera os painéis subirem antes da primeira conferência
  setTimeout(() => conferir().catch(() => {}), 45000);
  setInterval(() => conferir().catch(() => {}), 60000);
  return { estadoAtual, salvarLista, rodar: (id) => rodar(id, Date.now(), true), ocupado: () => !!rodando };
}

module.exports = { init };
