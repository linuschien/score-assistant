import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GradeItemListPage from './grade-item-list.page';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { server } from '@/mocks/server';
import { http, graphql, HttpResponse } from 'msw';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_GRADE_ITEMS_INITIAL = [
  {
    id: '1',
    classId: '1',
    itemName: '期中考',
    itemType: 'ASSIGNMENT',
    itemDate: '2026-11-01',
    itemDescription: '期中學科測驗',
    maxScore: 100,
    weight: 0.3,
  },
];

let mockGradeItems = [...MOCK_GRADE_ITEMS_INITIAL];

function setupMocks() {
  server.use(
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

    http.post('*/semesters/:semesterId/classes/:classId/grade-items', async ({ request, params }) => {
      try {
        const body = (await request.json()) as any;
        if (!body.itemName || !body.itemName.trim()) {
          return HttpResponse.json(
            { error: 'Request validation failed: itemName: 不能為空白' },
            { status: 400 }
          );
        }
        const newGradeItem = {
          id: String(mockGradeItems.length + 1),
          classId: params.classId as string,
          itemName: body.itemName,
          itemType: body.itemType || 'OTHER',
          itemDate: body.itemDate || '',
          itemDescription: body.itemDescription || '',
          maxScore: body.maxScore || 0,
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
        if (!body.itemName || !body.itemName.trim()) {
          return HttpResponse.json(
            { error: 'Request validation failed: itemName: 不能為空白' },
            { status: 400 }
          );
        }
        const idx = mockGradeItems.findIndex((gi) => gi.id === params.gradeItemId);
        if (idx !== -1) {
          mockGradeItems[idx] = {
            ...mockGradeItems[idx],
            itemName: body.itemName,
            itemType: body.itemType || 'OTHER',
            itemDate: body.itemDate || '',
            itemDescription: body.itemDescription || '',
            maxScore: body.maxScore || 0,
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
    })
  );
}

// ── Test Harness ──────────────────────────────────────────────────────────────

const store = createStateStore({ modals: {}, form: {}, data: {}, selected: { semesterId: '1', classId: '1' } });

const openModal = vi.fn((params: any) => {
  if (params?.id) {
    store.set(`/modals/${params.id}`, true);
  }
});

const executeBehavior = vi.fn(async (params: any) => {
  const ref = params?.ref;
  if (!ref) return null;
  return executeRegisteredBehavior(ref, store);
});

const navigate = vi.fn();
const testHandlers = { navigate, openModal, executeBehavior };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
        <GradeItemListPage />
      </JSONUIProvider>
    </QueryClientProvider>
  );
}

describe('GradeItemListPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
    store.set('/form', {});
    store.set('/data', {});
    store.set('/selected', { semesterId: '1', classId: '1' });
    mockGradeItems = [...MOCK_GRADE_ITEMS_INITIAL];
    setupMocks();
    vi.clearAllMocks();
  });

  // ── Query: 表格顯示資料 ────────────────────────────────────────────────────
  describe('Query', () => {
    it('renders page heading successfully', async () => {
      renderPage();
      expect(await screen.findByRole('heading', { name: /成績項目管理/i })).toBeInTheDocument();
    });

    it('renders grade item rows from synced listGradeItems data', async () => {
      renderPage();
      expect(await screen.findByText('期中考')).toBeInTheDocument();
      expect(await screen.findByText('30')).toBeInTheDocument();
    });

    it('shows empty state when no grade items are present', async () => {
      mockGradeItems = [];
      renderPage();
      expect(await screen.findByText('(沒有資料)')).toBeInTheDocument();
    });
  });

  // ── Create: 建立成績項目 ────────────────────────────────────────────────────
  describe('Create', () => {
    it('opens grade-item-form-modal when 建立成績項目 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: /建立成績項目/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Open Grade Item Form Modal for Create' })
      );
      expect(store.get('/modals/grade-item-form-modal')).toBe(true);
    });

    it('form modal contains all input fields when open', async () => {
      store.set('/modals/grade-item-form-modal', true);
      renderPage();

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(await screen.findByLabelText(/^項目名稱/)).toBeInTheDocument();
      expect(await screen.findByText(/^項目類型/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/^日期/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/^說明/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/^滿分/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/^權重/)).toBeInTheDocument();
    });

    it('calls executeBehavior with "Create a new GradeItem" on 儲存', async () => {
      const user = userEvent.setup();
      renderPage();

      // Open modal first by clicking the button, triggering the reactive effect
      await user.click(await screen.findByRole('button', { name: /建立成績項目/i }));

      // Wait for the dialog to fully render, ensuring all mounting effects are complete
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      // Now seed the inputs safely
      act(() => {
        store.set('/form/modal-item-name-field', '期末考');
        store.set('/form/modal-item-type-selection', '考試');
        store.set('/form/modal-max-score-field', 100);
        store.set('/form/modal-weight-field', 40);
      });

      await user.click(await screen.findByRole('button', { name: /儲存/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Create a new GradeItem' })
      );

      // Programmatically locate and await the behavior promise so it finishes execution before test teardown
      const addCallIdx = executeBehavior.mock.calls.findIndex(
        (call) => call[0]?.ref === 'Create a new GradeItem'
      );
      if (addCallIdx !== -1) {
        await executeBehavior.mock.results[addCallIdx].value;
      }
    });

    it('successfully adds grade item via Create a new GradeItem behavior', async () => {
      store.set('/modals/grade-item-form-modal', true);
      store.set('/form/modal-item-name-field', '作業一');
      store.set('/form/modal-item-type-selection', '作業');
      store.set('/form/modal-max-score-field', 100);
      store.set('/form/modal-weight-field', 10);

      const result = await executeRegisteredBehavior('Create a new GradeItem', store);
      expect(result).toBe('成績項目已建立');
      expect(mockGradeItems).toContainEqual(
        expect.objectContaining({ itemName: '作業一', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.1 })
      );
      expect(store.get('/modals/grade-item-form-modal')).toBe(false);
    });
  });

  // ── Update: 編輯成績項目 ────────────────────────────────────────────────────
  describe('Update', () => {
    it('opens grade-item-form-modal and populates fields when 編輯 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('期中考');
      await user.click(screen.getByRole('button', { name: /編輯/i }));

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'grade-item-form-modal' })
      );
      expect(store.get('/modals/grade-item-form-modal')).toBe(true);

      // Verify that the page-level effect has reactive synchronized values loaded
      await waitFor(() => {
        expect(store.get('/form/modal-item-name-field')).toBe('期中考');
        expect(store.get('/form/modal-item-type-selection')).toBe('作業');
        expect(store.get('/form/modal-max-score-field')).toBe(100);
        expect(store.get('/form/modal-weight-field')).toBe(30);
      });
    });

    it('successfully updates grade item details via behavior', async () => {
      store.set('/selected/gradeItemId', '1');
      store.set('/modals/grade-item-form-modal', true);
      store.set('/form/modal-item-name-field', '期中大考');
      store.set('/form/modal-item-type-selection', '考試');
      store.set('/form/modal-max-score-field', 120);
      store.set('/form/modal-weight-field', 35);

      const result = await executeRegisteredBehavior('Create a new GradeItem', store);
      expect(result).toBe('成績項目已更新');
      expect(mockGradeItems.find(gi => gi.id === '1')).toEqual(
        expect.objectContaining({ itemName: '期中大考', itemType: 'EXAM', maxScore: 120, weight: 0.35 })
      );
    });
  });

  // ── Delete: 刪除成績項目 ────────────────────────────────────────────────────
  describe('Delete', () => {
    it('opens delete-grade-item-confirm-dialog when 刪除 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('期中考');
      await user.click(screen.getByRole('button', { name: /刪除/i }));

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'delete-grade-item-confirm-dialog' })
      );
      expect(store.get('/modals/delete-grade-item-confirm-dialog')).toBe(true);
    });

    it('closes delete-grade-item-confirm-dialog when 取消 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-grade-item-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /取消/i }));

      await waitFor(() => {
        expect(store.get('/modals/delete-grade-item-confirm-dialog')).toBe(false);
      });
    });

    it('throws validation error when delete keyword does not match item name', async () => {
      store.set('/selected/gradeItemId', '1');
      store.set('/data/listGradeItems', [
        { id: '1', name: '期中考' }
      ]);
      store.set('/modals/delete-grade-item-confirm-dialog', true);
      store.set('/form/delete-grade-item-keyword-input', '不相符的名字');

      await expect(
        executeRegisteredBehavior('Delete a GradeItem', store)
      ).rejects.toThrow('輸入的項目名稱不相符，無法刪除');

      expect(store.get('/modals/delete-grade-item-confirm-dialog')).toBe(true);
    });

    it('successfully deletes grade item when confirmation matches name', async () => {
      store.set('/selected/gradeItemId', '1');
      store.set('/data/listGradeItems', [
        { id: '1', name: '期中考' }
      ]);
      store.set('/modals/delete-grade-item-confirm-dialog', true);
      store.set('/form/delete-grade-item-keyword-input', '期中考');

      const result = await executeRegisteredBehavior('Delete a GradeItem', store);
      expect(result).toBe('成績項目已刪除');
      expect(mockGradeItems.some(gi => gi.id === '1')).toBe(false);
      expect(store.get('/modals/delete-grade-item-confirm-dialog')).toBe(false);
    });
  });

  // ── Filter: 篩選成績項目 ────────────────────────────────────────────────────
  describe('Filter', () => {
    it('applies type and date filters successfully via behavior', async () => {
      renderPage();

      act(() => {
        store.set('/form/item-type-filter', '作業');
        store.set('/form/item-date-filter', '2026-11-01');
      });

      await executeRegisteredBehavior('Apply Grade Item Filters', store);

      expect(store.get('/selected/filterType')).toBe('作業');
      expect(store.get('/selected/filterDate')).toBe('2026-11-01');

      // Verify that list shows the matching item
      await waitFor(() => {
        const list = store.get('/data/listGradeItems') as any[];
        expect(list).toHaveLength(1);
        expect(list[0].name).toBe('期中考');
      });
    });

    it('filters out items that do not match type or date', async () => {
      renderPage();

      act(() => {
        store.set('/form/item-type-filter', '出席'); // Does not match "作業"
      });

      await executeRegisteredBehavior('Apply Grade Item Filters', store);

      await waitFor(() => {
        const list = store.get('/data/listGradeItems') as any[];
        expect(list).toHaveLength(0);
      });
    });

    it('clears active filters successfully via clear behavior', async () => {
      store.set('/selected/filterType', '作業');
      store.set('/selected/filterDate', '2026-11-01');
      store.set('/form/item-type-filter', '作業');
      store.set('/form/item-date-filter', '2026-11-01');

      renderPage();

      await executeRegisteredBehavior('Clear Grade Item Filters', store);

      expect(store.get('/selected/filterType')).toBe('');
      expect(store.get('/selected/filterDate')).toBe('');
      expect(store.get('/form/item-type-filter')).toBe('');
      expect(store.get('/form/item-date-filter')).toBe('');
    });
  });
});
