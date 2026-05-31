import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const c = new Client({ name: 'smoke', version: '0.0.0' });
await c.connect(new StreamableHTTPClientTransport(new URL('http://localhost:6783/mcp')));

const tools = await c.listTools();
console.log('TOOLS:', tools.tools.map((t) => t.name).join(', '));

const call = async (name, args) => {
  const r = await c.callTool({ name, arguments: args });
  const text = r.content?.find((x) => x.type === 'text')?.text ?? JSON.stringify(r);
  console.log(`\n${name}(${JSON.stringify(args)}):\n` + text.slice(0, 600));
};

const birth = { year: 1996, month: 5, day: 15, calendar_type: 'solar' };
await call('get_saju', birth);
await call('daily_forecast', birth);
await call('recommend_by_desire', { ...birth, desire: '재물' });
await call('recommend_by_region', { ...birth, region: '부산' });

await c.close();
