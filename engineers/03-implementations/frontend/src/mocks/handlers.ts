import { http, graphql, HttpResponse } from 'msw';

let mockSemesters = [
  { id: '1', semesterName: '112-1 第一學期', startDate: '2023-09-01', endDate: '2024-01-31', classCount: 3 }
];

let mockClasses = [
  { id: '1', semesterId: '1', className: '資訊三甲' },
  { id: '2', semesterId: '1', className: '資訊三乙' },
  { id: '3', semesterId: '2', className: '電子三甲' }
];

export function resetMockSemesters() {
  mockSemesters = [
    { id: '1', semesterName: '112-1 第一學期', startDate: '2023-09-01', endDate: '2024-01-31', classCount: 3 }
  ];
  mockClasses = [
    { id: '1', semesterId: '1', className: '資訊三甲' },
    { id: '2', semesterId: '1', className: '資訊三乙' },
    { id: '3', semesterId: '2', className: '電子三甲' }
  ];
}

export function resetMockClasses() {
  mockClasses = [
    { id: '1', semesterId: '1', className: '資訊三甲' },
    { id: '2', semesterId: '1', className: '資訊三乙' },
    { id: '3', semesterId: '2', className: '電子三甲' }
  ];
}

let mockGradeItems = [
  {
    id: '1',
    classId: '1',
    itemName: '期中考',
    itemType: 'ASSIGNMENT',
    itemDate: '2026-11-01',
    itemDescription: '期中學科測驗',
    maxScore: 100,
    weight: 0.3,
  }
];

export function resetMockGradeItems() {
  mockGradeItems = [
    {
      id: '1',
      classId: '1',
      itemName: '期中考',
      itemType: 'ASSIGNMENT',
      itemDate: '2026-11-01',
      itemDescription: '期中學科測驗',
      maxScore: 100,
      weight: 0.3,
    }
  ];
}

export function setMockGradeItems(items: any[]) {
  mockGradeItems = items;
}

export let mockGradeRecords: any[] = [
  { id: '1', gradeItemId: '1', studentId: '1', score: 85, lastModifiedAt: '2026-05-22T22:23:43', version: 1 }
];

export function resetMockGradeRecords() {
  mockGradeRecords = [
    { id: '1', gradeItemId: '1', studentId: '1', score: 85, lastModifiedAt: '2026-05-22T22:23:43', version: 1 }
  ];
}

export function setMockGradeRecords(records: any[]) {
  mockGradeRecords = records;
}

export let mockAttachments: any[] = [
  { id: '1', gradeRecordId: '1', fileName: 'homework1.pdf', mimeType: 'application/pdf', fileSize: 10240, uploadedAt: '2023-09-15' }
];

export function resetMockAttachments() {
  mockAttachments = [
    { id: '1', gradeRecordId: '1', fileName: 'homework1.pdf', mimeType: 'application/pdf', fileSize: 10240, uploadedAt: '2023-09-15' }
  ];
}

export function setMockAttachments(attachmentsList: any[]) {
  mockAttachments = attachmentsList;
}

