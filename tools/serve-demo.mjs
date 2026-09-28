import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/main/resources/static/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

http.createServer(async (req, res) => {
  const reply = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : message);
  };
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return reply(405, 'Method not allowed');
  }
  try {
    const pathname = decodeURIComponent(req.url.split('?')[0]);
    if (!pathname.startsWith('/') || /[\\\0:]/.test(pathname) || pathname.split('/').includes('..')) {
      return reply(400, 'Invalid path');
    }
    const base = await realpath(root);
    const file = await realpath(path.join(base, pathname === '/' ? 'index.html' : pathname));
    const relative = path.relative(base, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return reply(403, 'Forbidden');
    if (!(await stat(file)).isFile()) return reply(404, 'Not found');
    const content = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    reply(error instanceof URIError ? 400 : 404, 'Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Static analytics preview: http://127.0.0.1:${port}/analytics.html?demo=1`);
  console.log('For registration and role workspaces, run Spring Boot with the demo profile (see README.md).');
});
