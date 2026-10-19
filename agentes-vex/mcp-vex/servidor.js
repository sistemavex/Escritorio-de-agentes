#!/usr/bin/env node
/*
 * Servidor MCP do Sistema VEX para os agentes do Escritório — SOMENTE LEITURA, sem dependências.
 * O Claude Code inicia este arquivo (stdio) quando o agente tem "Sistema VEX" conectado no agente.json.
 *
 * Variáveis (o escritório passa sozinho, vindas do arquivo de segredos):
 *   VEX_AGENTE_TOKEN  chave do agente (vexag_...), gerada no Sistema VEX (SQL X02)
 *   VEX_API_URL       endereço do sistema (padrão https://sistemavex.com.br)
 *
 * Teste rápido no terminal (sem Claude):  node servidor.js --teste
 */
'use strict';

const API = (process.env.VEX_API_URL || 'https://sistemavex.com.br').replace(/\/+$/, '');
const TOKEN = process.env.VEX_AGENTE_TOKEN || '';
const log = (...a) => process.stderr.write('[mcp-vex] ' + a.join(' ') + '\n'); // stdout é só do protocolo

const obra = { type: 'string', description: 'Id da obra ou parte do nome (ex.: "34.2", "Aruanã"). Vazio = todas as obras liberadas.' };
const data = (d) => ({ type: 'string', description: d + ' no formato AAAA-MM-DD', pattern: '^\\d{4}-\\d{2}-\\d{2}$' });

// recurso da API -> ferramenta
const FERRAMENTAS = [
  { name: 'quem_sou', recurso: 'eu', description: 'Mostra quem é este agente no Sistema VEX: recursos liberados e lista de obras que pode consultar. Use primeiro, se não souber os nomes das obras.', props: {} },
  { name: 'obras', recurso: 'obras', description: 'Obras liberadas com status, datas, avanço físico, previsão de prazo (sinal verde/amarelo/vermelho, término estimado), atividades atrasadas e abaixo do ritmo, avanço e situação POR ETAPA (Fundação, Estrutura…) e data do último RDO.', props: { obra } },
  { name: 'rdos', recurso: 'rdos', description: 'Diários de obra (RDO) de um período: atividades, ocorrências, não conformidades, clima, fotos, equipe, se está aprovado. Traz também os dias de SEGUNDA A SEXTA sem RDO por obra (o prazo do RDO é o dia seguinte, então hoje e ontem ainda não contam; sábado nunca é falta). Padrão: últimos 7 dias.', props: { obra, desde: data('Início do período'), ate: data('Fim do período') } },
  { name: 'atividades', recurso: 'atividades', description: 'Atividades do cronograma das obras com etapa, situação (atrasada, em_andamento, nao_iniciada = já devia ter começado, futura, concluida), se está abaixo do ritmo (20 pontos ou mais atrás do que o tempo pede), datas, % de avanço, empreiteiro e o histórico: data do último avanço, dias sem avanço, se está parada e quantos RDOs dos últimos 14 dias citaram a atividade (no_rdo_mas_sem_avanco = aparece no RDO mas o % não sai do lugar).', props: { obra, situacao: { type: 'string', enum: ['abertas', 'atrasadas', 'paradas', 'todas'], description: 'abertas (padrão) = atrasadas, em andamento, não iniciadas e as que começam em 30 dias; paradas = abertas sem mudar o % há 14 dias ou mais' } } },
  { name: 'pendencias', recurso: 'pendencias', description: 'Pendências de projeto: descrição, disciplina, responsável, status e há quantos dias está aberta.', props: { obra, status: { type: 'string', enum: ['abertas', 'todas'], description: 'abertas (padrão) ou todas' } } },
  { name: 'suprimentos', recurso: 'suprimentos', description: 'Solicitações de material e ordens de compra dos últimos 60 dias, com status, fornecedor e valor.', props: { obra } },
  { name: 'custos', recurso: 'custos', description: 'Custo das obras: orçado, gasto, pago, compromissos, projeção final, desvio % e sinal, por categoria.', props: { obra } },
  { name: 'alertas', recurso: 'alertas', description: 'Alertas abertos das obras e previsão de prazo (obras caminhando para atraso, atividades que vão atrasar, atividades que não começaram).', props: { obra } },
  { name: 'financeiro', recurso: 'financeiro', description: 'Financeiro da empresa: contas a pagar por faixa (atrasadas, hoje, resto desta semana, próxima semana, depois) com as maiores de cada faixa, mão de obra estimada da semana por obra, fluxo de caixa das próximas 8 semanas e projeção ao término de cada obra. Agente restrito a algumas obras vê só as contas e o término delas, sem o fluxo da empresa.', props: { data: data('Data de referência; padrão: hoje') } },
];

