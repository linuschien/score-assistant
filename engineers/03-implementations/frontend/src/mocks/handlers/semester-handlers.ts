import { http, graphql, HttpResponse } from 'msw';
import { mockSemesters } from '../fixtures';

export const semesterHandlers = [
  // Semester REST endpoints
  http.get('*/semesters/:id', ({ params }) => {
    const sem = mockSemesters.find(s => s.id === params.id);
    if (sem) {
      return HttpResponse.json({ id: sem.id, semesterName: sem.semesterName, startDate: sem.startDate, endDate: sem.endDate });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.post('*/semesters', async ({ request }) => {
    const body = await request.json() as any;
    const newSem = {
      id: String(mockSemesters.length + 1),
      semesterName: body.semesterName,
      startDate: body.startDate,
      endDate: body.endDate,
      classCount: 0
    };
    mockSemesters.push(newSem);
    return HttpResponse.json({ id: newSem.id, semesterName: newSem.semesterName, startDate: newSem.startDate, endDate: newSem.endDate }, { status: 201 });
  }),
  http.put('*/semesters/:id', async ({ request, params }) => {
    const body = await request.json() as any;
    const idx = mockSemesters.findIndex(s => s.id === params.id);
    if (idx !== -1) {
      mockSemesters[idx] = {
        ...mockSemesters[idx],
        semesterName: body.semesterName,
        startDate: body.startDate,
        endDate: body.endDate
      };
      const sem = mockSemesters[idx];
      return HttpResponse.json({ id: sem.id, semesterName: sem.semesterName, startDate: sem.startDate, endDate: sem.endDate });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.delete('*/semesters/:id', ({ params }) => {
    const idx = mockSemesters.findIndex(s => s.id === params.id);
    if (idx !== -1) {
      mockSemesters.splice(idx, 1);
    }
    return HttpResponse.json({ success: true });
  }),

  // Semester GraphQL collection mock
  graphql.query('listSemesters', () => {
    return HttpResponse.json({
      data: {
        listSemesters: mockSemesters
      }
    });
  })
];
