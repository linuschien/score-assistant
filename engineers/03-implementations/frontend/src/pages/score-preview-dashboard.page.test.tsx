import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ScorePreviewDashboardPage from './score-preview-dashboard.page';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { server } from '@/mocks/server';
import { http, graphql, HttpResponse } from 'msw';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0
    },
  },
});

const store = createStateStore({
  selected: {
    classId: '1',
    semesterId: '1'
  },
  data: {
    listStudents: [
      { id: 'student-1', studentNumber: '01', studentName: '王小明' }
    ],
    listGradeItems: [
      { id: 'item-1', itemName: '期中考', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.3 }
    ],
    listGradeRecords: [
      { id: 'r-1', studentId: 'student-1', gradeItemId: 'item-1', score: 80 }
    ]
  },
  modals: {}
});

const executeBehavior = vi.fn(async (params: any) => {
  const ref = params?.ref;
  if (!ref) return null;
  return executeRegisteredBehavior(ref, store);
});

const navigate = vi.fn();
const testHandlers = {
  navigate,
  executeBehavior
};

describe('ScorePreviewDashboardPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    // MSW interceptors for isolation
    server.use(
      // 1. Semester details
      http.get('*/api/v1/semesters/:id', ({ params }) => {
        return HttpResponse.json({
          id: params.id,
          name: '112-1 第一學期',
          semesterName: '112-1 第一學期'
        });
      }),

      // 2. Class details
      http.get('*/api/v1/semesters/:semesterId/classes/:id', ({ params }) => {
        return HttpResponse.json({
          id: params.id,
          className: '資訊三甲',
          name: '資訊三甲',
          semesterId: params.semesterId
        });
      }),

      // 3. listStudents GraphQL query
      graphql.query('listStudents', () => {
        return HttpResponse.json({
          data: {
            listStudents: [
              { id: 'student-1', studentNumber: '01', studentName: '王小明' }
            ]
          }
        });
      }),

      // 4. listGradeItems GraphQL query
      graphql.query('listGradeItems', () => {
        return HttpResponse.json({
          data: {
            listGradeItems: [
              { id: 'item-1', itemName: '期中考', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.3 }
            ]
          }
        });
      }),

      // 5. listGradeRecords GraphQL query
      graphql.query('listGradeRecords', () => {
        return HttpResponse.json({
          data: {
            listGradeRecords: [
              { id: 'r-1', studentId: 'student-1', gradeItemId: 'item-1', score: 80 }
            ]
          }
        });
      }),

      // 6. exportGrades POST request
      http.post(/\/api\/v1\/semesters\/[^\/]+\/classes\/[^\/]+:exportGrades$/, async ({ request }) => {
        const body = await request.json() as any;
        if (body.format === 'EXCEL') {
          return HttpResponse.json({ success: true });
        }
        return HttpResponse.json({ success: false, message: 'Invalid format' });
      })
    );

    store.set('/selected/classId', '1');
    store.set('/selected/semesterId', '1');
    store.set('/data/listStudents', [
      { id: 'student-1', studentNumber: '01', studentName: '王小明' }
    ]);
    store.set('/data/listGradeItems', [
      { id: 'item-1', itemName: '期中考', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.3 }
    ]);
    store.set('/data/listGradeRecords', [
      { id: 'r-1', studentId: 'student-1', gradeItemId: 'item-1', score: 80 }
    ]);
  });

  it('renders layout and displays dynamic grade items and calculated weighted scores', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <ScorePreviewDashboardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByRole('heading', { name: /成績總表預覽/i })).toBeInTheDocument();
    expect(screen.getByText('王小明')).toBeInTheDocument();
    expect(screen.getByText('期中考')).toBeInTheDocument();

    // Verify calculated score: (80/100) * 0.3 = 0.24. 0.24 * 100 = 24.0
    expect(screen.getByText('24.0')).toBeInTheDocument();
  });

  it('renders weight warning banner when total weight is not 100%', async () => {
    // 0.3 total weight is not 100% -> should show warning
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <ScorePreviewDashboardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText(/總權重未達 100%/)).toBeInTheDocument();
  });

  it('hides weight warning banner when total weight is exactly 100%', async () => {
    // Set total weight to exactly 1.0 (100%)
    store.set('/data/listGradeItems', [
      { id: 'item-1', itemName: '期中考', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.4 },
      { id: 'item-2', itemName: '期末考', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.6 }
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <ScorePreviewDashboardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    // Wait and confirm that warning is NOT rendered
    await waitFor(() => {
      expect(screen.queryByText(/總權重未達 100%/)).toBeNull();
    });
  });

  it('triggers spreadsheet export behavior when download button is clicked', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <ScorePreviewDashboardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    const exportBtn = await screen.findByRole('button', { name: /匯出 Excel/i });
    fireEvent.click(exportBtn);

    expect(executeBehavior).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'Export grades to a file'
      })
    );
  });
});
