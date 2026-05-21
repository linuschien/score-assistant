import { useEffect } from 'react';
import { Renderer, useStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListSemesters } from '@/hooks/use-list-semesters';
import spec from '@/schemas/semester-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';

// Register Semester behaviors statically
registerBehavior('Open Semester Form Modal for Create', async (_ref, store) => {
  store.set('/selected/semesterId', null);
  store.set('/form', {});
  store.set('/modals/semester-form-modal', true);
  return null;
});

registerBehavior('Create a new Semester', async (_ref, store) => {
  const selectedId = store.get('/selected/semesterId');
  if (selectedId) {
    return executeRegisteredBehavior('Update a Semester', store);
  }

  const form = (store.get('/form') as Record<string, string>) || {};
  await api.post(`${API_BASE}/semesters`, {
    semester_name: form['modal-semester-name-field'],
    start_date: form['modal-start-date-field'],
    end_date: form['modal-end-date-field'],
  });
  store.set('/form', {});
  store.set('/modals/semester-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
  return '學期已建立';
});

registerBehavior('Update a Semester', async (_ref, store) => {
  const form = (store.get('/form') as Record<string, string>) || {};
  const id = store.get('/selected/semesterId') as string;
  await api.put(`${API_BASE}/semesters/${id}`, {
    semester_name: form['modal-semester-name-field'],
    start_date: form['modal-start-date-field'],
    end_date: form['modal-end-date-field'],
  });
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

  await api.delete(`${API_BASE}/semesters/${id}`);
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

  // Decoupled Semester Form Modal Logic:
  // Populate the semester-form-modal inputs dynamically based on selectedSemesterId
  const semesterModalOpen = store.get('/modals/semester-form-modal');
  const selectedSemesterId = store.get('/selected/semesterId') as string;

  useEffect(() => {
    if (semesterModalOpen) {
      const currentName = store.get('/form/modal-semester-name-field') || '';
      const currentStart = store.get('/form/modal-start-date-field') || '';
      const currentEnd = store.get('/form/modal-end-date-field') || '';

      if (selectedSemesterId) {
        const semesters = (store.get('/data/listSemesters') as any[]) || [];
        const found = semesters.find((s) => s.id === selectedSemesterId);
        if (found) {
          if (currentName !== found.name) store.set('/form/modal-semester-name-field', found.name);
          if (currentStart !== found.startDate) store.set('/form/modal-start-date-field', found.startDate);
          if (currentEnd !== found.endDate) store.set('/form/modal-end-date-field', found.endDate);
        }
      } else {
        if (currentName !== '') store.set('/form/modal-semester-name-field', '');
        if (currentStart !== '') store.set('/form/modal-start-date-field', '');
        if (currentEnd !== '') store.set('/form/modal-end-date-field', '');
      }
    }
  }, [semesterModalOpen, selectedSemesterId, store]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
