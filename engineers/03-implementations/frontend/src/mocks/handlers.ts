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

export const handlers = [
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
  graphql.query('listGradeItems', () => {
    return HttpResponse.json({
      data: {
        listGradeItems: [
          { id: '1', name: '第一次期中考', type: 'exam', examDate: '2023-10-15', weight: 30 }
        ]
      }
    });
  }),
  graphql.query('listGradeRecords', () => {
    return HttpResponse.json({
      data: {
        listGradeRecords: [
          { id: '1', studentNumber: '01', name: '王小明', score: 85, status: 'normal' }
        ]
      }
    });
  }),
  graphql.query('listAttachments', () => {
    return HttpResponse.json({
      data: {
        listAttachments: [
          { id: '1', fileName: 'homework1.pdf', uploadedAt: '2023-09-15' }
        ]
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
