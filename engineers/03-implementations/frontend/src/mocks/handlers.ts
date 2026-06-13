import { http, HttpResponse } from 'msw';
import { semesterHandlers } from './handlers/semester-handlers';
import { classHandlers } from './handlers/class-handlers';
import { studentHandlers } from './handlers/student-handlers';
import { gradeHandlers } from './handlers/grade-handlers';

// Re-export seed fixtures and helpers for full backward compatibility
export {
  mockSemesters,
  mockClasses,
  mockGradeItems,
  mockGradeRecords,
  mockAttachments,
  mockStudents,
  resetMockSemesters,
  resetMockClasses,
  resetMockGradeItems,
  setMockGradeItems,
  resetMockGradeRecords,
  setMockGradeRecords,
  resetMockAttachments,
  setMockAttachments
} from './fixtures';

export const whoamiHandlers = [
  http.get('*/whoami', () => {
    return HttpResponse.json({ email: 'dev-user@example.com' });
  })
];

export const copilotHandlers = [
  http.post('*/api/agui/:agentId/chat', async ({ request }) => {
    try {
      const body = await request.clone().json() as any;
      if (body?.method === 'info') {
        return HttpResponse.json({
          version: '1.0',
          mode: 'sse',
          agents: {
            default: {
              description: 'Grade Entry assistant',
              capabilities: {}
            },
            'grade-entry-agent': {
              description: 'Grade Entry Agent',
              capabilities: {}
            }
          }
        });
      }
    } catch (e) {
      // Ignore json parse error
    }
    return HttpResponse.json({ status: 'ok' });
  }),
  http.post('*/api/agui/:agentId/chat/info', () => {
    return HttpResponse.json({
      version: '1.0',
      mode: 'sse',
      agents: {
        default: {
          description: 'Grade Entry assistant',
          capabilities: {}
        },
        'grade-entry-agent': {
          description: 'Grade Entry Agent',
          capabilities: {}
        }
      }
    });
  }),
  http.get('*/api/agui/:agentId/chat/info', () => {
    return HttpResponse.json({
      version: '1.0',
      mode: 'sse',
      agents: {
        default: {
          description: 'Grade Entry assistant',
          capabilities: {}
        },
        'grade-entry-agent': {
          description: 'Grade Entry Agent',
          capabilities: {}
        }
      }
    });
  })
];

// Aggregate all domain-specific handlers
export const handlers = [
  ...whoamiHandlers,
  ...copilotHandlers,
  ...semesterHandlers,
  ...classHandlers,
  ...studentHandlers,
  ...gradeHandlers
];
