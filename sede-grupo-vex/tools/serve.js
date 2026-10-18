// Servidor local de desenvolvimento: serve a pasta do projeto e grava renders/modelo enviados pela página.
// Uso: node tools/serve.js [porta]   (escuta só em 127.0.0.1)
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), port = +process.argv[2] || 4610;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.md': 'text/markdown; charset=utf-8' };
const ALLOWED = /^(renders\/[a-z0-9-]+\.jpg|modelo\/[a-z0-9-]+\.glb)$/;
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/save') {
    const rel = u.searchParams.get('path') || '';
    if (!ALLOWED.test(rel)) { res.writeHead(400); return res.end('caminho recusado'); }
    const out = path.join(root, rel); fs.mkdirSync(path.dirname(out), { recursive: true });
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => { fs.writeFileSync(out, Buffer.concat(chunks)); res.writeHead(200); res.end('ok'); console.log('gravado', rel); });
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
