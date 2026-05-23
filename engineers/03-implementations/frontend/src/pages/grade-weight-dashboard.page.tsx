import { useEffect } from 'react';
import { Renderer, useStateStore, useStateValue } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import spec from '@/schemas/grade-weight-dashboard.render-schema.json';
import { useListGradeItems } from '@/hooks/use-list-grade-items';
import { useGetClassById } from '@/hooks/use-get-class-by-id';
import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import { registerBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';

// Localized type translation maps
const TYPE_TO_BACKEND: Record<string, string> = {
  '考試': 'ASSIGNMENT',
  '作業': 'ASSIGNMENT',
  '報告': 'REPORT',
  '出席': 'ATTENDANCE',
  '課堂表現': 'CLASSROOM_PERFORMANCE',
  '其他': 'OTHER',
};

const TYPE_TO_FRONTEND: Record<string, string> = {
  'ASSIGNMENT': '作業',
  'REPORT': '報告',
  'ATTENDANCE': '出席',
  'CLASSROOM_PERFORMANCE': '課堂表現',
  'OTHER': '其他',
};

// Register behaviors statically
registerBehavior('Allow saving weight when total is not 100% with a warning', async (_ref, store) => {
  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const list = (store.get('/data/listGradeItems') as any[]) || [];

  const total = list.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

  // Submit sequential PUT requests to update each grade item with its scaled weight
  for (const item of list) {
    const backendType = TYPE_TO_BACKEND[item.type] || 'OTHER';
    const backendWeight = (Number(item.weight) || 0) / 100;
    await api.put(`${API_BASE}/semesters/${semesterId}/classes/${classId}/grade-items/${item.id}`, {
      itemName: item.name,
      itemType: backendType,
      itemDate: item.examDate || null,
      itemDescription: item.description || null,
      maxScore: item.maxScore || 0,
      weight: backendWeight,
    });
  }

  queryClient.invalidateQueries({ queryKey: ['listGradeItems'] });

  const formattedTotal = parseFloat(total.toFixed(4));
  if (formattedTotal !== 100) {
    return `權重總和不等於 100% (目前為 ${formattedTotal}%)，已儲存權重設定`;
  }
  return '權重設定已儲存';
});

registerBehavior('Warn when total weight is not 100% during calculation', async () => {
  return null;
});

registerBehavior('Update weight for a single GradeItem', async () => {
  return null;
});

export default function GradeWeightDashboardPage() {
  const store = useStateStore();

  // Get active class ID and semester ID from store reactively
  const classId = useStateValue('/selected/classId') as string;
  const semesterId = useStateValue('/selected/semesterId') as string;

  // Query contexts if available
  const { data: semesterData } = useGetSemesterById(semesterId || '');
  const { data: classData } = useGetClassById(semesterId || '', classId || '');

  // Query grade items for the active class
  const { data } = useListGradeItems(classId ? { classId } : undefined);

  // Sync active class/semester details into store for dynamic breadcrumbs interpolation
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

  // Sync database grade items into store reactively, converting enums and decimal weights.
  // Use a store-based string to prevent local user inputs from being immediately overwritten during re-renders or remounts.
  useEffect(() => {
    if (data) {
      const dataStr = JSON.stringify(data);
      const lastSynced = store.get('/data/lastSyncedGradeItemsString');
      if (dataStr !== lastSynced) {
        const mapped = data.map((gi: any) => ({
          id: gi.id,
          name: gi.itemName,
          type: TYPE_TO_FRONTEND[gi.itemType] || gi.itemType,
          examDate: gi.itemDate || '',
          weight: gi.weight !== undefined && gi.weight !== null ? parseFloat((gi.weight * 100).toFixed(4)) : 0,
          description: gi.itemDescription || '',
          maxScore: gi.maxScore,
        }));
        store.set('/data/listGradeItems', mapped);
        store.set('/data/lastSyncedGradeItemsString', dataStr);
      }
    }
  }, [data, store]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
