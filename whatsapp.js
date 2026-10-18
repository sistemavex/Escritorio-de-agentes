/* ===========================================================
   whatsapp.js — resultados dos agentes no grupo do WhatsApp

   O escritório não fala com o WhatsApp direto: ele manda um POST para
   um webhook do Make (cenário "ESCRITÓRIO VEX - AGENTES → WHATSAPP"),
   que passa a mensagem para a Z-API e dela para o grupo.

   data/config.json (fora do git):
     "whatsapp": { "ativo": true, "webhook": "https://hook...make.com/...",
                   "chave": "<a mesma do filtro do cenário>",
                   "rotinas": true, "reuniao": true }

   As mensagens saem todas do mesmo número; cada uma começa com o emoji
   e o nome do agente.
   =========================================================== */
'use strict';

const LIMITE = 3500;   // o WhatsApp aceita mais, mas mensagem longa ninguém lê

/** separa o bloco <<<WHATSAPP ... WHATSAPP>>> que o agente escreve para o grupo */
function extrairBloco(texto) {
  const m = /<<<\s*WHATSAPP\s*\n?([\s\S]*?)\n?\s*WHATSAPP\s*>>>/i.exec(texto || '');
  return { bloco: m ? m[1].trim() : null, resto: m ? (texto.slice(0, m.index) + texto.slice(m.index + m[0].length)).trim() : String(texto || '') };
}

/** markdown do Claude → formatação do WhatsApp */
function paraWhatsapp(t) {
  return String(t || '')
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s*(.+)$/gm, '*$1*')                    // títulos viram negrito
    .replace(/\*\*(.+?)\*\*/g, '*$1*')                        // **x** → *x*
    .replace(/^\s*\|?\s*-{3,}.*$/gm, '')                      // linha separadora de tabela
    .replace(/^\s*\|(.+)\|\s*$/gm, (_, l) => '• ' + l.split('|').map(c => c.trim()).filter(Boolean).join(' · '))
    .replace(/^>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cortar(t, n = LIMITE) {
  if (t.length <= n) return t;
  const c = t.slice(0, n);
  const fim = Math.max(c.lastIndexOf('\n'), n - 200);
  return c.slice(0, fim).trim() + '\n…';
}

function criar(lerConfig) {
  const cfg = () => (lerConfig().whatsapp || {});

  async function enviar(mensagem, tipo) {
    const c = cfg();
    if (!c.ativo || !c.webhook) return { ok: false, motivo: 'WhatsApp desligado na configuração' };
    if (tipo && c[tipo] === false) return { ok: false, motivo: 'envio de ' + tipo + ' desligado' };
    const ctrl = new AbortController();
    const corta = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(c.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: c.chave || '', tipo: tipo || 'aviso', mensagem: cortar(mensagem) }), signal: ctrl.signal });
      return r.ok ? { ok: true } : { ok: false, motivo: 'Make respondeu ' + r.status };
    } catch (e) { return { ok: false, motivo: 'não consegui falar com o Make: ' + e.message }; }
    finally { clearTimeout(corta); }
  }

  /** mensagem de uma rotina: cabeçalho do agente + o bloco para o grupo (ou o começo da resposta) */
  function mensagemRotina({ emoji, nome, comando, quando, texto }) {
    const { bloco, resto } = extrairBloco(texto);
    // sem o bloco próprio para o grupo, vai só o começo, com aviso de onde está o resto
    const corpo = bloco ? paraWhatsapp(bloco) : cortar(paraWhatsapp(resto), 1200) + '\n\n_Relatório completo no painel do agente._';
    return `${emoji || '🤖'} *${nome} · ${comando}*\n_Escritório VEX · ${quando}_\n\n${corpo}`;
  }

  return { enviar, mensagemRotina, extrairBloco, paraWhatsapp, ligado: () => !!(cfg().ativo && cfg().webhook) };
}

module.exports = { criar, extrairBloco, paraWhatsapp };
