import { useEffect } from 'react';
import { Renderer, useStateStore, useStateValue } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import spec from '@/schemas/score-preview-dashboard.render-schema.json';

import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import { useGetClassById } from '@/hooks/use-get-class-by-id';
import { useListStudents } from '@/hooks/use-list-students';
import { useListGradeItems } from '@/hooks/use-list-grade-items';
import { useListGradeRecords } from '@/hooks/use-list-grade-records';


import { registerBehavior } from '@/behaviors/registry';
import { api, API_BASE } from '@/lib/api-client';
import { ScoreSummaryTable } from '@/json-render/components/score-summary-table';

// ────────────────────────────────────────────────────────────────────────────────
// Static Behavior Registrations
// ────────────────────────────────────────────────────────────────────────────────
registerBehavior('Export grades to a file', async (_ref, store) => {
  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;

  if (!semesterId || !classId) {
    alert('無法取得班級或學期 ID');
    return '無法取得班級或學期 ID';
  }

  const res = await api.post(`${API_BASE}/semesters/${semesterId}/classes/${classId}:exportGrades`, {
    format: 'EXCEL'
  }) as any;

  if (res && res.success) {
    if (res.fileData) {
      try {
        const binaryString = atob(res.fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName || '成績總表.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Failed to trigger browser download:', e);
      }
    }
    return '成績已匯出';
  } else {
    throw new Error(res?.message || '匯出失敗');
  }
});

registerBehavior('Grade Summary preview shows weight warning when total weight is not 100%', async () => {
  return null;
});


const localRegistry = {
  ...componentRegistry,
  'div': (props: any) => {
    const id = props.element?.props?.id;
    if (id === 'weight-warning-banner') {
      const store = useStateStore();
      const gradeItems = (store.get('/data/listGradeItems') || []) as any[];
      const totalWeight = gradeItems.reduce((sum: number, item: any) => sum + (Number(item.weight) || 0), 0);
      
      // Render warning only if total weight is not equal to 1.0 (100%)
      if (Math.abs(totalWeight - 1.0) < 0.0001) {
        return null;
      }
      
      const roundedPercent = Math.round(totalWeight * 100);
      return (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3.5 rounded-xl flex items-center space-x-2 text-sm font-semibold shadow-lg">
          <span className="text-base">⚠️</span>
          <span>注意：目前總權重未達 100% (目前: {roundedPercent}%)，加權總分計算結果可能不正確。</span>
        </div>
      );
    }
    const StandardDiv = componentRegistry['div'];
    return <StandardDiv {...props} />;
  },
  'DataTable': (props: any) => {
    const id = props.element?.props?.id;
    if (id === 'score-summary-table') {
      return <ScoreSummaryTable {...props} />;
    }
    const StandardTable = componentRegistry['DataTable'];
    return <StandardTable {...props} />;
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Page Component definition
// ────────────────────────────────────────────────────────────────────────────────
export default function ScorePreviewDashboardPage() {
  const store = useStateStore();

  const classId = useStateValue('/selected/classId') as string;
  const semesterId = useStateValue('/selected/semesterId') as string;

  const { data: semesterData } = useGetSemesterById(semesterId || '');
  const { data: classData } = useGetClassById(semesterId || '', classId || '');
  const { data: studentsData, isLoading: isStudentsLoading } = useListStudents(classId ? { classId } : undefined);
  const { data: gradeItemsData, isLoading: isGradeItemsLoading } = useListGradeItems(classId ? { classId } : undefined);
  const { data: gradeRecordsData, isLoading: isGradeRecordsLoading } = useListGradeRecords();

  // Sync loading states reactively
  useEffect(() => {
    store.set('/loading/listStudents', isStudentsLoading);
  }, [isStudentsLoading, store]);

  useEffect(() => {
    store.set('/loading/listGradeItems', isGradeItemsLoading);
  }, [isGradeItemsLoading, store]);

  useEffect(() => {
    store.set('/loading/listGradeRecords', isGradeRecordsLoading);
  }, [isGradeRecordsLoading, store]);

  // Sync Semester
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

  // Sync Class
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

  // Sync Students
  useEffect(() => {
    if (studentsData) {
      const nextVal = studentsData.map((s: any) => ({
        id: s.id,
        studentNumber: String(s.studentNumber).padStart(2, '0'),
        studentName: s.studentName,
      }));
      const current = store.get('/data/listStudents');
      if (JSON.stringify(current) !== JSON.stringify(nextVal)) {
        store.set('/data/listStudents', nextVal);
      }
    }
  }, [studentsData, store]);

  // Sync Grade Items
  useEffect(() => {
    if (gradeItemsData) {
      const current = store.get('/data/listGradeItems');
      if (JSON.stringify(current) !== JSON.stringify(gradeItemsData)) {
        store.set('/data/listGradeItems', gradeItemsData);
      }
    }
  }, [gradeItemsData, store]);

  // Sync Grade Records
  useEffect(() => {
    if (gradeRecordsData) {
      const current = store.get('/data/listGradeRecords');
      if (JSON.stringify(current) !== JSON.stringify(gradeRecordsData)) {
        store.set('/data/listGradeRecords', gradeRecordsData);
      }
    }
  }, [gradeRecordsData, store]);

  return <Renderer spec={spec as any} registry={localRegistry} />;
}
