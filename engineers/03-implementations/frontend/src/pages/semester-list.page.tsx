import { useEffect } from 'react';
import { Renderer, useStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListSemesters } from '@/hooks/use-list-semesters';
import spec from '@/schemas/semester-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';

const API_BASE = '/api/v1';

// Register Semester behaviors statically
registerBehavior('Create a new Semester', async (_ref, store) => {
  const selectedId = store.get('/selected/semesterId');
  if (selectedId) {
    return executeRegisteredBehavior('Update a Semester', store);
  }

  const form = (store.get('/form') as Record<string, string>) || {};
  const res = await fetch(`${API_BASE}/semesters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      semester_name: form['modal-semester-name-field'],
      start_date: form['modal-start-date-field'],
      end_date: form['modal-end-date-field'],
    }),
  });
  if (!res.ok) throw new Error(`建立失敗：${res.status}`);
  store.set('/form', {});
  store.set('/modals/semester-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
  return '學期已建立';
});

registerBehavior('Update a Semester', async (_ref, store) => {
  const form = (store.get('/form') as Record<string, string>) || {};
  const id = store.get('/selected/semesterId') as string;
  const res = await fetch(`${API_BASE}/semesters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      semester_name: form['modal-semester-name-field'],
      start_date: form['modal-start-date-field'],
      end_date: form['modal-end-date-field'],
    }),
  });
  if (!res.ok) throw new Error(`更新失敗：${res.status}`);
  store.set('/form', {});
  store.set('/modals/semester-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
  return '學期已更新';
});

registerBehavior('Delete a Semester', async (_ref, store) => {
  const id = store.get('/selected/semesterId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};
  const inputKeyword = form['delete-semester-keyword-input'];

  const semesters = (store.get('/data/listSemesters') as any[]) || [];
  const semester = semesters.find((s) => s.id === id);
  if (semester && semester.name !== inputKeyword) {
    throw new Error('輸入的學期名稱不相符，無法刪除');
  }

  const res = await fetch(`${API_BASE}/semesters/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`刪除失敗：${res.status}`);
  store.set('/form', {});
  store.set('/modals/delete-semester-confirm-dialog', false);
  queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
  return '學期已刪除';
});

export default function SemesterListPage() {
  const store = useStateStore();
  const { data } = useListSemesters();

  useEffect(() => {
    if (data) {
      const mapped = data.map((s: any) => ({
        id: s.id,
        name: s.semesterName,
        startDate: s.startDate,
        endDate: s.endDate,
        classCount: 0,
      }));
      const current = store.get('/data/listSemesters');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listSemesters', mapped);
      }
    }
  }, [data, store]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
