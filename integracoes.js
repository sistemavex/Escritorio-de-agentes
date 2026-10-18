/*
 * Integrações dos agentes VEX com sistemas externos (hoje: Sistema VEX, somente leitura).
 *
 * Como liga um agente:
 *   1. agentes-vex/<pasta>/agente.json → integracoes: { "nome": "Sistema VEX", "conectado": true, "acesso": "leitura" }
 *   2. arquivo de segredos (FORA do repositório) com a chave do agente:  VEX_TOKEN_03=vexag_...
 *      padrão: %USERPROFILE%\.vex-agentes\segredos.env   (ou o caminho em VEX_SEGREDOS)
 * Com as duas coisas, a conversa e a reunião passam ao Claude Code o servidor MCP "vex"
 * (agentes-vex/mcp-vex/servidor.js) e liberam só as ferramentas dele (mcp__vex).
 * A chave nunca vai para a linha de comando: o Claude Code lê ${VEX_TOKEN_NN} do ambiente.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ARQ_SEGREDOS = process.env.VEX_SEGREDOS || path.join(os.homedir(), '.vex-agentes', 'segredos.env');
const SERVIDOR_VEX = path.join(__dirname, 'agentes-vex', 'mcp-vex', 'servidor.js');

/** Lê o arquivo de segredos (CHAVE=valor por linha; # é comentário). Relê a cada chamada: dá para trocar sem reiniciar. */
function segredos() {
  const out = {};
  let texto = '';
  try { texto = fs.readFileSync(ARQ_SEGREDOS, 'utf8'); } catch (e) { return out; }
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !linha.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Ambiente para o processo do Claude Code: o do escritório + os segredos. */
function ambiente() {
  return Object.assign({}, process.env, segredos());
}

function lerAgente(pasta) {
  try { return JSON.parse(fs.readFileSync(path.join(pasta, 'agente.json'), 'utf8')); } catch (e) { return null; }
}

/**
 * Argumentos extras do Claude Code para este agente.
 * Devolve { args: [...], aviso: string|null }. Sem integração ligada, args vem vazio.
 */
function argsDoAgente(pasta) {
  const ag = lerAgente(pasta);
  if (!ag) return { args: [], aviso: null };
  const vex = (ag.integracoes || []).find(i => /sistema vex/i.test(i.nome || '') && i.conectado === true);
  if (!vex) return { args: [], aviso: null };

  const variavel = 'VEX_TOKEN_' + String(ag.n || '').padStart(2, '0');
  const env = ambiente();
  if (!env[variavel]) {
    return { args: [], aviso: `Sistema VEX marcado como conectado, mas falta ${variavel} em ${ARQ_SEGREDOS}. O agente vai trabalhar sem acesso.` };
  }
  const config = {
    mcpServers: {
      vex: {
        command: process.execPath,                // o mesmo node que roda o escritório
        args: [SERVIDOR_VEX],
        env: {
          VEX_AGENTE_TOKEN: '${' + variavel + '}', // o Claude Code expande a partir do ambiente
          VEX_API_URL: env.VEX_API_URL || 'https://sistemavex.com.br',
        },
      },
    },
  };
  return {
    args: ['--mcp-config', JSON.stringify(config), '--strict-mcp-config', '--allowedTools', 'mcp__vex'],
    aviso: null,
  };
}

module.exports = { argsDoAgente, ambiente, segredos, ARQ_SEGREDOS };
