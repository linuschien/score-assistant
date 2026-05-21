export const API_BASE = '/api/v1';

export const api = {
  get: async <T>(url: string, options?: any): Promise<T> => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`請求失敗：${res.status}`);
    return res.json();
  },
  post: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`建立失敗：${res.status}`);
    return res.json();
  },
  put: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`更新失敗：${res.status}`);
    return res.json();
  },
  delete: async <T>(url: string): Promise<T> => {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`刪除失敗：${res.status}`);
    return res.json();
  }
};

