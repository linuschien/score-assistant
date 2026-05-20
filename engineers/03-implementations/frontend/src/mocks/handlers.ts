import { http, graphql, HttpResponse } from 'msw';

export const handlers = [
  // Fallback REST endpoint mocks
  http.get('*/semesters/:id', () => {
    return HttpResponse.json({ id: '1', name: '112-1 第一學期', startDate: '2023-09-01', endDate: '2024-01-31' });
  }),
  http.get('*/classes/:id', () => {
    return HttpResponse.json({ id: '1', name: '資訊三甲', studentCount: 38 });
  }),
  
  // Fallback GraphQL collection mocks
  graphql.query('listSemesters', () => {
    return HttpResponse.json({
      data: {
        listSemesters: [
          { id: '1', name: '112-1 第一學期', startDate: '2023-09-01', endDate: '2024-01-31', classCount: 3 }
        ]
      }
    });
  }),
  graphql.query('listClasses', () => {
    return HttpResponse.json({
      data: {
        listClasses: [
          { id: '1', name: '資訊三甲', studentCount: 38 }
        ]
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