async function chamarApi(recurso, args) {
  if (!TOKEN) throw new Error('Sem chave do Sistema VEX (VEX_AGENTE_TOKEN). Confira o arquivo de segredos do escritório.');
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, String(v).trim());
  const url = `${API}/api/agentes/${recurso}${q.toString() ? '?' + q : ''}`;
  const ctrl = new AbortController();
  const corta = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN }, signal: ctrl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(`Sistema VEX respondeu ${r.status}: ${j.erro || 'erro'}`);
    return j;
  } finally { clearTimeout(corta); }
}

let liberados = null; // recursos da chave (para listar só as ferramentas permitidas)
async function ferramentasPermitidas() {
  if (liberados === null) {
    try { liberados = (await chamarApi('eu', {})).dados.recursos || []; }
    catch (e) { log('não consegui ler os recursos da chave:', e.message); liberados = []; }
  }
  return FERRAMENTAS.filter(f => f.recurso === 'eu' || liberados.includes(f.recurso));
}

const esquema = (props) => ({ type: 'object', properties: props, additionalProperties: false });

async function tratar(msg) {
  const { id, method, params } = msg;
  const responde = (result) => id !== undefined && enviar({ jsonrpc: '2.0', id, result });
  const falha = (code, message) => id !== undefined && enviar({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize':
      return responde({
        protocolVersion: (params && params.protocolVersion) || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'vex', version: '1.0.0' },
        instructions: 'Ferramentas de LEITURA do Sistema VEX (obras, RDOs, cronograma, pendências, suprimentos, custos, alertas). Não gravam nada. Cite a data da consulta e não invente dados que não vieram daqui.',
      });
    case 'ping':
      return responde({});
    case 'tools/list': {
      const lista = await ferramentasPermitidas();
      return responde({ tools: lista.map(f => ({
        name: f.name, description: f.description, inputSchema: esquema(f.props),
        annotations: { title: f.name, readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      })) });
    }
    case 'tools/call': {
      const f = FERRAMENTAS.find(x => x.name === (params && params.name));
      if (!f) return falha(-32602, 'Ferramenta desconhecida: ' + (params && params.name));
      try {
        const j = await chamarApi(f.recurso, (params && params.arguments) || {});
        const texto = JSON.stringify({ consultado_em: j.consultado_em, dados: j.dados });
        return responde({ content: [{ type: 'text', text: texto.length > 90000 ? texto.slice(0, 90000) + ' …(cortado: filtre por obra ou período)' : texto }] });
      } catch (e) {
        return responde({ content: [{ type: 'text', text: 'Erro: ' + e.message }], isError: true });
      }
    }
    default:
      if (method && method.startsWith('notifications/')) return; // notificações não têm resposta
      return falha(-32601, 'Método não suportado: ' + method);
  }
}

function enviar(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

// --- teste no terminal ---
if (process.argv.includes('--teste')) {
  (async () => {
    try {
      const eu = await chamarApi('eu', {});
      console.log('Conectado como', eu.dados.agente, '| recursos:', eu.dados.recursos.join(', '));
      console.log('Obras liberadas:', eu.dados.obras.map(o => o.nome).join(' | '));
    } catch (e) { console.error('Falhou:', e.message); process.exitCode = 1; }
  })();
} else {
  // --- protocolo MCP por stdio: uma mensagem JSON por linha ---
  let buffer = '', pendentes = 0, fim = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (pedaco) => {
    buffer += pedaco;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!linha) continue;
      let msg;
      try { msg = JSON.parse(linha); } catch (e) { log('linha inválida'); continue; }
      pendentes++;
      Promise.resolve(tratar(msg)).catch(e => log('erro:', e.message)).finally(() => { pendentes--; if (fim && !pendentes) process.exit(0); });
    }
  });
  // entrada fechou: espera as respostas que ainda estão a caminho
  process.stdin.on('end', () => { fim = true; if (!pendentes) process.exit(0); });
}
