import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { Activity } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Import all generated pages
import StudentListPage from '@/pages/student-list.page';
import HomePage from '@/pages/home.page';
import ScorePreviewDashboardPage from '@/pages/score-preview-dashboard.page';
import SemesterListPage from '@/pages/semester-list.page';
import GradeItemListPage from '@/pages/grade-item-list.page';
import GradeEntryBoardPage from '@/pages/grade-entry-board.page';
import GradeWeightDashboardPage from '@/pages/grade-weight-dashboard.page';
import ClassListPage from '@/pages/class-list.page';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? false : 1,
    },
  },
});

const globalStore = createStateStore({ modals: {}, form: {}, data: {} });

type PageKey =
  | 'student-list'
  | 'home'
  | 'score-preview-dashboard'
  | 'semester-list'
  | 'grade-item-list'
  | 'grade-entry-board'
  | 'grade-weight-dashboard'
  | 'class-list';

interface AppProps {
  queryClient?: QueryClient;
}

const API_BASE = '/api/v1';

// Maps behavior refs to REST API actions + toast feedback
async function dispatchBehavior(ref: string, store: ReturnType<typeof createStateStore>) {
  if (ref === 'Create a new Semester') {
    const selectedId = store.get('/selected/semesterId');
    if (selectedId) {
      return dispatchBehavior('Update a Semester', store);
    }

    const form = (store.get('/form') as Record<string, string>) || {};
    const res = await fetch(`${API_BASE}/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        semester_name: form['modal-semester-name-field'],
        start_date: form['modal-start-date-field'],
        end_date: form['modal-end-date-field'],
      }),
    });
    if (!res.ok) throw new Error(`建立失敗：${res.status}`);
    store.set('/form', {});
    store.set('/modals/semester-form-modal', false);
    queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
    return '學期已建立';
  }

  if (ref === 'Update a Semester') {
    const form = (store.get('/form') as Record<string, string>) || {};
    const id = store.get('/selected/semesterId') as string;
    const res = await fetch(`${API_BASE}/semesters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        semester_name: form['modal-semester-name-field'],
        start_date: form['modal-start-date-field'],
        end_date: form['modal-end-date-field'],
      }),
    });
    if (!res.ok) throw new Error(`更新失敗：${res.status}`);
    store.set('/form', {});
    store.set('/modals/semester-form-modal', false);
    queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
    return '學期已更新';
  }

  if (ref === 'Delete a Semester') {
    const id = store.get('/selected/semesterId') as string;
    const form = (store.get('/form') as Record<string, string>) || {};
    const inputKeyword = form['delete-semester-keyword-input'];

    const semesters = (store.get('/data/listSemesters') as any[]) || [];
    const semester = semesters.find((s) => s.id === id);
    if (semester && semester.name !== inputKeyword) {
      throw new Error('輸入的學期名稱不相符，無法刪除');
    }

    const res = await fetch(`${API_BASE}/semesters/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`刪除失敗：${res.status}`);
    store.set('/form', {});
    store.set('/modals/delete-semester-confirm-dialog', false);
    queryClient.invalidateQueries({ queryKey: ['listSemesters'] });
    return '學期已刪除';
  }

  console.log('[executeBehavior] unhandled ref:', ref);
  return null;
}

export default function App({ queryClient: customQueryClient }: AppProps) {
  const [activePage, setActivePage] = useState<PageKey>('home');
  const localQueryClient = customQueryClient || queryClient;

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setActivePage(hash as PageKey);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleExecuteBehavior = useCallback(
    async (params: any) => {
      const ref = params?.ref as string;
      if (!ref) return;
      const loadingId = toast.loading('執行中…');
      try {
        const msg = await dispatchBehavior(ref, globalStore);
        toast.dismiss(loadingId);
        if (msg) toast.success(msg);
      } catch (err: any) {
        toast.dismiss(loadingId);
        toast.error(err?.message || '操作失敗，請稍後再試');
      }
    },
    []
  );

  const renderActivePage = () => {
    switch (activePage) {
      case 'student-list':            return <StudentListPage />;
      case 'home':                    return <HomePage />;
      case 'score-preview-dashboard': return <ScorePreviewDashboardPage />;
      case 'semester-list':           return <SemesterListPage />;
      case 'grade-item-list':         return <GradeItemListPage />;
      case 'grade-entry-board':       return <GradeEntryBoardPage />;
      case 'grade-weight-dashboard':  return <GradeWeightDashboardPage />;
      case 'class-list':              return <ClassListPage />;
      default:                        return <HomePage />;
    }
  };

  return (
    <QueryClientProvider client={localQueryClient}>
      <JSONUIProvider
        registry={componentRegistry}
        store={globalStore}
        handlers={{
          navigate: (params: any) => {
            if (params?.to) window.location.hash = '#' + params.to.replace('-page', '');
          },
          openModal: (params: any) => {
            if (params?.id) {
              globalStore.set(`/modals/${params.id}`, true);
              if (params.id === 'semester-form-modal') {
                const selectedId = globalStore.get('/selected/semesterId');
                if (selectedId) {
                  const list = (globalStore.get('/data/listSemesters') as any[]) || [];
                  const found = list.find((s) => s.id === selectedId);
                  if (found) {
                    globalStore.set('/form/modal-semester-name-field', found.name);
                    globalStore.set('/form/modal-start-date-field', found.startDate);
                    globalStore.set('/form/modal-end-date-field', found.endDate);
                  }
                } else {
                  globalStore.set('/form/modal-semester-name-field', '');
                  globalStore.set('/form/modal-start-date-field', '');
                  globalStore.set('/form/modal-end-date-field', '');
                }
              }
            }
          },
          executeBehavior: handleExecuteBehavior,
        } as any}
      >
        {/* Sonner Toast — dark theme matching app palette */}
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'hsl(215 27.9% 16.9%)',
              border: '1px solid hsl(215 27.9% 25%)',
              color: 'hsl(210 20% 98%)',
            },
          }}
        />

        <div className="flex flex-col h-screen bg-[#080b11] text-slate-100 font-sans overflow-hidden">
          <header className="sticky top-0 z-40 bg-[#0d131f]/90 backdrop-blur-md border-b border-slate-800/60 px-6 sm:px-8 py-3 sm:py-4 flex justify-between items-center shrink-0">
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => { window.location.hash = '#home'; }}
            >
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-baseline space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  Score Assistant
                </h1>
                <p className="text-[10px] text-indigo-400 font-medium tracking-wide uppercase hidden sm:block">
                  Teacher Console
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <span className="text-xs text-slate-500 font-mono hidden md:inline-block">
                System Time: {new Date().toLocaleDateString('zh-TW')}
              </span>
              <div className="flex items-center space-x-3 pl-6 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-200 leading-tight">Linus Chien</p>
                  <p className="text-[10px] text-slate-500">Superintendent Teacher</p>
                </div>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md text-sm">
                    T
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0d131f]" />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#07090e] relative flex flex-col">
            <div className="flex-1">{renderActivePage()}</div>
          </main>
        </div>
      </JSONUIProvider>
    </QueryClientProvider>
  );
}
