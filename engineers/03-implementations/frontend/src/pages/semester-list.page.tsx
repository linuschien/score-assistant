import { useEffect } from 'react';
import { Renderer, useStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListSemesters } from '@/hooks/use-list-semesters';
import { useListClasses } from '@/hooks/use-list-classes';
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

function validateSemesterForm(store: any): void {
  const form = (store.get('/form') as Record<string, string>) || {};
  const name = (form['modal-semester-name-field'] || '').trim();
  const start = (form['modal-start-date-field'] || '').trim();
  const end = (form['modal-end-date-field'] || '').trim();

  const errors: string[] = [];
  if (!name) errors.push('請輸入學期名稱');
  if (!start) errors.push('請選擇起始日期');
  if (!end) errors.push('請選擇結束日期');

  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    errors.push('起始日期格式必須為 YYYY-MM-DD');
  }
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    errors.push('結束日期格式必須為 YYYY-MM-DD');
  }
  if (start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
    if (new Date(start) > new Date(end)) {
      errors.push('結束日期不能早於起始日期');
    }
  }

  if (errors.length > 0) {
    throw new Error('請修正以下欄位：\n' + errors.map(e => `• ${e}`).join('\n'));
  }
}

registerBehavior('Create a new Semester', async (_ref, store) => {
  const selectedId = store.get('/selected/semesterId');
  if (selectedId) {
    return executeRegisteredBehavior('Update a Semester', store);
  }

  validateSemesterForm(store);

  const form = (store.get('/form') as Record<string, string>) || {};
  await api.post(`${API_BASE}/semesters`, {
    semesterName: form['modal-semester-name-field'],
    startDate: form['modal-start-date-field'],
    endDate: form['modal-end-date-field'],
  });
  store.set('/form', {});
  store.set('/modals/semester-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
  return '學期已建立';
});

registerBehavior('Update a Semester', async (_ref, store) => {
  validateSemesterForm(store);

  const form = (store.get('/form') as Record<string, string>) || {};
  const id = store.get('/selected/semesterId') as string;
  await api.put(`${API_BASE}/semesters/${id}`, {
    semesterName: form['modal-semester-name-field'],
    startDate: form['modal-start-date-field'],
    endDate: form['modal-end-date-field'],
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
  const { data, isLoading } = useListSemesters();
  const { data: classesData } = useListClasses();

  // Sync loading state reactively
  useEffect(() => {
    store.set('/loading/listSemesters', isLoading);
  }, [isLoading, store]);

  useEffect(() => {
    if (data) {
      const mapped = data.map((s: any) => {
        const classCount = classesData
          ? classesData.filter((c: any) => c.semesterId === s.id).length
          : 0;
        return {
          id: s.id,
          name: s.semesterName,
          startDate: s.startDate,
          endDate: s.endDate,
          classCount,
        };
      });
      const current = store.get('/data/listSemesters');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listSemesters', mapped);
      }
    }
  }, [data, classesData, store]);

  // Decoupled Semester Form Modal Logic:
  // Populate the semester-form-modal inputs dynamically based on selectedSemesterId
  const semesterModalOpen = store.get('/modals/semester-form-modal');
  const selectedSemesterId = store.get('/selected/semesterId') as string;

  useEffect(() => {
    if (semesterModalOpen && selectedSemesterId) {
      const currentName = store.get('/form/modal-semester-name-field') || '';
      const currentStart = store.get('/form/modal-start-date-field') || '';
      const currentEnd = store.get('/form/modal-end-date-field') || '';

      const semesters = (store.get('/data/listSemesters') as any[]) || [];
      const found = semesters.find((s) => s.id === selectedSemesterId);
      if (found) {
        if (currentName !== found.name) store.set('/form/modal-semester-name-field', found.name);
        if (currentStart !== found.startDate) store.set('/form/modal-start-date-field', found.startDate);
        if (currentEnd !== found.endDate) store.set('/form/modal-end-date-field', found.endDate);
      }
    }
  }, [semesterModalOpen, selectedSemesterId]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
