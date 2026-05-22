import { useEffect } from 'react';
import { Renderer, useStateStore, useStateValue } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListGradeItems } from '@/hooks/use-list-grade-items';
import { useGetClassById } from '@/hooks/use-get-class-by-id';
import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import spec from '@/schemas/grade-item-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';

// Register GradeItem behaviors statically
registerBehavior('Open Grade Item Form Modal for Create', async (_ref, store) => {
  store.set('/selected/gradeItemId', null);
  store.set('/form', {});
  store.set('/modals/grade-item-form-modal', true);
  return null;
});

registerBehavior('Create a new GradeItem', async (_ref, store) => {
  const selectedGradeItemId = store.get('/selected/gradeItemId');
  if (selectedGradeItemId) {
    return executeRegisteredBehavior('Update a GradeItem', store);
  }

  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const form = (store.get('/form') as Record<string, any>) || {};

  await api.post(`${API_BASE}/semesters/${semesterId}/classes/${classId}/grade-items`, {
    item_name: form['modal-item-name-field'],
    item_type: form['modal-item-type-selection'],
    item_date: form['modal-item-date-field'] || null,
    item_description: form['modal-item-description-field'] || null,
    max_score: form['modal-max-score-field'] ? Number(form['modal-max-score-field']) : 0,
    weight: form['modal-weight-field'] ? Number(form['modal-weight-field']) : 0,
  });

  store.set('/form', {});
  store.set('/modals/grade-item-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listGradeItems'] });
  return '成績項目已建立';
});

registerBehavior('Update a GradeItem', async (_ref, store) => {
  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const gradeItemId = store.get('/selected/gradeItemId') as string;
  const form = (store.get('/form') as Record<string, any>) || {};

  await api.put(`${API_BASE}/semesters/${semesterId}/classes/${classId}/grade-items/${gradeItemId}`, {
    item_name: form['modal-item-name-field'],
    item_type: form['modal-item-type-selection'],
    item_date: form['modal-item-date-field'] || null,
    item_description: form['modal-item-description-field'] || null,
    max_score: form['modal-max-score-field'] ? Number(form['modal-max-score-field']) : 0,
    weight: form['modal-weight-field'] ? Number(form['modal-weight-field']) : 0,
  });

  store.set('/form', {});
  store.set('/modals/grade-item-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listGradeItems'] });
  return '成績項目已更新';
});

registerBehavior('Delete a GradeItem', async (_ref, store) => {
  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const gradeItemId = store.get('/selected/gradeItemId') as string;
  const form = (store.get('/form') as Record<string, any>) || {};
  const inputKeyword = form['delete-grade-item-keyword-input'];

  const gradeItems = (store.get('/data/listGradeItems') as any[]) || [];
  const found = gradeItems.find((gi) => gi.id === gradeItemId);
  if (found && found.name !== inputKeyword) {
    throw new Error('輸入的項目名稱不相符，無法刪除');
  }

  await api.delete(`${API_BASE}/semesters/${semesterId}/classes/${classId}/grade-items/${gradeItemId}`);
  store.set('/form', {});
  store.set('/modals/delete-grade-item-confirm-dialog', false);
  queryClient.invalidateQueries({ queryKey: ['listGradeItems'] });
  return '成績項目已刪除';
});

export default function GradeItemListPage() {
  const store = useStateStore();

  // Get active class ID and semester ID from store reactively
  const classId = useStateValue('/selected/classId') as string;
  const semesterId = useStateValue('/selected/semesterId') as string;

  // Query contexts if available
  const { data: semesterData } = useGetSemesterById(semesterId || '');
  const { data: classData } = useGetClassById(semesterId || '', classId || '');

  // Query grade items for the active class
  const { data } = useListGradeItems(classId ? { classId } : undefined);

  // Sync active class/semester details into store for title headers
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

  useEffect(() => {
    if (classData) {
      const nextVal = {
        id: classId,
        name: classData.class_name || classData.className || classData.name,
      };
      const current = store.get('/data/getClassById');
      if (JSON.stringify(current) !== JSON.stringify(nextVal)) {
        store.set('/data/getClassById', nextVal);
      }
    }
  }, [classData, classId, store]);

  // Sync grade items list into store, mapping all necessary fields for editing
  useEffect(() => {
    if (data) {
      const mapped = data.map((gi: any) => ({
        id: gi.id,
        name: gi.itemName,
        type: gi.itemType,
        examDate: gi.itemDate || '',
        weight: gi.weight,
        description: gi.itemDescription || '',
        maxScore: gi.maxScore,
      }));
      const current = store.get('/data/listGradeItems');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listGradeItems', mapped);
      }
    }
  }, [data, store]);

  // Decoupled Grade Item Form Modal Logic:
  // Populate form inputs dynamically based on selectedGradeItemId
  const gradeItemModalOpen = store.get('/modals/grade-item-form-modal');
  const selectedGradeItemId = store.get('/selected/gradeItemId') as string;

  useEffect(() => {
    if (gradeItemModalOpen && selectedGradeItemId) {
      const currentName = store.get('/form/modal-item-name-field') || '';
      const currentType = store.get('/form/modal-item-type-selection') || '';
      const currentDate = store.get('/form/modal-item-date-field') || '';
      const currentDesc = store.get('/form/modal-item-description-field') || '';
      const currentMaxScore = store.get('/form/modal-max-score-field');
      const currentWeight = store.get('/form/modal-weight-field');

      const gradeItems = (store.get('/data/listGradeItems') as any[]) || [];
      const found = gradeItems.find((gi) => gi.id === selectedGradeItemId);
      if (found) {
        if (currentName !== found.name) store.set('/form/modal-item-name-field', found.name);
        if (currentType !== found.type) store.set('/form/modal-item-type-selection', found.type);
        if (currentDate !== found.examDate) store.set('/form/modal-item-date-field', found.examDate);
        if (currentDesc !== found.description) store.set('/form/modal-item-description-field', found.description);
        if (String(currentMaxScore) !== String(found.maxScore)) store.set('/form/modal-max-score-field', found.maxScore);
        if (String(currentWeight) !== String(found.weight)) store.set('/form/modal-weight-field', found.weight);
      }
    }
  }, [gradeItemModalOpen, selectedGradeItemId]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
