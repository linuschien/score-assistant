import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClassListPage from './class-list.page';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { resetMockClasses } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { graphql, HttpResponse } from 'msw';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CLASSES = [
  { id: '1', name: '資訊三甲', studentCount: 38 },
];

// ── Test Harness ──────────────────────────────────────────────────────────────

const store = createStateStore({ modals: {}, form: {}, data: {} });

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
        <ClassListPage />
      </JSONUIProvider>
    </QueryClientProvider>
  );
}

describe('ClassListPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
    store.set('/form', {});
    store.set('/data', {});
    store.set('/selected', { semesterId: '1' }); // Seed active semester context
    resetMockClasses();
    vi.clearAllMocks();
  });

  // ── Query: 表格顯示資料 ────────────────────────────────────────────────────
  describe('Query', () => {
    it('renders page heading', async () => {
      renderPage();
      expect(await screen.findByRole('heading', { name: /班級管理/i })).toBeInTheDocument();
    });

    it('renders class rows from store data', async () => {
      store.set('/data/listClasses', MOCK_CLASSES);
      renderPage();
      expect(await screen.findByText('資訊三甲')).toBeInTheDocument();
    });

    it('shows empty state when no data in store', async () => {
      server.use(
        graphql.query('listClasses', () => {
          return HttpResponse.json({
            data: {
              listClasses: [],
            },
          });
        })
      );

      renderPage();
      expect(await screen.findByText('(沒有資料)')).toBeInTheDocument();
    });
  });

  // ── Create: 建立班級 ────────────────────────────────────────────────────
  describe('Create', () => {
    it('opens class-form-modal when 建立班級 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: /建立班級/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Open Class Form Modal for Create' })
      );
      expect(store.get('/modals/class-form-modal')).toBe(true);
    });

    it('form modal contains name field when open', async () => {
      store.set('/modals/class-form-modal', true);
      renderPage();

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(await screen.findByLabelText(/班級名稱/i)).toBeInTheDocument();
      expect(await screen.findByLabelText(/通過門檻/i)).toBeInTheDocument();
    });

    it('calls executeBehavior with "Create a new Class in a Semester" on 儲存', async () => {
      const user = userEvent.setup();
      store.set('/modals/class-form-modal', true);
      renderPage();

      act(() => {
        store.set('/form/modal-class-name-field', '資訊三甲');
        store.set('/form/modal-class-threshold-field', 60.0);
      });

      await user.click(await screen.findByRole('button', { name: /儲存/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Create a new Class in a Semester' })
      );
    });

    it('closes form modal after 儲存 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/class-form-modal', true);
      renderPage();

      act(() => {
        store.set('/form/modal-class-name-field', '資訊三甲');
        store.set('/form/modal-class-threshold-field', 60.0);
      });

      await user.click(await screen.findByRole('button', { name: /儲存/i }));

      await waitFor(() => {
        expect(store.get('/modals/class-form-modal')).toBe(false);
      });
    });

    it('shows validation error when saving empty class name', async () => {
      store.set('/modals/class-form-modal', true);
      store.set('/form/modal-class-name-field', '');
      store.set('/form/modal-class-threshold-field', 60.0);
      renderPage();

      await expect(
        executeRegisteredBehavior('Create a new Class in a Semester', store)
      ).rejects.toThrow(/請修正以下欄位/);

      expect(store.get('/modals/class-form-modal')).toBe(true);
    });
  });

  // ── Update: 編輯班級 ────────────────────────────────────────────────────
  describe('Update', () => {
    it('opens class-form-modal when 編輯 row button is clicked', async () => {
      store.set('/data/listClasses', MOCK_CLASSES);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('資訊三甲');
      await user.click(screen.getByRole('button', { name: /編輯/i }));

      expect(openModal).toHaveBeenCalledWith(expect.objectContaining({ id: 'class-form-modal' }));
      expect(store.get('/modals/class-form-modal')).toBe(true);
      
      // Wait for page-level dynamic observer to run form sync:
      await waitFor(() => {
        expect(store.get('/form/modal-class-name-field')).toBe('資訊三甲');
      });
    });
  });

  // ── Delete: 刪除班級 ────────────────────────────────────────────────────
  describe('Delete', () => {
    it('opens delete-class-confirm-dialog when 刪除 row button is clicked', async () => {
      store.set('/data/listClasses', MOCK_CLASSES);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('資訊三甲');
      await user.click(screen.getByRole('button', { name: /刪除/i }));

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'delete-class-confirm-dialog' })
      );
      expect(store.get('/modals/delete-class-confirm-dialog')).toBe(true);
    });

    it('calls executeBehavior with "Delete a Class" on 確認刪除', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-class-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /確認刪除/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Delete a Class' })
      );
    });

    it('closes confirm dialog after 確認刪除 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-class-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /確認刪除/i }));

      await waitFor(() => {
        expect(store.get('/modals/delete-class-confirm-dialog')).toBe(false);
      });
    });

    it('closes confirm dialog when 取消 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-class-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /取消/i }));

      await waitFor(() => {
        expect(store.get('/modals/delete-class-confirm-dialog')).toBe(false);
      });
    });
  });
});
