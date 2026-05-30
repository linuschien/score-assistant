import { useEffect, useRef } from 'react';
import { Renderer, useStateStore, useStateValue } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { useListStudents } from '@/hooks/use-list-students';
import { useGetClassById } from '@/hooks/use-get-class-by-id';
import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import spec from '@/schemas/student-list.render-schema.json';
import { registerBehavior, executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';
import { useListGradeItems } from '@/hooks/use-list-grade-items';
import { useListGradeRecords } from '@/hooks/use-list-grade-records';

// Register Student behaviors statically
registerBehavior('Open Student Form Modal for Create', async (_ref, store) => {
  store.set('/selected/studentId', null);
  store.set('/form', {});
  store.set('/modals/student-form-modal', true);
  return null;
});

function validateStudentForm(store: any): void {
  const form = (store.get('/form') as Record<string, string>) || {};
  const id = (form['modal-student-id-field'] || '').trim();
  const num = (form['modal-student-number-field'] || '').trim();
  const name = (form['modal-student-name-field'] || '').trim();
  const email = (form['modal-student-email-field'] || '').trim();

  const errors: string[] = [];
  if (!id) errors.push('請輸入學號');
  if (!num) errors.push('請輸入座號');
  if (!name) errors.push('請輸入姓名');
  if (!email) {
    errors.push('請輸入電子信箱');
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push('電子信箱格式不正確');
  }

  if (errors.length > 0) {
    throw new Error('請修正以下欄位：\n' + errors.map(e => `• ${e}`).join('\n'));
  }
}

registerBehavior('Add a Student to a Class', async (_ref, store) => {
  const selectedStudentId = store.get('/selected/studentId');
  if (selectedStudentId) {
    return executeRegisteredBehavior('Update a Student', store);
  }

  validateStudentForm(store);

  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};

  await api.post(`${API_BASE}/semesters/${semesterId}/classes/${classId}/students`, {
    studentId: form['modal-student-id-field'],
    studentNumber: form['modal-student-number-field'] ? String(form['modal-student-number-field']) : '',
    studentName: form['modal-student-name-field'],
    email: form['modal-student-email-field'],
  });
  store.set('/form', {});
  store.set('/modals/student-form-modal', false);
  queryClient.invalidateQueries({ queryKey: ['listStudents'] });
  return '學生已新增';
});

registerBehavior('Update a Student', async (_ref, store) => {
  validateStudentForm(store);

  const semesterId = store.get('/selected/semesterId') as string;
  const classId = store.get('/selected/classId') as string;
  const studentId = store.get('/selected/studentId') as string;
  const form = (store.get('/form') as Record<string, string>) || {};

  await api.put(`${API_BASE}/semesters/${semesterId}/classes/${classId}/students/${studentId}`, {
    studentId: form['modal-student-id-field'],
    studentNumber: form['modal-student-number-field'] ? String(form['modal-student-number-field']) : '',
    studentName: form['modal-student-name-field'],
    email: form['modal-student-email-field'],
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
  if (found && found.studentName !== inputKeyword) {
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

  return new Promise<string | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';

    let resolved = false;

    const cleanup = () => {
      window.removeEventListener('focus', onWindowFocus);
    };

    const handleResolve = (val: string | null) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(val);
    };

    const handleReject = (err: any) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(err);
    };

    const onWindowFocus = () => {
      // Give change event some time to fire first
      setTimeout(() => {
        if (!resolved) {
          handleResolve(null);
        }
      }, 500);
    };

    input.onchange = async (event: any) => {
      const file = event.target?.files?.[0];
      if (!file) {
        handleResolve(null);
        return;
      }

      try {
        const formData = new FormData();
        formData.append('fileData', file);

        const response = await api.postForm(
          `${API_BASE}/semesters/${semesterId}/classes/${classId}/students:importStudents`,
          formData,
          '匯入失敗'
        ) as any;

        queryClient.invalidateQueries({ queryKey: ['listStudents'] });

        const successCount = response?.successCount ?? 0;
        const failureCount = response?.failureCount ?? 0;

        if (successCount === 0 && failureCount > 0) {
          handleReject(new Error(`匯入失敗：資料已存在，全域唯一欄位（學號/信箱）發生衝突（失敗 ${failureCount} 筆）`));
        } else if (failureCount > 0) {
          handleResolve(`部分資料匯入成功（成功 ${successCount} 筆，失敗/衝突 ${failureCount} 筆）`);
        } else {
          handleResolve(`學生資料匯入成功（成功 ${successCount} 筆）`);
        }
      } catch (err: any) {
        handleReject(new Error(err.message || '匯入失敗'));
      }
    };

    input.oncancel = () => {
      handleResolve(null);
    };

    // Fallback for cancel detection via window focus
    window.addEventListener('focus', onWindowFocus);

    input.click();
  });
});

