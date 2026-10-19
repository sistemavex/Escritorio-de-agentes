/* ===========================================================
   saude.js — avisa quando o escritório perde o Sistema VEX

   De minuto em minuto o escritório testa se alcança o Sistema VEX
   (GET /api/automacao/whatsapp-recebido, que não pede chave). Se ficar
   10 minutos sem conseguir, avisa uma vez; quando voltar, avisa de novo
   com quanto tempo durou. Nesse intervalo rotinas, reunião e perguntas
   do grupo não conseguem ler os dados.

   O aviso vai para o grupo do WhatsApp (via Make, que costuma continuar
   alcançável) e para o seu celular, se os avisos (ntfy ou CallMeBot)
   estiverem configurados. Desliga com whatsapp.alertas: false.
   =========================================================== */
'use strict';

const INTERVALO = 60 * 1000;
const TOLERANCIA = 10 * 60 * 1000;

let dep = null;     // { INTEGRACOES, WHATS, avisar, config, toleranciaMs? }
let tolerancia = TOLERANCIA;
const estado = { ok: null, falhandoDesde: null, avisado: false, ultimoTeste: null, ultimoErro: null };

const min = (ms) => Math.max(1, Math.round(ms / 60000));
const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

async function testar() {
  const api = (dep.INTEGRACOES.ambiente().VEX_API_URL || 'https://sistemavex.com.br').replace(/\/+$/, '');
  const ctrl = new AbortController(); const corta = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(api + '/api/automacao/whatsapp-recebido', { signal: ctrl.signal });
    return r.status < 500 ? null : 'respondeu ' + r.status;
  } catch (e) { return (e.cause && e.cause.code) || e.message; }
  finally { clearTimeout(corta); }
}

async function avisar(titulo, texto, prioridade) {
  console.log('  ' + (prioridade === 'alta' ? '⚠' : '✓') + ' ' + titulo + ': ' + texto.split('\n')[0]);
  dep.avisar(titulo, texto, prioridade);
  const c = dep.config().whatsapp || {};
  if (c.alertas !== false && dep.WHATS.ligado()) await dep.WHATS.enviar(`${prioridade === 'alta' ? '⚠️' : '✅'} *${titulo}*\n${texto}`, 'alertas');
}

async function conferir() {
  const erro = await testar();
  const agora = Date.now();
  estado.ultimoTeste = agora;
  if (!erro) {
    if (estado.avisado) {
      await avisar('Escritório VEX: conexão com o Sistema VEX voltou',
        `Ficou ${min(agora - estado.falhandoDesde)} min sem acesso (desde ${hora(estado.falhandoDesde)}). Rotinas e perguntas voltaram a funcionar.`, 'normal');
    }
    Object.assign(estado, { ok: true, falhandoDesde: null, avisado: false, ultimoErro: null });
    return;
  }
  estado.ok = false; estado.ultimoErro = erro;
  if (!estado.falhandoDesde) estado.falhandoDesde = agora;
  if (!estado.avisado && agora - estado.falhandoDesde >= tolerancia) {
    estado.avisado = true;
    await avisar('Escritório VEX sem acesso ao Sistema VEX',
      `Há ${min(agora - estado.falhandoDesde)} min o computador do escritório não alcança o sistemavex.com.br (${erro}). ` +
      `Enquanto isso, rotinas e perguntas do grupo ficam sem dados.\nO site pode estar no ar: costuma ser a internet do computador. Tente reiniciar o roteador.`, 'alta');
  }
}

function init(d) {
  dep = d;
  tolerancia = d.toleranciaMs || TOLERANCIA;
  if (d.semRelogio) return { estado: () => ({ ...estado }), conferir };
  setTimeout(() => conferir().catch(() => {}), 15000);
  setInterval(() => conferir().catch(() => {}), INTERVALO);
  return { estado: () => ({ ...estado }), conferir };
}

module.exports = { init, TOLERANCIA };
