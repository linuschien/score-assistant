import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GradeWeightDashboardPage from './grade-weight-dashboard.page';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { server } from '@/mocks/server';
import { http, graphql, HttpResponse } from 'msw';

// ── State-aware Mock Data ───────────────────────────────────────────────────

let testGradeItems = [
  {
    id: '1',
    classId: '1',
    itemName: '作業 1',
    itemType: 'ASSIGNMENT',
    itemDate: '2026-05-01',
    itemDescription: '程式作業',
    maxScore: 100,
    weight: 0.3, // 30%
  },
  {
    id: '2',
    classId: '1',
    itemName: '期中考',
    itemType: 'ASSIGNMENT',
    itemDate: '2026-05-10',
    itemDescription: '期中筆試',
    maxScore: 100,
    weight: 0.4, // 40%
  }
];

const mockPutCalls: any[] = [];

function setupMocks() {
  server.use(
    // 1. GraphQL Mock
    graphql.query('listGradeItems', ({ variables }) => {
      const filter = variables.filter as { classId?: string } | undefined;
      const filtered = filter?.classId
        ? testGradeItems.filter((gi) => gi.classId === filter.classId)
        : testGradeItems;
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

    // 2. Class REST Mock
    http.get('*/semesters/:semesterId/classes/:id', ({ params }) => {
      return HttpResponse.json({
        id: params.id,
        className: '資訊三甲',
        name: '資訊三甲',
        semesterId: params.semesterId
      });
    }),

    // 3. Semester REST Mock
    http.get('*/semesters/:id', ({ params }) => {
      return HttpResponse.json({
        id: params.id,
        name: '112-1 第一學期',
        semesterName: '112-1 第一學期',
        startDate: '2026-02-01',
        endDate: '2026-06-30'
      });
    }),

    // 4. PUT Grade Item REST Mock
    http.put('*/semesters/:semesterId/classes/:classId/grade-items/:gradeItemId', async ({ request, params }) => {
      const body = await request.json() as any;
      mockPutCalls.push({ id: params.gradeItemId, body });
      const idx = testGradeItems.findIndex(gi => gi.id === params.gradeItemId);
      if (idx !== -1) {
        testGradeItems[idx] = {
          ...testGradeItems[idx],
          itemName: body.item_name,
          itemType: body.item_type || 'OTHER',
          itemDate: body.item_date || '',
          itemDescription: body.item_description || '',
          maxScore: body.max_score || 0,
          weight: body.weight || 0,
        };
        return HttpResponse.json(testGradeItems[idx]);
      }
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
    })
  );
}

// ── Test Harness ──────────────────────────────────────────────────────────────

const store = createStateStore({
  modals: {},
  form: {},
  data: {},
  selected: { semesterId: '1', classId: '1' }
});

const executeBehavior = vi.fn(async (params: any) => {
  const ref = params?.ref;
  if (!ref) return null;
  return executeRegisteredBehavior(ref, store);
});

const navigate = vi.fn();
const testHandlers = { navigate, openModal: vi.fn(), executeBehavior };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
        <GradeWeightDashboardPage />
      </JSONUIProvider>
    </QueryClientProvider>
  );
}

