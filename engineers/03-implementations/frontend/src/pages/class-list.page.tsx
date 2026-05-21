import { useEffect } from 'react';
import { Renderer, useStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListClasses } from '@/hooks/use-list-classes';
import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import spec from '@/schemas/class-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';

// Register Class behaviors statically
registerBehavior('Open Class Form Modal for Create', async (_ref, store) => {
  store.set('/selected/classId', null);
  store.set('/form', {});
  store.set('/modals/class-form-modal', true);
  return null;
});

registerBehavior('Create a new Class in a Semester', async (_ref, store) => {
  const selectedClassId = store.get('/selected/classId');
  if (selectedClassId) {
    return executeRegisteredBehavior('Update a Class', store);
  }

  const semesterId = store.get('/selected/semesterId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};
  await api.post(`${API_BASE}/semesters/${semesterId}/classes`, {
    class_name: form['modal-class-name-field'],
  });
  store.set('/form', {});
  store.set('/modals/class-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listClasses'] });
  return '班級已建立';
});

registerBehavior('Update a Class', async (_ref, store) => {
  const form = (store.get('/form') as Record<string, string>) || {};
  const classId = store.get('/selected/classId') as string;
  const semesterId = store.get('/selected/semesterId') as string;
  await api.put(`${API_BASE}/semesters/${semesterId}/classes/${classId}`, {
    class_name: form['modal-class-name-field'],
  });
  store.set('/form', {});
  store.set('/modals/class-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listClasses'] });
  return '班級已更新';
});

registerBehavior('Delete a Class', async (_ref, store) => {
  const classId = store.get('/selected/classId') as string;
  const semesterId = store.get('/selected/semesterId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};
  const inputKeyword = form['delete-class-keyword-input'];

  const classes = (store.get('/data/listClasses') as any[]) || [];
  const foundClass = classes.find((c) => c.id === classId);
  if (foundClass && foundClass.name !== inputKeyword) {
    throw new Error('輸入的班級名稱不相符，無法刪除');
  }

  await api.delete(`${API_BASE}/semesters/${semesterId}/classes/${classId}`);
  store.set('/form', {});
  store.set('/modals/delete-class-confirm-dialog', false);
  queryClient.invalidateQueries({ queryKey: ['listClasses'] });
  return '班級已刪除';
});

export default function ClassListPage() {
  const store = useStateStore();

  // Get active semester ID from store
  const semesterId = store.get('/selected/semesterId') as string;

  // Query contexts if available
  const { data: semesterData } = useGetSemesterById(semesterId || '');

  // Query classes for the active semester
  const { data } = useListClasses(semesterId ? { semesterId } : undefined);

  // Sync active semester details into store for title header
  useEffect(() => {
    if (semesterData) {
      const nextVal = {
        id: semesterId,
        name: semesterData.semester_name || semesterData.semesterName || semesterData.name,
      };
      const current = store.get('/data/getSemesterById');
      if (JSON.stringify(current) !== JSON.stringify(nextVal)) {
        store.set('/data/getSemesterById', nextVal);
      }
    }
  }, [semesterData, semesterId, store]);

  // Sync classes list into store
  useEffect(() => {
    if (data) {
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.className,
        studentCount: 0, // Fallback/default since backend doesn't support studentCount on Class
      }));
      const current = store.get('/data/listClasses');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listClasses', mapped);
      }
    }
  }, [data, store]);

  // Decoupled Class Form Modal Logic:
  // Populate the class-form-modal inputs dynamically based on selectedClassId
  const classModalOpen = store.get('/modals/class-form-modal');
  const selectedClassId = store.get('/selected/classId') as string;

  useEffect(() => {
    if (classModalOpen && selectedClassId) {
      const currentVal = store.get('/form/modal-class-name-field');
      const classes = (store.get('/data/listClasses') as any[]) || [];
      const found = classes.find((c) => c.id === selectedClassId);
      if (found && currentVal !== found.name) {
        store.set('/form/modal-class-name-field', found.name);
      }
    }
  }, [classModalOpen, selectedClassId]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
