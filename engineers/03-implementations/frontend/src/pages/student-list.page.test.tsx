import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import StudentListPage from './student-list.page';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { server } from '@/mocks/server';
import { http, graphql, HttpResponse } from 'msw';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_STUDENTS_INITIAL = [
  { id: '1', classId: '1', studentId: 'S1120001', studentNumber: '01', studentName: '王小明', email: 'xiaoming@school.edu.tw' },
];

let mockStudents = [...MOCK_STUDENTS_INITIAL];

function setupMocks() {
  server.use(
    graphql.query('listStudents', ({ variables }) => {
      const filter = variables.filter as { classId?: string } | undefined;
      const filtered = filter?.classId
        ? mockStudents.filter((s) => s.classId === filter.classId)
        : mockStudents;
      return HttpResponse.json({
        data: {
          listStudents: filtered.map((s) => ({
            id: s.id,
            classId: s.classId,
            studentId: s.studentId,
            studentNumber: s.studentNumber,
            studentName: s.studentName,
            email: s.email,
          })),
        },
      });
    }),

    http.post('*/semesters/:semesterId/classes/:classId/students', async ({ request, params }) => {
      const body = (await request.json()) as any;
      if (!body.studentName || !body.studentName.trim()) {
        return HttpResponse.json(
          { error: 'Request validation failed: studentName: 不能為空白' },
          { status: 400 }
        );
      }
      if (!body.studentId || !body.studentId.trim()) {
        return HttpResponse.json(
          { error: 'Request validation failed: studentId: 不能為空白' },
          { status: 400 }
        );
      }
      const newStudent = {
        id: String(mockStudents.length + 1),
        classId: params.classId as string,
        studentId: body.studentId,
        studentNumber: body.studentNumber || '',
        studentName: body.studentName,
        email: body.email || '',
      };
      mockStudents.push(newStudent);
      return HttpResponse.json(newStudent, { status: 201 });
    }),

    http.put('*/semesters/:semesterId/classes/:classId/students/:studentId', async ({ request, params }) => {
      const body = (await request.json()) as any;
      if (!body.studentName || !body.studentName.trim()) {
        return HttpResponse.json(
          { error: 'Request validation failed: studentName: 不能為空白' },
          { status: 400 }
        );
      }
      const idx = mockStudents.findIndex((s) => s.id === params.studentId);
      if (idx !== -1) {
        mockStudents[idx] = {
          ...mockStudents[idx],
          studentId: body.studentId || mockStudents[idx].studentId,
          studentNumber: body.studentNumber || '',
          studentName: body.studentName,
          email: body.email || '',
        };
        return HttpResponse.json(mockStudents[idx]);
      }
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
    }),

    http.delete('*/semesters/:semesterId/classes/:classId/students/:studentId', ({ params }) => {
      mockStudents = mockStudents.filter((s) => s.id !== params.studentId);
      return HttpResponse.json({ success: true });
    }),

    http.post('*/semesters/:semesterId/classes/:classId/students:importStudents', async ({ params }) => {
      const newStudent = {
        id: String(mockStudents.length + 1),
        classId: params.classId as string,
        studentId: 'S1120002',
        studentNumber: '02',
        studentName: '李小美',
        email: 'xiaomei@school.edu.tw',
      };
      mockStudents.push(newStudent);
      return HttpResponse.json({ success: true });
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
        <StudentListPage />
      </JSONUIProvider>
    </QueryClientProvider>
  );
}

describe('StudentListPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
    store.set('/form', {});
    store.set('/data', {});
    store.set('/selected', { semesterId: '1', classId: '1' });
    mockStudents = [...MOCK_STUDENTS_INITIAL];
    setupMocks();
    vi.clearAllMocks();
  });

  // ── Query: 表格顯示資料 ────────────────────────────────────────────────────
  describe('Query', () => {
    it('renders page heading successfully', async () => {
      renderPage();
      expect(await screen.findByRole('heading', { name: /學生管理/i })).toBeInTheDocument();
    });

    it('renders student rows from synced listStudents data', async () => {
      renderPage();
      expect(await screen.findByText('S1120001')).toBeInTheDocument();
      expect(await screen.findByText('01')).toBeInTheDocument();
      expect(await screen.findByText('王小明')).toBeInTheDocument();
      expect(await screen.findByText('xiaoming@school.edu.tw')).toBeInTheDocument();
    });

    it('shows empty state when no students are present', async () => {
      mockStudents = [];
      renderPage();
      expect(await screen.findByText('(沒有資料)')).toBeInTheDocument();
    });
  });

  // ── Create: 新增學生 ────────────────────────────────────────────────────
  describe('Create', () => {
    it('opens student-form-modal when 新增學生 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: /新增學生/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Open Student Form Modal for Create' })
      );
      expect(store.get('/modals/student-form-modal')).toBe(true);
    });

    it('form modal contains number and name fields when open', async () => {
      store.set('/modals/student-form-modal', true);
      renderPage();

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(await screen.findByLabelText(/^學號/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/^座號/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/^姓名/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/^電子信箱/)).toBeInTheDocument();
    });

    it('calls executeBehavior with "Add a Student to a Class" on 儲存', async () => {
      const user = userEvent.setup();
      renderPage();

      // Open modal first by clicking the button, triggering the reactive effect
      await user.click(await screen.findByRole('button', { name: /新增學生/i }));

      // Wait for the dialog to fully render, ensuring all mounting effects are complete
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      // Now seed the name and number safely
      act(() => {
        store.set('/form/modal-student-id-field', 'S1120002');
        store.set('/form/modal-student-number-field', '02');
        store.set('/form/modal-student-name-field', '李小美');
        store.set('/form/modal-student-email-field', 'xiaomei@school.edu.tw');
      });

      await user.click(await screen.findByRole('button', { name: /儲存/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Add a Student to a Class' })
      );

      // Programmatically locate and await the behavior promise so it finishes execution before test teardown
      const addCallIdx = executeBehavior.mock.calls.findIndex(
        (call) => call[0]?.ref === 'Add a Student to a Class'
      );
      if (addCallIdx !== -1) {
        await executeBehavior.mock.results[addCallIdx].value;
      }
    });

    it('successfully adds student via Add a Student to a Class behavior', async () => {
      store.set('/modals/student-form-modal', true);
      store.set('/form/modal-student-id-field', 'S1120002');
      store.set('/form/modal-student-number-field', '02');
      store.set('/form/modal-student-name-field', '李小美');
      store.set('/form/modal-student-email-field', 'xiaomei@school.edu.tw');

      const result = await executeRegisteredBehavior('Add a Student to a Class', store);
      expect(result).toBe('學生已新增');
      expect(mockStudents).toContainEqual(
        expect.objectContaining({ studentId: 'S1120002', studentNumber: '02', studentName: '李小美', email: 'xiaomei@school.edu.tw' })
      );
      expect(store.get('/modals/student-form-modal')).toBe(false);
    });
  });

  // ── Update: 編輯學生 ────────────────────────────────────────────────────
  describe('Update', () => {
    it('opens student-form-modal and populates fields when 編輯 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('王小明');
      await user.click(screen.getByRole('button', { name: /編輯/i }));

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'student-form-modal' })
      );
      expect(store.get('/modals/student-form-modal')).toBe(true);

      // Verify that the page-level effect has reactive synchronized values loaded
      await waitFor(() => {
        expect(store.get('/form/modal-student-id-field')).toBe('S1120001');
        expect(store.get('/form/modal-student-number-field')).toBe('01');
        expect(store.get('/form/modal-student-name-field')).toBe('王小明');
        expect(store.get('/form/modal-student-email-field')).toBe('xiaoming@school.edu.tw');
      });
    });

    it('successfully updates student name and number via behavior', async () => {
      store.set('/selected/studentId', '1');
      store.set('/modals/student-form-modal', true);
      store.set('/form/modal-student-id-field', 'S1120001');
      store.set('/form/modal-student-number-field', '99');
      store.set('/form/modal-student-name-field', '王大明');
      store.set('/form/modal-student-email-field', 'xiaoming@school.edu.tw');

      const result = await executeRegisteredBehavior('Add a Student to a Class', store);
      expect(result).toBe('學生已更新');
      expect(mockStudents.find(s => s.id === '1')).toEqual(
        expect.objectContaining({ studentNumber: '99', studentName: '王大明' })
      );
    });
  });

  // ── Delete: 刪除學生 ────────────────────────────────────────────────────
  describe('Delete', () => {
    it('opens delete-student-confirm-dialog when 刪除 is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('王小明');
      await user.click(screen.getByRole('button', { name: /刪除/i }));

      expect(openModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'delete-student-confirm-dialog' })
      );
      expect(store.get('/modals/delete-student-confirm-dialog')).toBe(true);
    });

    it('closes delete-student-confirm-dialog when 取消 is clicked', async () => {
      const user = userEvent.setup();
      store.set('/modals/delete-student-confirm-dialog', true);
      renderPage();

      await user.click(await screen.findByRole('button', { name: /取消/i }));

      await waitFor(() => {
        expect(store.get('/modals/delete-student-confirm-dialog')).toBe(false);
      });
    });

    it('throws validation error when delete keyword does not match student name', async () => {
      store.set('/selected/studentId', '1');
      store.set('/data/listStudents', [
        { id: '1', studentId: 'S1120001', studentNumber: '01', studentName: '王小明', email: 'xiaoming@school.edu.tw' }
      ]);
      store.set('/modals/delete-student-confirm-dialog', true);
      store.set('/form/delete-student-keyword-input', '不相符的名字');

      await expect(
        executeRegisteredBehavior('Delete a Student', store)
      ).rejects.toThrow('輸入的學生姓名不相符，無法刪除');

      expect(store.get('/modals/delete-student-confirm-dialog')).toBe(true);
    });

    it('successfully deletes student when confirmation matches name', async () => {
      store.set('/selected/studentId', '1');
      store.set('/data/listStudents', [
        { id: '1', studentId: 'S1120001', studentNumber: '01', studentName: '王小明', email: 'xiaoming@school.edu.tw' }
      ]);
      store.set('/modals/delete-student-confirm-dialog', true);
      store.set('/form/delete-student-keyword-input', '王小明');

      const result = await executeRegisteredBehavior('Delete a Student', store);
      expect(result).toBe('學生已移除');
      expect(mockStudents.some(s => s.id === '1')).toBe(false);
      expect(store.get('/modals/delete-student-confirm-dialog')).toBe(false);
    });
  });

  // ── Import CSV: 匯入 CSV ─────────────────────────────────────────────────
  describe('Import CSV', () => {
    it('calls Import Students CSV behavior when 批次匯入 CSV is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: /批次匯入 CSV/i }));

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Import Students CSV' })
      );
    });

    it('successfully uploads and imports CSV data', async () => {
      const mockInput = {
        type: '',
        accept: '',
        click: vi.fn(),
        onchange: null as any
      };
      
      // Spy on document.createElement to intercept the file input instantiation
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);

      // Trigger the behavior execution promise
      const behaviorPromise = executeRegisteredBehavior('Import Students CSV', store);

      // Verify a file input was created and clicked
      expect(createElementSpy).toHaveBeenCalledWith('input');
      expect(mockInput.click).toHaveBeenCalled();

      // Fire the change event manually to simulate selecting a CSV file
      await act(async () => {
        const file = new File(['02,李小美'], 'students.csv', { type: 'text/csv' });
        await mockInput.onchange({
          target: {
            files: [file]
          }
        });
      });

      const result = await behaviorPromise;
      expect(result).toBe('學生資料匯入成功');
      expect(mockStudents).toContainEqual(
        expect.objectContaining({ studentId: 'S1120002', studentNumber: '02', studentName: '李小美', email: 'xiaomei@school.edu.tw' })
      );

      createElementSpy.mockRestore();
    });
  });

  // ── Search & Filter: 搜尋與篩選 ──────────────────────────────────────────
  describe('Search & Filter', () => {
    it('calls Filter Students List behavior when search button is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      const searchInput = await screen.findByLabelText(/搜尋座號或姓名/i);
      await user.type(searchInput, '王小明');
      
      const searchButton = await screen.findByRole('button', { name: /搜尋/i });
      await user.click(searchButton);

      expect(executeBehavior).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'Filter Students List' })
      );
    });

    it('filters student list by name or seat number', async () => {
      mockStudents = [
        { id: '1', classId: '1', studentId: 'S1120001', studentNumber: '01', studentName: '王小明', email: 'xiaoming@school.edu.tw' },
        { id: '2', classId: '1', studentId: 'S1120002', studentNumber: '02', studentName: '李小美', email: 'xiaomei@school.edu.tw' }
      ];

      renderPage();

      // Verify both are present originally
      expect(await screen.findByText('王小明')).toBeInTheDocument();
      expect(await screen.findByText('李小美')).toBeInTheDocument();

      // Perform filtering by setting keyword and executing the behavior
      act(() => {
        store.set('/form/student-search-field', '小美');
      });
      await act(async () => {
        await executeRegisteredBehavior('Filter Students List', store);
      });

      // Verify only '李小美' matches
      await waitFor(() => {
        expect(screen.queryByText('王小明')).not.toBeInTheDocument();
        expect(screen.getByText('李小美')).toBeInTheDocument();
      });

      // Clear search
      act(() => {
        store.set('/form/student-search-field', '');
      });
      await act(async () => {
        await executeRegisteredBehavior('Filter Students List', store);
      });

      // Verify both are restored
      await waitFor(() => {
        expect(screen.getByText('王小明')).toBeInTheDocument();
        expect(screen.getByText('李小美')).toBeInTheDocument();
      });
    });
  });
});
