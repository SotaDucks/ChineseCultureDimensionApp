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
  if (response.status === 410) throw new Error('该元素已被删除，请刷新页面');
  if (!response.ok) throw new Error(`共享数据请求失败（HTTP ${response.status}）`);
  return response.json();
}

async function readPages(path) {
  const rows = [];
  const size = 100;
  for (let offset = 0; ; offset += size) {
    const page = await request(`${path}&order=id&limit=${size}&offset=${offset}`);
    rows.push(...page);
    if (page.length < size) return rows;
  }
}

export function readSharedEdits() {
  return readPages('culture_element_edits?select=id,fields');
}

export function readSharedDeletions() {
  return readPages('culture_element_deletions?select=id');
}

export function writeSharedEdits(changes) {
  return request('rpc/save_culture_element_edits', { changes });
}

export function deleteSharedElement(id) {
  return request('rpc/delete_culture_element', { element_id: id });
}
