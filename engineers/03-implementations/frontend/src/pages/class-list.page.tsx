import { useEffect } from 'react';
import { Renderer, useStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListClasses } from '@/hooks/use-list-classes';
import { useListStudents } from '@/hooks/use-list-students';
import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import spec from '@/schemas/class-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';

// Register Class behaviors statically
registerBehavior('Open Class Form Modal for Create', async (_ref, store) => {
  store.set('/selected/classId', null);
  store.set('/form', {
    'modal-class-threshold-field': 60.0
  });
  store.set('/modals/class-form-modal', true);
  return null;
});

function validateClassForm(store: any): void {
  const form = (store.get('/form') as Record<string, string>) || {};
  const className = (form['modal-class-name-field'] || '').trim();
  const thresholdVal = form['modal-class-threshold-field'];

  const errors: string[] = [];
  if (!className) errors.push('請輸入班級名稱');
  if (thresholdVal === undefined || thresholdVal === null || String(thresholdVal).trim() === '') {
    errors.push('請輸入通過門檻');
  } else {
    const parsed = parseFloat(String(thresholdVal));
    if (isNaN(parsed)) {
      errors.push('通過門檻必須為有效數字');
    } else if (parsed < 0 || parsed > 100) {
      errors.push('通過門檻必須在 0 到 100 之間');
    }
  }

  if (errors.length > 0) {
    throw new Error('請修正以下欄位：\n' + errors.map(e => `• ${e}`).join('\n'));
  }
}

registerBehavior('Create a new Class in a Semester', async (_ref, store) => {
  const selectedClassId = store.get('/selected/classId');
  if (selectedClassId) {
    return executeRegisteredBehavior('Update a Class', store);
  }

  validateClassForm(store);

  const semesterId = store.get('/selected/semesterId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};
  const threshold = form['modal-class-threshold-field'] ? parseFloat(String(form['modal-class-threshold-field'])) : 60.0;
  await api.post(`${API_BASE}/semesters/${semesterId}/classes`, {
    className: form['modal-class-name-field'],
    classGroup: form['modal-class-group-field'] || '',
    passingThreshold: threshold,
  });
  store.set('/form', {});
  store.set('/modals/class-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listClasses'] });
  return '班級已建立';
});

registerBehavior('Update a Class', async (_ref, store) => {
  validateClassForm(store);

  const form = (store.get('/form') as Record<string, string>) || {};
  const classId = store.get('/selected/classId') as string;
  const semesterId = store.get('/selected/semesterId') as string;
  const threshold = form['modal-class-threshold-field'] ? parseFloat(String(form['modal-class-threshold-field'])) : 60.0;
  await api.put(`${API_BASE}/semesters/${semesterId}/classes/${classId}`, {
    className: form['modal-class-name-field'],
    classGroup: form['modal-class-group-field'] || '',
    passingThreshold: threshold,
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
  if (foundClass && foundClass.className !== inputKeyword) {
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
  const { data, isLoading } = useListClasses(semesterId ? { semesterId } : undefined);

  // Sync loading state reactively
  useEffect(() => {
    store.set('/loading/listClasses', isLoading);
  }, [isLoading, store]);

  // Query all students to count them per class
  const { data: studentsData } = useListStudents();

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
      const mapped = data.map((c: any) => {
        const studentCount = studentsData
          ? studentsData.filter((s: any) => s.classId === c.id).length
          : 0;
        return {
          id: c.id,
          className: c.className,
          classGroup: c.classGroup ?? '',
          studentCount,
          passingThreshold: c.passingThreshold ?? 60.0,
        };
      });
      const current = store.get('/data/listClasses');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listClasses', mapped);
      }
    }
  }, [data, studentsData, store]);

  // Decoupled Class Form Modal Logic:
  // Populate the class-form-modal inputs dynamically based on selectedClassId
  const classModalOpen = store.get('/modals/class-form-modal');
  const selectedClassId = store.get('/selected/classId') as string;

  useEffect(() => {
    if (classModalOpen && selectedClassId) {
      const currentVal = store.get('/form/modal-class-name-field');
      const currentGroup = store.get('/form/modal-class-group-field');
      const currentThreshold = store.get('/form/modal-class-threshold-field');
      const classes = (store.get('/data/listClasses') as any[]) || [];
      const found = classes.find((c) => c.id === selectedClassId);
      if (found) {
        if (currentVal !== found.className) {
          store.set('/form/modal-class-name-field', found.className);
        }
        if (currentGroup !== found.classGroup) {
          store.set('/form/modal-class-group-field', found.classGroup ?? '');
        }
        if (currentThreshold !== found.passingThreshold) {
          store.set('/form/modal-class-threshold-field', found.passingThreshold ?? 60.0);
        }
      }
    }
  }, [classModalOpen, selectedClassId]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