describe('GradeWeightDashboardPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
    store.set('/form', {});
    store.set('/data', {});
    store.set('/selected', { semesterId: '1', classId: '1' });
    mockPutCalls.length = 0;
    executeBehavior.mockClear();
    navigate.mockClear();
    testGradeItems = [
      {
        id: '1',
        classId: '1',
        itemName: '作業 1',
        itemType: 'ASSIGNMENT',
        itemDate: '2026-05-01',
        itemDescription: '程式作業',
        maxScore: 100,
        weight: 0.3,
      },
      {
        id: '2',
        classId: '1',
        itemName: '期中考',
        itemType: 'ASSIGNMENT',
        itemDate: '2026-05-10',
        itemDescription: '期中筆試',
        maxScore: 100,
        weight: 0.4,
      }
    ];
    setupMocks();
  });

  it('renders page layout, headings, card and list successfully', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /成績項目權重管理/i })).toBeInTheDocument();
    
    // Breadcrumbs check
    expect(await screen.findByText('首頁')).toBeInTheDocument();
    expect(await screen.findByText('學期列表')).toBeInTheDocument();
    expect(await screen.findByText('班級管理')).toBeInTheDocument();
    expect(await screen.findByText('管理成績項目')).toBeInTheDocument();
    expect(await screen.findByText('成績權重管理')).toBeInTheDocument();

    // MetricCard check: sum of 30% + 40% = 70%
    expect(await screen.findByText('目前總權重')).toBeInTheDocument();
    expect(await screen.findByText('70%')).toBeInTheDocument();

    // Table rows check
    expect((await screen.findAllByText('作業 1')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('期中考')).length).toBeGreaterThanOrEqual(1);

    // Pie chart legends
    expect(await screen.findByText('權重分布圖')).toBeInTheDocument();
  });

  it('calculates total weight reactively when modifying weight inline', async () => {
    const user = userEvent.setup();
    renderPage();

    // Locate weight inputs inside rows using test-id
    const input1 = await screen.findByTestId('weight-input-1') as HTMLInputElement;
    const input2 = await screen.findByTestId('weight-input-2') as HTMLInputElement;

    expect(input1.value).toBe('30');
    expect(input2.value).toBe('40');

    // Change value of weight input 1 to 50
    await user.clear(input1);
    await user.type(input1, '50');

    // The state value should update instantly
    expect(input1.value).toBe('50');

    // The total weight MetricCard should reactively sum to 50 + 40 = 90%
    expect(await screen.findByText('90%')).toBeInTheDocument();
  });

  it('submits successfully with warning when total weight is not 100%', async () => {
    const user = userEvent.setup();
    renderPage();

    const saveButton = await screen.findByRole('button', { name: /儲存權重設定/i });
    expect(saveButton).toBeInTheDocument();

    // Trigger behavior invocation
    await user.click(saveButton);

    expect(executeBehavior).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'Allow saving weight when total is not 100% with a warning' })
    );

    // Verify PUT endpoints are called for each grade item
    await waitFor(() => expect(mockPutCalls.length).toBe(2));

    // Verify weights are correctly scaled to decimals
    expect(mockPutCalls[0].body.weight).toBe(0.3); // 30% -> 0.3
    expect(mockPutCalls[1].body.weight).toBe(0.4); // 40% -> 0.4

    // Behavior returned toast feedback should contain a warning
    const result = await executeBehavior.mock.results[0].value;
    expect(result).toContain('權重總和不等於 100% (目前為 70%)');
  });

  it('submits successfully with exact 100% weight sum', async () => {
    const user = userEvent.setup();
    renderPage();

    const input1 = await screen.findByTestId('weight-input-1');
    const input2 = await screen.findByTestId('weight-input-2') as HTMLInputElement;

    expect(input2.value).toBe('40');

    // Update weights so that total is exactly 100%
    await user.clear(input1);
    await user.type(input1, '60'); // 60 + 40 = 100

    expect(await screen.findByText('100%')).toBeInTheDocument();

    const saveButton = await screen.findByRole('button', { name: /儲存權重設定/i });
    await user.click(saveButton);

    // Verify PUT endpoints are called and weights scaled correctly
    await waitFor(() => expect(mockPutCalls.length).toBe(2));
    expect(mockPutCalls[0].body.weight).toBe(0.6); // 60% -> 0.6
    expect(mockPutCalls[1].body.weight).toBe(0.4); // 40% -> 0.4

    // Behavior returned toast feedback should be success text without warning
    const result = await executeBehavior.mock.results[0].value;
    expect(result).toBe('權重設定已儲存');
  });
});
