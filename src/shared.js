const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const sharedEnabled = Boolean(url || key);

async function request(path, body) {
  if (!url || !key) throw new Error('Supabase 项目地址或公开密钥未配置');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`共享数据请求失败（HTTP ${response.status}）`);
  return response.json();
}

export async function readSharedEdits() {
  const rows = [];
  const size = 100;
  for (let offset = 0; ; offset += size) {
    const page = await request(`culture_element_edits?select=id,fields&order=id&limit=${size}&offset=${offset}`);
    rows.push(...page);
    if (page.length < size) return rows;
  }
}

export function writeSharedEdits(changes) {
  return request('rpc/save_culture_element_edits', { changes });
}
