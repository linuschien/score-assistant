import { useEffect, useRef } from 'react';
import { Renderer, useStateStore, useStateValue } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListGradeItems } from '@/hooks/use-list-grade-items';
import { useGetClassById } from '@/hooks/use-get-class-by-id';
import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import spec from '@/schemas/grade-item-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';
import { TYPE_TO_BACKEND, TYPE_TO_FRONTEND } from '@/lib/constants';

// Register GradeItem behaviors statically
registerBehavior('Open Grade Item Form Modal for Create', async (_ref, store) => {
  store.set('/selected/gradeItemId', null);
  store.set('/form', {});
  store.set('/modals/grade-item-form-modal', true);
  return null;
});

registerBehavior('Apply Grade Item Filters', async (_ref, store) => {
  const form = (store.get('/form') as Record<string, any>) || {};
  store.set('/selected/filterType', form['item-type-filter'] || '');
  store.set('/selected/filterDate', form['item-date-filter'] || '');
  return null;
});

registerBehavior('Clear Grade Item Filters', async (_ref, store) => {
  store.set('/form/item-type-filter', '');
  store.set('/form/item-date-filter', '');
  store.set('/selected/filterType', '');
  store.set('/selected/filterDate', '');
  return null;
});

function validateGradeItemForm(store: any): void {
  const form = (store.get('/form') as Record<string, any>) || {};
  const name = (form['modal-item-name-field'] || '').trim();
  const type = (form['modal-item-type-selection'] || '').trim();
  const maxScoreVal = form['modal-max-score-field'];
  const weightVal = form['modal-weight-field'];

  const errors: string[] = [];
  if (!name) errors.push('請輸入項目名稱');
  if (!type) errors.push('請選擇項目類型');

  if (maxScoreVal === undefined || maxScoreVal === null || String(maxScoreVal).trim() === '') {
    errors.push('請輸入滿分分數');
  } else {
    const parsedMax = parseFloat(String(maxScoreVal));
    if (isNaN(parsedMax)) {
      errors.push('滿分分數必須為有效數字');
    } else if (parsedMax <= 0) {
      errors.push('滿分分數必須大於 0');
    }
  }

  if (weightVal === undefined || weightVal === null || String(weightVal).trim() === '') {
    errors.push('請輸入權重百分比');
  } else {
    const parsedWeight = parseFloat(String(weightVal));
    if (isNaN(parsedWeight)) {
      errors.push('權重百分比必須為有效數字');
    } else if (parsedWeight < 0 || parsedWeight > 100) {
      errors.push('權重百分比必須在 0 到 100 之間');
    }
  }

  if (errors.length > 0) {
    throw new Error('請修正以下欄位：\n' + errors.map(e => `• ${e}`).join('\n'));
  }
}

registerBehavior('Create a new GradeItem', async (_ref, store) => {
  const selectedGradeItemId = store.get('/selected/gradeItemId');
  if (selectedGradeItemId) {
    return executeRegisteredBehavior('Update a GradeItem', store);
  }

  validateGradeItemForm(store);

  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const form = (store.get('/form') as Record<string, any>) || {};

  const itemName = form['modal-item-name-field'];
  const rawType = form['modal-item-type-selection'] || '其他';
  const backendType = TYPE_TO_BACKEND[rawType] || 'OTHER';

  const rawWeight = form['modal-weight-field'] ? Number(form['modal-weight-field']) : 0;
  const backendWeight = rawWeight / 100;

  await api.post(`${API_BASE}/semesters/${semesterId}/classes/${classId}/grade-items`, {
    itemName: itemName,
    itemType: backendType,
    itemDate: form['modal-item-date-field'] || null,
    itemDescription: form['modal-item-description-field'] || null,
    maxScore: form['modal-max-score-field'] ? Number(form['modal-max-score-field']) : 0,
    weight: backendWeight,
  });

  store.set('/form', {});
  store.set('/modals/grade-item-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listGradeItems'] });
  return '成績項目已建立';
});

registerBehavior('Update a GradeItem', async (_ref, store) => {
  validateGradeItemForm(store);

  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const gradeItemId = store.get('/selected/gradeItemId') as string;
  const form = (store.get('/form') as Record<string, any>) || {};

  const itemName = form['modal-item-name-field'];
  const rawType = form['modal-item-type-selection'] || '其他';
  const backendType = TYPE_TO_BACKEND[rawType] || 'OTHER';

  const rawWeight = form['modal-weight-field'] ? Number(form['modal-weight-field']) : 0;
  const backendWeight = rawWeight / 100;

  await api.put(`${API_BASE}/semesters/${semesterId}/classes/${classId}/grade-items/${gradeItemId}`, {
    itemName: itemName,
    itemType: backendType,
    itemDate: form['modal-item-date-field'] || null,
    itemDescription: form['modal-item-description-field'] || null,
    maxScore: form['modal-max-score-field'] ? Number(form['modal-max-score-field']) : 0,
    weight: backendWeight,
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
  const { data, isLoading } = useListGradeItems(classId ? { classId } : undefined);

  // Sync loading state reactively
  useEffect(() => {
    store.set('/loading/listGradeItems', isLoading);
  }, [isLoading, store]);

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

  // Reset search keyword, filters and active query on class change
  const prevClassIdRef = useRef(classId);
  useEffect(() => {
    if (prevClassIdRef.current !== classId) {
      store.set('/selected/filterType', '');
      store.set('/selected/filterDate', '');
      store.set('/form/item-type-filter', '');
      store.set('/form/item-date-filter', '');
      prevClassIdRef.current = classId;
    }
  }, [classId, store]);

  // Sync and filter grade items list into store reactively
  const filterType = useStateValue('/selected/filterType') as string || '';
  const filterDate = useStateValue('/selected/filterDate') as string || '';

  useEffect(() => {
    if (data) {
      let mapped = data.map((gi: any) => ({
        id: gi.id,
        name: gi.itemName,
        type: TYPE_TO_FRONTEND[gi.itemType] || gi.itemType,
        examDate: gi.itemDate || '',
        weight: gi.weight !== undefined && gi.weight !== null ? parseFloat((gi.weight * 100).toFixed(4)) : 0,
        description: gi.itemDescription || '',
        maxScore: gi.maxScore,
      }));

      // Apply type filter reactively
      if (filterType) {
        mapped = mapped.filter((gi: any) => gi.type === filterType);
      }

      // Apply date filter reactively
      if (filterDate) {
        mapped = mapped.filter((gi: any) => gi.examDate === filterDate);
      }

      const current = store.get('/data/listGradeItems');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listGradeItems', mapped);
      }
    }
  }, [data, filterType, filterDate, store]);

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