export const handlers = [
  // Grade Item REST endpoints
  http.post('*/semesters/:semesterId/classes/:classId/grade-items', async ({ request, params }) => {
    try {
      const body = (await request.json()) as any;
      if (!body.item_name || !body.item_name.trim()) {
        return HttpResponse.json(
          { error: 'Request validation failed: item_name: 不能為空白' },
          { status: 400 }
        );
      }
      const newGradeItem = {
        id: String(mockGradeItems.length + 1),
        classId: params.classId as string,
        itemName: body.item_name,
        itemType: body.item_type || 'OTHER',
        itemDate: body.item_date || '',
        itemDescription: body.item_description || '',
        maxScore: body.max_score || 0,
        weight: body.weight || 0,
      };
      mockGradeItems.push(newGradeItem);
      return HttpResponse.json(newGradeItem, { status: 201 });
    } catch (err) {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }),

  http.put('*/semesters/:semesterId/classes/:classId/grade-items/:gradeItemId', async ({ request, params }) => {
    try {
      const body = (await request.json()) as any;
      if (!body.item_name || !body.item_name.trim()) {
        return HttpResponse.json(
          { error: 'Request validation failed: item_name: 不能為空白' },
          { status: 400 }
        );
      }
      const idx = mockGradeItems.findIndex((gi) => gi.id === params.gradeItemId);
      if (idx !== -1) {
        mockGradeItems[idx] = {
          ...mockGradeItems[idx],
          itemName: body.item_name,
          itemType: body.item_type || 'OTHER',
          itemDate: body.item_date || '',
          itemDescription: body.item_description || '',
          maxScore: body.max_score || 0,
          weight: body.weight || 0,
        };
        return HttpResponse.json(mockGradeItems[idx]);
      }
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
    } catch (err) {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }),

  http.delete('*/semesters/:semesterId/classes/:classId/grade-items/:gradeItemId', ({ params }) => {
    mockGradeItems = mockGradeItems.filter((gi) => gi.id !== params.gradeItemId);
    return HttpResponse.json(null, { status: 204 });
  }),
  // Fallback REST endpoint mocks
  http.get('*/semesters/:id', ({ params }) => {
    const sem = mockSemesters.find(s => s.id === params.id);
    if (sem) {
      return HttpResponse.json({ id: sem.id, name: sem.semesterName, startDate: sem.startDate, endDate: sem.endDate });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.post('*/semesters', async ({ request }) => {
    const body = await request.json() as any;
    const newSem = {
      id: String(mockSemesters.length + 1),
      semesterName: body.semester_name,
      startDate: body.start_date,
      endDate: body.end_date,
      classCount: 0
    };
    mockSemesters.push(newSem);
    return HttpResponse.json({ id: newSem.id, name: newSem.semesterName, startDate: newSem.startDate, endDate: newSem.endDate }, { status: 201 });
  }),
  http.put('*/semesters/:id', async ({ request, params }) => {
    const body = await request.json() as any;
    const idx = mockSemesters.findIndex(s => s.id === params.id);
    if (idx !== -1) {
      mockSemesters[idx] = {
        ...mockSemesters[idx],
        semesterName: body.semester_name,
        startDate: body.start_date,
        endDate: body.end_date
      };
      const sem = mockSemesters[idx];
      return HttpResponse.json({ id: sem.id, name: sem.semesterName, startDate: sem.startDate, endDate: sem.endDate });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.delete('*/semesters/:id', ({ params }) => {
    mockSemesters = mockSemesters.filter(s => s.id !== params.id);
    return HttpResponse.json({ success: true });
  }),

  // Class REST endpoints
  http.get('*/semesters/:semesterId/classes/:id', ({ params }) => {
    const cls = mockClasses.find(c => c.id === params.id);
    if (cls) {
      return HttpResponse.json({ id: cls.id, className: cls.className, name: cls.className, semesterId: cls.semesterId });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.post('*/semesters/:semesterId/classes', async ({ request, params }) => {
    const body = await request.json() as any;
    if (!body.class_name || !body.class_name.trim()) {
      return HttpResponse.json(
        { error: 'Request validation failed: class_name: 不能為空白' },
        { status: 400 }
      );
    }
    const newClass = {
      id: String(mockClasses.length + 1),
      semesterId: params.semesterId as string,
      className: body.class_name,
    };
    mockClasses.push(newClass);
    return HttpResponse.json({ id: newClass.id, className: newClass.className, name: newClass.className, semesterId: newClass.semesterId }, { status: 201 });
  }),
  http.put('*/semesters/:semesterId/classes/:id', async ({ request, params }) => {
    const body = await request.json() as any;
    if (!body.class_name || !body.class_name.trim()) {
      return HttpResponse.json(
        { error: 'Request validation failed: class_name: 不能為空白' },
        { status: 400 }
      );
    }
    const idx = mockClasses.findIndex(c => c.id === params.id);
    if (idx !== -1) {
      mockClasses[idx] = {
        ...mockClasses[idx],
        className: body.class_name
      };
      const cls = mockClasses[idx];
      return HttpResponse.json({ id: cls.id, className: cls.className, name: cls.className, semesterId: cls.semesterId });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.delete('*/semesters/:semesterId/classes/:id', ({ params }) => {
    mockClasses = mockClasses.filter(c => c.id !== params.id);
    return HttpResponse.json({ success: true });
  }),

  // Grade Records REST endpoints
  http.get('*/grade-records/:id', ({ params }) => {
    const record = mockGradeRecords.find(r => r.id === params.id);
    if (record) {
      return HttpResponse.json({
        id: record.id,
        grade_record_id: record.id,
        gradeItemId: record.gradeItemId,
        studentId: record.studentId,
        score: record.score,
        lastModifiedAt: record.lastModifiedAt,
        version: record.version
      });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),

  http.post('*/grade-records', async ({ request }) => {
    try {
      const body = await request.json() as any;
      let scoreVal = body.score;
      if (body.attendance_status !== undefined) {
        if (body.attendance_status === 'PRESENT') scoreVal = 1.0;
        else if (body.attendance_status === 'ABSENT') scoreVal = 0.0;
        else if (body.attendance_status === 'EXCUSED') scoreVal = 0.5;
      }

      // Check boundaries if item is not CLASSROOM_PERFORMANCE
      const itemId = body.gradeItemId || body.grade_item_id;
      const studentId = body.studentId || body.student_id;
      const item = mockGradeItems.find(gi => gi.id === itemId);
      if (item && item.itemType !== 'CLASSROOM_PERFORMANCE') {
        if (scoreVal !== null && scoreVal !== undefined && scoreVal < 0) {
          return HttpResponse.json({ error: 'Request validation failed: score must be positive' }, { status: 400 });
        }
      }

      const newRecord = {
        id: 'r-' + String(mockGradeRecords.length + 1) + '-' + Math.random().toString(36).substring(2, 6),
        gradeItemId: itemId,
        studentId: studentId,
        score: scoreVal !== null && scoreVal !== undefined ? Number(scoreVal) : null,
        lastModifiedAt: new Date().toISOString(),
        version: 1
      };
      mockGradeRecords.push(newRecord);
      return HttpResponse.json({
        id: newRecord.id,
        grade_record_id: newRecord.id,
        gradeItemId: newRecord.gradeItemId,
        grade_item_id: newRecord.gradeItemId,
        studentId: newRecord.studentId,
        student_id: newRecord.studentId,
        score: newRecord.score,
        lastModifiedAt: newRecord.lastModifiedAt,
        last_modified_at: newRecord.lastModifiedAt,
        version: newRecord.version
      }, { status: 201 });
    } catch (err) {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }),

  http.put('*/grade-records/:id', async ({ request, params }) => {
    try {
      const body = await request.json() as any;
      const idx = mockGradeRecords.findIndex(r => r.id === params.id);
      if (idx !== -1) {
        mockGradeRecords[idx] = {
          ...mockGradeRecords[idx],
          score: body.score !== null && body.score !== undefined ? Number(body.score) : mockGradeRecords[idx].score,
          lastModifiedAt: new Date().toISOString(),
          version: mockGradeRecords[idx].version + 1
        };
        const record = mockGradeRecords[idx];
        return HttpResponse.json({
          id: record.id,
          grade_record_id: record.id,
          gradeItemId: record.gradeItemId,
          grade_item_id: record.gradeItemId,
          studentId: record.studentId,
          student_id: record.studentId,
          score: record.score,
          lastModifiedAt: record.lastModifiedAt,
          last_modified_at: record.lastModifiedAt,
          version: record.version
        });
      }
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
    } catch (err) {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }),

  http.patch('*/grade-records/:id', async ({ request, params }) => {
    try {
      const body = await request.json() as any;
      const idx = mockGradeRecords.findIndex(r => r.id === params.id);
      if (idx !== -1) {
        mockGradeRecords[idx] = {
          ...mockGradeRecords[idx],
          score: body.score !== null && body.score !== undefined ? Number(body.score) : mockGradeRecords[idx].score,
          lastModifiedAt: new Date().toISOString(),
          version: mockGradeRecords[idx].version + 1
        };
        const record = mockGradeRecords[idx];
        return HttpResponse.json({
          id: record.id,
          grade_record_id: record.id,
          gradeItemId: record.gradeItemId,
          studentId: record.studentId,
          score: record.score,
          lastModifiedAt: record.lastModifiedAt,
          version: record.version
        });
      }
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
    } catch (err) {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }),

  // Attachments REST endpoints
  http.get('*/grade-records/:gradeRecordId/attachments', ({ params }) => {
    const list = mockAttachments.filter(a => a.gradeRecordId === params.gradeRecordId);
    return HttpResponse.json(list);
  }),

  http.post('*/grade-records/:gradeRecordId/attachments', async ({ request, params }) => {
    try {
      const sizeHeader = request.headers.get('content-length');
      const size = sizeHeader ? Number(sizeHeader) : 0;
      if (size > 10 * 1024 * 1024) {
        return HttpResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
      }

      const count = mockAttachments.filter(a => a.gradeRecordId === params.gradeRecordId).length;
      if (count >= 5) {
        return HttpResponse.json({ error: 'Attachment limit reached (max 5)' }, { status: 400 });
      }

      const newAttachment = {
        id: 'att-' + String(mockAttachments.length + 1) + '-' + Math.random().toString(36).substring(2, 6),
        attachment_id: 'att-' + String(mockAttachments.length + 1),
        gradeRecordId: params.gradeRecordId,
        grade_record_id: params.gradeRecordId,
        fileName: 'homework_mock.pdf',
        file_name: 'homework_mock.pdf',
        mimeType: 'application/pdf',
        mime_type: 'application/pdf',
        fileSize: size || 1024,
        file_size: size || 1024,
        uploadedAt: new Date().toISOString(),
        uploaded_at: new Date().toISOString()
      };
      mockAttachments.push(newAttachment);
      return HttpResponse.json(newAttachment, { status: 201 });
    } catch (err) {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }),

  http.get('*/grade-records/:gradeRecordId/attachments/:attachmentId', ({ params }) => {
    const att = mockAttachments.find(a => a.id === params.attachmentId || a.attachment_id === params.attachmentId);
    if (att) {
      return HttpResponse.json({
        ...att,
        file_data: att.fileData || 'bW9jayBiYXNlNjQgZGF0YQ=='
      });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),

  http.delete('*/grade-records/:gradeRecordId/attachments/:attachmentId', ({ params }) => {
    const idx = mockAttachments.findIndex(a => a.id === params.attachmentId || a.attachment_id === params.attachmentId);
    if (idx !== -1) {
      mockAttachments.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  
  // Fallback GraphQL collection mocks
  graphql.query('listSemesters', () => {
    return HttpResponse.json({
      data: {
        listSemesters: mockSemesters
      }
    });
  }),
  graphql.query('listClasses', ({ variables }) => {
    const filter = variables.filter as { semesterId?: string } | undefined;
    const filtered = filter?.semesterId
      ? mockClasses.filter(c => c.semesterId === filter.semesterId)
      : mockClasses;
    return HttpResponse.json({
      data: {
        listClasses: filtered
      }
    });
  }),
  graphql.query('listStudents', () => {
    return HttpResponse.json({
      data: {
        listStudents: [
          { id: '1', studentNumber: '01', name: '王小明', attendanceStatus: 'normal' }
        ]
      }
    });
  }),
  graphql.query('listGradeItems', ({ variables }) => {
    const filter = variables.filter as { classId?: string } | undefined;
    const filtered = filter?.classId
      ? mockGradeItems.filter((gi) => gi.classId === filter.classId)
      : mockGradeItems;
    return HttpResponse.json({
      data: {
        listGradeItems: filtered.map((gi) => ({
          id: gi.id,
          classId: gi.classId,
          itemName: gi.itemName,
          itemType: gi.itemType,
          itemDate: gi.itemDate,
          itemDescription: gi.itemDescription,
          maxScore: gi.maxScore,
          weight: gi.weight,
        })),
      },
    });
  }),
  graphql.query('listGradeRecords', () => {
    return HttpResponse.json({
      data: {
        listGradeRecords: mockGradeRecords.map(r => ({
          ...r,
          studentNumber: '01',
          name: '王小明',
          status: 'normal'
        }))
      }
    });
  }),
  graphql.query('listAttachments', ({ variables }) => {
    const filter = variables.filter as { gradeRecordId?: string } | undefined;
    const filtered = filter?.gradeRecordId
      ? mockAttachments.filter(a => a.gradeRecordId === filter.gradeRecordId)
      : mockAttachments;
    return HttpResponse.json({
      data: {
        listAttachments: filtered
      }
    });
  }),
  graphql.query('listClassGrades', () => {
    return HttpResponse.json({
      data: {
        listClassGrades: [
          { id: '1', studentNumber: '01', name: '王小明', averageScore: 82.5, rank: 3 }
        ]
      }
    });
  }),
  graphql.query('listGradeWeightDistribution', () => {
    return HttpResponse.json({
      data: {
        listGradeWeightDistribution: [
          { id: '1', category: 'exam', weight: 50, count: 2 }
        ]
      }
    });
  })
];
