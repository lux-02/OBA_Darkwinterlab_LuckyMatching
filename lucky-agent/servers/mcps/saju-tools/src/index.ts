#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * `@lucky-agent/mcp-saju` — standalone streamable-HTTP MCP server
 * exposing Lucky Matching's saju (만세력) + 오방 + 욕망 추천 tools.
 *
 * Wraps the public saju engine API and the ported pure-TS mapping
 * logic (src/saju/*) as MCP tools the agent calls, then renders via
 * ggui. Boots on a single port (default 6783 — overridable via PORT
 * env or `--port N`). No auth, no multi-tenancy (BYOK local dev).
 *
 * Endpoint: `POST /mcp` — JSON-RPC envelope; streamable-HTTP transport.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerSajuTools } from './handlers.js';

function parsePort(): number {
  const argIdx = process.argv.indexOf('--port');
  if (argIdx >= 0 && argIdx + 1 < process.argv.length) {
    const n = Number.parseInt(process.argv[argIdx + 1]!, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const env = process.env.PORT;
  if (env !== undefined) {
    const n = Number.parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 6783;
}

async function main(): Promise<void> {
  const port = parsePort();
  const server = createServer((req, res) => {
    void handleRequest(req, res).catch((err) => {
      console.error('[mcp-saju] request handler error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`internal error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`[mcp-saju] ready: http://localhost:${port}/mcp`);
      resolve();
    });
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost`);

  if (req.method === 'POST' && url.pathname === '/mcp') {
    const body = await readBody(req);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid JSON body' }));
      return;
    }

    const mcp = new McpServer({
      name: '@lucky-agent/mcp-saju',
      version: '0.0.1',
      description: 'Lucky Matching 사주·오방·욕망 추천 도구.',
    });
    registerSajuTools(mcp);

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close().catch(() => undefined);
      mcp.close().catch(() => undefined);
    });

    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res, parsed);
    } catch (err) {
      console.error('[mcp-saju] mcp handle failed:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          }),
        );
      }
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

main().catch((err) => {
  console.error('[mcp-saju] fatal:', err);
  process.exit(1);
});
