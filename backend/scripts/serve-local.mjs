// Serves the compiled handler on http://localhost:8080, shaping requests like the Scaleway
// event, so tools/kb.mjs can exercise the real HTTP path before deploying.
// Env vars (DEVICE_PUBLIC_KEY_SPKI, MISTRAL_API_KEY, ...) come from the shell.
import { createServer } from 'node:http';
import { handle } from '../dist/handler.js';

const PORT = 8080;

createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const response = await handle({
    httpMethod: req.method,
    path: url.pathname,
    headers: req.headers,
    body: Buffer.concat(chunks).toString('utf8'),
    isBase64Encoded: false,
  });
  res.writeHead(response.statusCode, response.headers).end(response.body);
}).listen(PORT, 'localhost', () => console.log(`listening on http://localhost:${PORT}`));
