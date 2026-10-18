/* ===========================================================
   Painel dos agentes do Grupo VEX — o "sistema" de cada agente.

   Cada pasta agentes-vex/NN-* tem um server.js de uma linha que chama
   este arquivo. O escritório sobe o painel na porta do registro, mostra
   a página no monitor do agente e, em Conversar, abre o Claude Code na
   pasta, onde o CLAUDE.md tem o prompt completo do agente.

   O painel só lê arquivos da própria pasta e da pasta compartilhada:
   agente.json, memoria/contexto.md, entregas/*.md e o quadro de tarefas.
   =========================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

module.exports = function painel(dir) {
  const ler = (p, padrao = '') => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return padrao; } };
  const info = () => { try { return JSON.parse(ler(path.join(dir, 'agente.json'))); } catch (e) { return {}; } };
  const PORT = Number(process.env.PORT) || info().porta || 4411;
  const inicio = Date.now();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function entregas() {
    try {
      return fs.readdirSync(path.join(dir, 'entregas')).filter(f => /\.(md|txt|csv)$/i.test(f))
        .map(f => ({ f, t: fs.statSync(path.join(dir, 'entregas', f)).mtimeMs })).sort((a, b) => b.t - a.t);
    } catch (e) { return []; }
  }
  function memoria() {
    const txt = ler(path.join(dir, 'memoria', 'contexto.md'));
    const util = txt.replace(/<!--[\s\S]*?-->/g, '').replace(/^#.*$/m, '').trim();
    let quando = null; try { quando = fs.statSync(path.join(dir, 'memoria', 'contexto.md')).mtime; } catch (e) {}
    return { util, quando };
  }
  function tarefas(a) {
    const linhas = ler(path.join(dir, '..', 'compartilhado', 'quadro-de-tarefas.md')).split('\n')
      .filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/^\|\s*Data\s*\|/i.test(l));
    const marca = new RegExp('\\b(' + [a.n, a.nome].filter(Boolean).map(x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');
    return linhas.filter(l => marca.test(l)).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
  }

  const pagina = () => {
    const a = info(), m = memoria(), e = entregas(), t = tarefas(a);
    const integ = a.integracoes || [];
    const conect = integ.filter(i => i.conectado).length;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(a.n)} · ${esc(a.funcao)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{--bg:#f4f3ef;--card:#fff;--ink:#16191a;--ink2:#5d6668;--line:#dfddd6;--pet:#1f5e63;--or:#c8561a;--ok:#2f8a5a}
  @media (prefers-color-scheme:dark){:root{--bg:#121516;--card:#1a1e1f;--ink:#e9ecea;--ink2:#9aa4a5;--line:#2a3031;--pet:#5fb3b8;--or:#ec7a3c;--ok:#5cc28a}}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 system-ui,"Segoe UI",sans-serif}
  main{max-width:980px;margin:0 auto;padding:20px 16px 40px}
  header{display:flex;gap:14px;align-items:center;margin-bottom:14px}
  .em{font-size:34px;width:58px;height:58px;display:grid;place-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px}
  h1{margin:0;font-size:20px;letter-spacing:.01em}h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);margin:0 0 8px}
  .sub{color:var(--ink2);margin:2px 0 0}.pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;border:1px solid var(--line);margin-left:6px}
  .on{color:var(--ok);border-color:var(--ok)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
  section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .cmd{display:flex;flex-wrap:wrap;gap:6px}.cmd code{background:var(--bg);border:1px solid var(--line);border-left:3px solid var(--or);padding:4px 8px;border-radius:6px;font:600 12px/1.4 ui-monospace,Consolas,monospace}
  ul{margin:0;padding-left:18px}li{margin:2px 0}.no{color:var(--ink2)}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#b9b5aa}.dot.ok{background:var(--ok)}
  pre{white-space:pre-wrap;margin:0;font:13px/1.5 ui-monospace,Consolas,monospace;max-height:260px;overflow:auto}
  table{width:100%;border-collapse:collapse;font-size:13px}td{border-top:1px solid var(--line);padding:5px 4px;vertical-align:top}
  a{color:var(--pet)}.wide{grid-column:1/-1}
</style></head><body><main>
<header><div class="em">${esc(a.emoji || '🤖')}</div><div>
  <h1>Agente ${esc(a.n)} — ${esc(a.titulo || a.funcao)}</h1>
  <p class="sub">${esc(a.nome)} · Grupo VEX <span class="pill on">● no ar há ${Math.max(0, Math.floor((Date.now() - inicio) / 60000))} min</span><span class="pill">${conect}/${integ.length} integrações</span></p>
</div></header>
<div class="grid">
  <section class="wide"><h2>Missão</h2><p style="margin:0">${esc(a.missao)}</p></section>
  <section><h2>Sistema principal</h2><p style="margin:0">${esc(a.sistema)}</p></section>
  <section><h2>Comandos rápidos</h2><div class="cmd">${(a.comandos || []).map(c => `<code>${esc(c)}</code>`).join('')}</div>
    <p class="no" style="margin:8px 0 0">Use em <b>💬 Conversar</b>: clique no comando e envie.</p></section>
  <section><h2>Integrações</h2><ul style="list-style:none;padding:0">${integ.map(i => `<li><span class="dot ${i.conectado ? 'ok' : ''}"></span>${esc(i.nome)} <span class="no">· ${i.conectado ? esc(i.acesso || 'conectado') : 'não conectado'}</span></li>`).join('')}</ul>
    ${conect ? '' : '<p class="no" style="margin:8px 0 0">Sem integração, o agente entrega os lançamentos prontos e não afirma ter gravado nada.</p>'}</section>
  <section><h2>Memória</h2>${m.util ? `<pre>${esc(m.util.slice(0, 4000))}</pre><p class="no" style="margin:8px 0 0">atualizada em ${esc(m.quando ? m.quando.toLocaleString('pt-BR') : '—')}</p>` : '<p class="no" style="margin:0">Vazia. Na primeira conversa o agente se apresenta e faz o onboarding; o que você confirmar fica guardado aqui.</p>'}</section>
  <section><h2>Entregas</h2>${e.length ? `<ul>${e.slice(0, 12).map(x => `<li><a href="/entregas/${encodeURIComponent(x.f)}">${esc(x.f)}</a></li>`).join('')}</ul>` : '<p class="no" style="margin:0">Nenhuma ainda. Relatórios e planos aparecem aqui.</p>'}</section>
  <section class="wide"><h2>Tarefas no quadro dos agentes</h2>${t.length ? `<table>${t.slice(-15).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : '<p class="no" style="margin:0">Nenhuma tarefa com este agente no quadro compartilhado.</p>'}</section>
</div></main></body></html>`;
  };

  http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/api/status') {
      const a = info();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ ok: true, agente: a.n, nome: a.nome, noArDesde: new Date(inicio).toISOString(), entregas: entregas().length }));
    }
    const m = url.match(/^\/entregas\/([^/\\]+)$/);
    if (m && entregas().some(x => x.f === m[1])) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(ler(path.join(dir, 'entregas', m[1])));
    }
    if (url !== '/') { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('não encontrado'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(pagina());
  }).listen(PORT, '127.0.0.1', () => console.log(`Agente ${info().n} -> http://localhost:${PORT}`));
};
