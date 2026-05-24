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

import { executeRegisteredBehavior } from '@/behaviors/registry';
import { queryClient } from '@/lib/query-client';

// Read initial selected state from sessionStorage to survive page refreshes
const getInitialSelected = () => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem('score_assistant_selected');
      return saved ? JSON.parse(saved) : {};
    }
  } catch (e) {
    console.error('Failed to parse selected state:', e);
  }
  return {};
};

const globalStore = createStateStore({
  modals: {},
  form: {},
  data: {},
  selected: getInitialSelected(),
});

// Subscribe to store changes to persist selected state
if (typeof sessionStorage !== 'undefined') {
  globalStore.subscribe(() => {
    try {
      const selected = globalStore.get('/selected');
      sessionStorage.setItem('score_assistant_selected', JSON.stringify(selected || {}));
    } catch (e) {
      console.error('Failed to save selected state to sessionStorage:', e);
    }
  });
}

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

// Maps behavior refs to REST API actions + toast feedback
async function dispatchBehavior(ref: string, store: ReturnType<typeof createStateStore>) {
  const msg = await executeRegisteredBehavior(ref, store);
  if (msg !== null) return msg;

  console.log('[executeBehavior] unhandled ref:', ref);
  return null;
}

export default function App({ queryClient: customQueryClient }: AppProps) {
  const [activePage, setActivePage] = useState<PageKey>('home');
  const localQueryClient = customQueryClient || queryClient;

  const [systemTime, setSystemTime] = useState<string>(() => {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      const d = new Date();
      setSystemTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        const msg = err?.message || '操作失敗，請稍後再試';
        toast.error(<div className="whitespace-pre-line text-left">{msg}</div>);
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
                System Time: {systemTime}
              </span>
              <div className="flex items-center space-x-3 pl-6 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-200 leading-tight">Linus Chien</p>
                  <p className="text-[10px] text-slate-500">Superintendent Teacher</p>
                </div>
                <div className="relative">
                  <div
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md text-xl"
                    style={{ fontFamily: "'UnifrakturMaguntia', 'Cloister Black', 'Old English Text MT', serif" }}
                  >
                    L
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
