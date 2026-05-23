import { graphql, HttpResponse } from 'msw';
import { mockStudents } from '../fixtures';

export const studentHandlers = [
  // Student GraphQL collection mock
  graphql.query('listStudents', () => {
    return HttpResponse.json({
      data: {
        listStudents: mockStudents
      }
    });
  })
];
