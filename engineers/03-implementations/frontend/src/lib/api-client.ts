export const API_BASE = '/api/v1';

const handleResponse = async <T>(res: Response, errorMsg: string): Promise<T> => {
  if (!res.ok) {
    let detail = '';
    try {
      const errorData = await res.json();
      detail = errorData?.detail || errorData?.error || errorData?.message || '';
    } catch {
      try {
        detail = await res.text();
      } catch {}
    }
    const finalMsg = detail ? `${errorMsg}：${detail}` : `${errorMsg}：${res.status}`;
    throw new Error(finalMsg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
};

export const api = {
  get: async <T>(url: string, options?: any): Promise<T> => {
    const res = await fetch(url, options);
    return handleResponse<T>(res, '請求失敗');
  },
  post: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<T>(res, '建立失敗');
  },
  put: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<T>(res, '更新失敗');
  },
  delete: async <T>(url: string): Promise<T> => {
    const res = await fetch(url, { method: 'DELETE' });
    return handleResponse<T>(res, '刪除失敗');
  }
};