registerBehavior('Filter Students List', async (_ref, store) => {
  const keyword = (store.get('/form/student-search-field') as string || '').trim().toLowerCase();
  store.set('/selected/searchQuery', keyword);
  return null;
});



export default function StudentListPage() {
  const store = useStateStore();

  // Get active class ID and semester ID reactively from store
  const classId = useStateValue('/selected/classId') as string;
  const semesterId = useStateValue('/selected/semesterId') as string;

  // Query contexts if available
  const { data: semesterData } = useGetSemesterById(semesterId || '');
  const { data: classData } = useGetClassById(semesterId || '', classId || '');

  // Query students for the active class
  const { data, isLoading } = useListStudents(classId ? { classId } : undefined);

  // Query grade items and grade records reactively
  const { data: gradeItemsData, isLoading: isGradeItemsLoading } = useListGradeItems(classId ? { classId } : undefined);
  const { data: gradeRecordsData, isLoading: isGradeRecordsLoading } = useListGradeRecords();

  // Sync loading state reactively
  useEffect(() => {
    store.set('/loading/listStudents', isLoading);
  }, [isLoading, store]);

  // Sync grade loading states reactively
  useEffect(() => {
    store.set('/loading/listGradeItems', isGradeItemsLoading);
    store.set('/loading/listGradeRecords', isGradeRecordsLoading);
  }, [isGradeItemsLoading, isGradeRecordsLoading, store]);

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

  // Reset search keyword and active search query on class change using a ref to prevent re-triggering on store mutations
  const prevClassIdRef = useRef(classId);
  useEffect(() => {
    if (prevClassIdRef.current !== classId) {
      store.set('/selected/searchQuery', '');
      store.set('/form/student-search-field', '');
      prevClassIdRef.current = classId;
    }
  }, [classId]);

  // Sync and filter students list into store based on active searchQuery reactively
  const searchQuery = useStateValue('/selected/searchQuery') as string || '';

  useEffect(() => {
    if (data) {
      const keyword = searchQuery.trim().toLowerCase();
      let mapped = data.map((s: any) => ({
        id: s.id,
        studentId: s.studentId,
        studentNumber: String(s.studentNumber),
        studentName: s.studentName || s.name,
        email: s.email || '',
      }));
      if (keyword) {
        mapped = mapped.filter((s: any) =>
          s.studentId.toLowerCase().includes(keyword) ||
          s.studentNumber.toLowerCase().includes(keyword) ||
          s.studentName.toLowerCase().includes(keyword) ||
          s.email.toLowerCase().includes(keyword)
        );
      }
      const current = store.get('/data/listStudents');
      if (JSON.stringify(current) !== JSON.stringify(mapped)) {
        store.set('/data/listStudents', mapped);
      }
    }
  }, [data, searchQuery, store]);

  // Sync grade items into store reactively
  useEffect(() => {
    if (gradeItemsData) {
      const current = store.get('/data/listGradeItems');
      if (JSON.stringify(current) !== JSON.stringify(gradeItemsData)) {
        store.set('/data/listGradeItems', gradeItemsData);
      }
    }
  }, [gradeItemsData, store]);

  // Sync grade records into store reactively
  useEffect(() => {
    if (gradeRecordsData) {
      const current = store.get('/data/listGradeRecords');
      if (JSON.stringify(current) !== JSON.stringify(gradeRecordsData)) {
        store.set('/data/listGradeRecords', gradeRecordsData);
      }
    }
  }, [gradeRecordsData, store]);

  // Decoupled Student Form Modal Logic:
  // Populate the student-form-modal inputs dynamically based on selectedStudentId
  const studentModalOpen = store.get('/modals/student-form-modal');
  const selectedStudentId = store.get('/selected/studentId') as string;

  useEffect(() => {
    if (studentModalOpen && selectedStudentId) {
      const currentId = store.get('/form/modal-student-id-field') || '';
      const currentNumber = store.get('/form/modal-student-number-field') || '';
      const currentName = store.get('/form/modal-student-name-field') || '';
      const currentEmail = store.get('/form/modal-student-email-field') || '';
      const students = (store.get('/data/listStudents') as any[]) || [];
      const found = students.find((s) => s.id === selectedStudentId);
      if (found) {
        if (currentId !== found.studentId) store.set('/form/modal-student-id-field', found.studentId);
        if (currentNumber !== found.studentNumber) store.set('/form/modal-student-number-field', found.studentNumber);
        if (currentName !== found.studentName) store.set('/form/modal-student-name-field', found.studentName);
        if (currentEmail !== found.email) store.set('/form/modal-student-email-field', found.email);
      }
    }
  }, [studentModalOpen, selectedStudentId]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
