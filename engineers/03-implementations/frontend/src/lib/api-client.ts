export const api = {
  get: async <T>(url: string, options?: any): Promise<T> => {
    const res = await fetch(url, options);
    return res.json();
  },
  post: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  },
  put: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  },
  delete: async <T>(url: string): Promise<T> => {
    const res = await fetch(url, { method: 'DELETE' });
    return res.json();
  }
};
