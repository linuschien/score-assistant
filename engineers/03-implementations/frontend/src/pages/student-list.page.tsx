import { useEffect } from 'react';
import { Renderer, useStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListStudents } from '@/hooks/use-list-students';
import { useGetClassById } from '@/hooks/use-get-class-by-id';
import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import spec from '@/schemas/student-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';

// Register Student behaviors statically
registerBehavior('Open Student Form Modal for Create', async (_ref, store) => {
  store.set('/selected/studentId', null);
  store.set('/form', {});
  store.set('/modals/student-form-modal', true);
  return null;
});

registerBehavior('Add a Student to a Class', async (_ref, store) => {
  const selectedStudentId = store.get('/selected/studentId');
  if (selectedStudentId) {
    return executeRegisteredBehavior('Update a Student', store);
  }

  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};

  await api.post(`${API_BASE}/semesters/${semesterId}/classes/${classId}/students`, {
    student_number: form['modal-student-number-field'] ? String(form['modal-student-number-field']) : '',
    student_name: form['modal-student-name-field'],
  });
  store.set('/form', {});
  store.set('/modals/student-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listStudents'] });
  return '學生已新增';
});

registerBehavior('Update a Student', async (_ref, store) => {
  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const studentId = store.get('/selected/studentId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};

  await api.put(`${API_BASE}/semesters/${semesterId}/classes/${classId}/students/${studentId}`, {
    student_number: form['modal-student-number-field'] ? String(form['modal-student-number-field']) : '',
    student_name: form['modal-student-name-field'],
  });
  store.set('/form', {});
  store.set('/modals/student-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listStudents'] });
  return '學生已更新';
});

registerBehavior('Delete a Student', async (_ref, store) => {
  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const studentId = store.get('/selected/studentId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};
  const inputKeyword = form['delete-student-keyword-input'];

  const students = (store.get('/data/listStudents') as any[]) || [];
  const found = students.find((s) => s.id === studentId);
  if (found && found.name !== inputKeyword) {
    throw new Error('輸入的學生姓名不相符，無法刪除');
  }

  await api.delete(`${API_BASE}/semesters/${semesterId}/classes/${classId}/students/${studentId}`);
  store.set('/form', {});
  store.set('/modals/delete-student-confirm-dialog', false);
  queryClient.invalidateQueries({ queryKey: ['listStudents'] });
  return '學生已移除';
});

registerBehavior('Import Students CSV', async (_ref, store) => {
  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;

  return new Promise<string>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (event: any) => {
      const file = event.target?.files?.[0];
      if (!file) {
        reject(new Error('未選擇檔案'));
        return;
      }

      try {
        const formData = new FormData();
        formData.append('fileData', file);

        const res = await fetch(
          `${API_BASE}/semesters/${semesterId}/classes/${classId}/students:importStudents`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!res.ok) {
          throw new Error(`匯入失敗：${res.status}`);
        }

        queryClient.invalidateQueries({ queryKey: ['listStudents'] });
        resolve('學生資料匯入成功');
      } catch (err: any) {
        reject(new Error(err.message || '匯入失敗'));
      }
    };
    input.click();
  });
});

export default function StudentListPage() {
  const store = useStateStore();
  
  // Get active class ID and semester ID from store
  const classId = store.get('/selected/classId') as string;
  const semesterId = store.get('/selected/semesterId') as string;

  // Query contexts if available
  const { data: semesterData } = useGetSemesterById(semesterId || '');
  const { data: classData } = useGetClassById(semesterId || '', classId || '');

  // Query students for the active class
  const { data } = useListStudents(classId ? { classId } : undefined);

  // Sync active class/semester details into store for the title headers
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

  // Sync students list into store
  useEffect(() => {
    if (data) {
      const mapped = data.map((s: any) => ({
        id: s.id,
        studentNumber: String(s.studentNumber),
        name: s.studentName,
      }));
      const current = store.get('/data/listStudents');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listStudents', mapped);
      }
    }
  }, [data, store]);

  // Decoupled Student Form Modal Logic:
  // Populate the student-form-modal inputs dynamically based on selectedStudentId
  const studentModalOpen = store.get('/modals/student-form-modal');
  const selectedStudentId = store.get('/selected/studentId') as string;

  useEffect(() => {
    if (studentModalOpen && selectedStudentId) {
      const currentNumber = store.get('/form/modal-student-number-field') || '';
      const currentName = store.get('/form/modal-student-name-field') || '';
      const students = (store.get('/data/listStudents') as any[]) || [];
      const found = students.find((s) => s.id === selectedStudentId);
      if (found) {
        if (currentNumber !== found.studentNumber) store.set('/form/modal-student-number-field', found.studentNumber);
        if (currentName !== found.name) store.set('/form/modal-student-name-field', found.name);
      }
    }
  }, [studentModalOpen, selectedStudentId]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
