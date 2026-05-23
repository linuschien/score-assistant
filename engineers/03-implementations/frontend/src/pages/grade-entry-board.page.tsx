import { useEffect } from 'react';
import { Renderer, useStateStore, useStateValue } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import spec from '@/schemas/grade-entry-board.render-schema.json';

import { useGetSemesterById } from '@/hooks/use-get-semester-by-id';
import { useGetClassById } from '@/hooks/use-get-class-by-id';
import { useListStudents } from '@/hooks/use-list-students';
import { useListGradeItems } from '@/hooks/use-list-grade-items';
import { useListGradeRecords } from '@/hooks/use-list-grade-records';
import { useListAttachments } from '@/hooks/use-list-attachments';

import { registerBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';
import { api, API_BASE } from '@/lib/api-client';

// ────────────────────────────────────────────────────────────────────────────────
// Static Behavior Registrations
// ────────────────────────────────────────────────────────────────────────────────
registerBehavior('Update an existing GradeRecord', async (_ref, store) => {
  const studentId = store.get('/form/activeStudentId') as string;
  const gradeItemId = store.get('/form/activeGradeItemId') as string;
  const score = store.get('/form/activeScore') as number | null;
  const recordId = store.get('/form/activeRecordId') as string | null;

  let newRec: any = null;
  const payload = {
    gradeItemId,
    grade_item_id: gradeItemId,
    studentId,
    student_id: studentId,
    score
  };

  if (recordId) {
    // PUT updates score on an existing record
    newRec = await api.put(`${API_BASE}/grade-records/${recordId}`, payload);
  } else {
    // POST creates a new record
    newRec = await api.post(`${API_BASE}/grade-records`, payload);
  }

  // Synchronously update the store to prevent race conditions on subsequent queries (e.g. paperclip clicks)
  if (newRec) {
    const currentList = (store.get('/data/listGradeRecords') || []) as any[];
    const idx = currentList.findIndex((r: any) => r.id === newRec.id);
    let nextList;
    if (idx !== -1) {
      nextList = currentList.map((r: any, i: number) => i === idx ? newRec : r);
    } else {
      nextList = [...currentList, newRec];
    }
    store.set('/data/listGradeRecords', nextList);
  }

  // Refetch records dynamically
  await queryClient.invalidateQueries({ queryKey: ['listGradeRecords'] });
  return '成績已更新';
});

registerBehavior('Record Attendance with automatic status-to-score mapping', async (_ref, store) => {
  const studentId = store.get('/form/activeStudentId') as string;
  const gradeItemId = store.get('/form/activeGradeItemId') as string;
  const score = store.get('/form/activeScore') as number | null;
  const attendanceStatus = store.get('/form/activeAttendanceStatus') as string;
  const recordId = store.get('/form/activeRecordId') as string | null;

  let newRec: any = null;
  const payload = {
    gradeItemId,
    grade_item_id: gradeItemId,
    studentId,
    student_id: studentId,
    score,
    attendance_status: attendanceStatus,
    attendanceStatus
  };

  if (recordId) {
    newRec = await api.put(`${API_BASE}/grade-records/${recordId}`, payload);
  } else {
    newRec = await api.post(`${API_BASE}/grade-records`, payload);
  }

  // Synchronously update the store to prevent race conditions on subsequent queries (e.g. paperclip clicks)
  if (newRec) {
    const currentList = (store.get('/data/listGradeRecords') || []) as any[];
    const idx = currentList.findIndex((r: any) => r.id === newRec.id);
    let nextList;
    if (idx !== -1) {
      nextList = currentList.map((r: any, i: number) => i === idx ? newRec : r);
    } else {
      nextList = [...currentList, newRec];
    }
    store.set('/data/listGradeRecords', nextList);
  }

  await queryClient.invalidateQueries({ queryKey: ['listGradeRecords'] });
  return '出缺席已登記';
});

registerBehavior('Upload an Attachment for a GradeRecord', async (_ref, store) => {
  const gradeRecordId = store.get('/selected/gradeRecordId') as string;

  if (!gradeRecordId) {
    alert('無法取得成績紀錄 ID');
    return '無法取得成績紀錄 ID';
  }

  // Trigger native file picker programmatically
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.xlsx,.jpg,.png,.zip';
    input.onchange = (e: any) => {
      const files = e.target.files;
      resolve(files && files.length > 0 ? files[0] : null);
    };
    input.click();
  });

  if (!file) return null;

  // Boundary check: Size Limit <= 10MB (10,485,760 bytes)
  if (file.size > 10 * 1024 * 1024) {
    alert('檔案大小超過 10MB 限制');
    return '檔案大小超過 10MB 限制';
  }

  // Boundary check: Max 5 attachments
  const existingList = (store.get('/data/listAttachments') || []) as any[];
  if (existingList.length >= 5) {
    alert('上傳附件已達 5 個上限');
    return '上傳附件已達 5 個上限';
  }

  // Read file as Base64 for byte[] REST payload
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const result = e.target.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  await api.post(`${API_BASE}/grade-records/${gradeRecordId}/attachments`, {
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    file_data: base64Data,
    uploaded_at: new Date().toISOString()
  });

  await queryClient.invalidateQueries({ queryKey: ['listAttachments'] });
  return '附件上傳成功';
});

export default function GradeEntryBoardPage() {
  const store = useStateStore();

  // Retrieve selected class/semester from store reactively
  const classId = useStateValue('/selected/classId') as string;
  const semesterId = useStateValue('/selected/semesterId') as string;
  const selectedRecordId = useStateValue('/selected/gradeRecordId') as string;

  // Subscriptions to API queries
  const { data: semesterData } = useGetSemesterById(semesterId || '');
  const { data: classData } = useGetClassById(semesterId || '', classId || '');
  const { data: studentsData } = useListStudents(classId ? { classId } : undefined);
  const { data: gradeItemsData } = useListGradeItems(classId ? { classId } : undefined);
  const { data: gradeRecordsData } = useListGradeRecords();
  const { data: attachmentsData } = useListAttachments(selectedRecordId ? { gradeRecordId: selectedRecordId } : undefined);

  // Sync Semester Context
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

  // Sync Class Context
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

  // Sync Student List
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

  // Sync Grade Items List
  useEffect(() => {
    if (gradeItemsData) {
      const current = store.get('/data/listGradeItems');
      if (JSON.stringify(current) !== JSON.stringify(gradeItemsData)) {
        store.set('/data/listGradeItems', gradeItemsData);
      }
    }
  }, [gradeItemsData, store]);

  // Sync Grade Records List
  useEffect(() => {
    if (gradeRecordsData) {
      const current = store.get('/data/listGradeRecords');
      if (JSON.stringify(current) !== JSON.stringify(gradeRecordsData)) {
        store.set('/data/listGradeRecords', gradeRecordsData);
      }
    }
  }, [gradeRecordsData, store]);

  // Sync Selected Record Attachments List
  useEffect(() => {
    const current = store.get('/data/listAttachments') || [];
    const nextVal = attachmentsData || [];
    if (JSON.stringify(current) !== JSON.stringify(nextVal)) {
      store.set('/data/listAttachments', nextVal);
    }
  }, [attachmentsData, store]);

  return <Renderer spec={spec as any} registry={componentRegistry} />;
}
