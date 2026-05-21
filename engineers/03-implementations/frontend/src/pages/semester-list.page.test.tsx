import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SemesterListPage from './semester-list.page';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SEMESTERS = [
  { id: '1', name: '112-1 第一學期', startDate: '2023-09-01', endDate: '2024-01-31', classCount: 3 },
];

// ── Test Harness ──────────────────────────────────────────────────────────────

const store = createStateStore({ modals: {}, form: {}, data: {} });
const executeBehavior = vi.fn();
const openModal = vi.fn((params: any) => {
  if (params?.id) store.set(`/modals/${params.id}`, true);
});
const navigate = vi.fn();
const testHandlers = { navigate, openModal, executeBehavior };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
        <SemesterListPage />
      </JSONUIProvider>
    </QueryClientProvider>
  );
}

describe('SemesterListPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
    store.set('/form', {});
    store.set('/data', {});
    vi.clearAllMocks();
  });

  // ── Query: 表格顯示資料 ────────────────────────────────────────────────────
  describe('Query', () => {
    it('renders page heading', async () => {
      renderPage();
      expect(await screen.findByRole('heading', { name: /學期列表/i })).toBeInTheDocument();
    });

    it('renders semester rows from store data', async () => {
      // DataTable reads from $bindState /data/listSemesters in the store
      store.set('/data/listSemesters', MOCK_SEMESTERS);
      renderPage();
      expect(await screen.findByText('112-1 第一學期')).toBeInTheDocument();
      expect(screen.getByText('2023-09-01')).toBeInTheDocument();
    });

    it('shows empty state when no data in store', async () => {
      renderPage();
      expect(await screen.findByText('(沒有資料)')).toBeInTheDocument();
    });
  });

  // ── Create: 建立學期 ────────────────────────────────────────────────────
  describe('Create', () => {
    it('opens semester-form-modal when 建立學期 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: /建立學期/i }));

      expect(openModal).toHaveBeenCalledWith(expect.objectContaining({ id: 'semester-form-modal' }));
      expect(store.get('/modals/semester-form-modal')).toBe(true);
    });

    it('form modal contains name, start date, end date fields when open', async () => {
      store.set('/modals/semester-form-modal', true);
      renderPage();

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(await screen.findByLabelText(/學期名稱/i)).toBeInTheDocument();
      expect(await screen.findByLabelText(/起始日期/i)).toBeInTheDocument();
      expect(await screen.findByLabelText(/結束日期/i)).toBeInTheDocument();
    });

    it('calls executeBehavior with "Create a new Semester" on 儲存', async () => {
      const user = userEvent.setup();
      store.set('/modals/semester-form-modal', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /儲存/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Create a new Semester' })
      );
    });

    it('closes form modal after 儲存 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/semester-form-modal', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /儲存/i }));

      await waitFor(() => {
        expect(store.get('/modals/semester-form-modal')).toBe(false);
      });
    });
  });

  // ── Update: 編輯學期 ────────────────────────────────────────────────────
  describe('Update', () => {
    it('opens semester-form-modal when 編輯 row button is clicked', async () => {
      // Populate store so DataTable renders the row with action buttons
      store.set('/data/listSemesters', MOCK_SEMESTERS);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('112-1 第一學期');
      await user.click(screen.getByRole('button', { name: /編輯/i }));

      expect(openModal).toHaveBeenCalledWith(expect.objectContaining({ id: 'semester-form-modal' }));
      expect(store.get('/modals/semester-form-modal')).toBe(true);
    });
  });

  // ── Delete: 刪除學期 ────────────────────────────────────────────────────
  describe('Delete', () => {
    it('opens delete-semester-confirm-dialog when 刪除 row button is clicked', async () => {
      store.set('/data/listSemesters', MOCK_SEMESTERS);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('112-1 第一學期');
      await user.click(screen.getByRole('button', { name: /刪除/i }));

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'delete-semester-confirm-dialog' })
      );
      expect(store.get('/modals/delete-semester-confirm-dialog')).toBe(true);
    });

    it('calls executeBehavior with "Delete a Semester" on 確認刪除', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-semester-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /確認刪除/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Delete a Semester' })
      );
    });

    it('closes confirm dialog after 確認刪除 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-semester-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /確認刪除/i }));

      await waitFor(() => {
        expect(store.get('/modals/delete-semester-confirm-dialog')).toBe(false);
      });
    });

    it('closes confirm dialog when 取消 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-semester-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /取消/i }));

      await waitFor(() => {
        expect(store.get('/modals/delete-semester-confirm-dialog')).toBe(false);
      });
    });
  });
});
