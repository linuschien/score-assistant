import { http, graphql, HttpResponse } from 'msw';
import { mockClasses } from '../fixtures';

export const classHandlers = [
  // Class REST endpoints
  http.get('*/semesters/:semesterId/classes/:id', ({ params }) => {
    const cls = mockClasses.find(c => c.id === params.id);
    if (cls) {
      return HttpResponse.json({ id: cls.id, className: cls.className, semesterId: cls.semesterId, passingThreshold: cls.passingThreshold ?? 60.0 });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.post('*/semesters/:semesterId/classes', async ({ request, params }) => {
    const body = await request.json() as any;
    if (!body.className || !body.className.trim()) {
      return HttpResponse.json(
        { error: 'Request validation failed: className: 不能為空白' },
        { status: 400 }
      );
    }
    const newClass = {
      id: String(mockClasses.length + 1),
      semesterId: params.semesterId as string,
      className: body.className,
      passingThreshold: body.passingThreshold ? parseFloat(body.passingThreshold) : 60.0,
    };
    mockClasses.push(newClass);
    return HttpResponse.json({ id: newClass.id, className: newClass.className, semesterId: newClass.semesterId, passingThreshold: newClass.passingThreshold }, { status: 201 });
  }),
  http.put('*/semesters/:semesterId/classes/:id', async ({ request, params }) => {
    const body = await request.json() as any;
    if (!body.className || !body.className.trim()) {
      return HttpResponse.json(
        { error: 'Request validation failed: className: 不能為空白' },
        { status: 400 }
      );
    }
    const idx = mockClasses.findIndex(c => c.id === params.id);
    if (idx !== -1) {
      mockClasses[idx] = {
        ...mockClasses[idx],
        className: body.className,
        passingThreshold: body.passingThreshold ? parseFloat(body.passingThreshold) : mockClasses[idx].passingThreshold
      };
      const cls = mockClasses[idx];
      return HttpResponse.json({ id: cls.id, className: cls.className, semesterId: cls.semesterId, passingThreshold: cls.passingThreshold });
    }
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
  }),
  http.delete('*/semesters/:semesterId/classes/:id', ({ params }) => {
    const idx = mockClasses.findIndex(c => c.id === params.id);
    if (idx !== -1) {
      mockClasses.splice(idx, 1);
    }
    return HttpResponse.json({ success: true });
  }),

  // Class GraphQL collection mock
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
  })
];
