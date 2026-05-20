import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect } from 'vitest';
import ScorePreviewDashboardPage from './score-preview-dashboard.page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const testHandlers = {
  navigate: () => {},
  openModal: (params: any, setGlobalState: any) => {
    if (params?.id) {
      setGlobalState((prev: any) => ({
        ...prev,
        modals: { ...(prev?.modals || {}), [params.id]: true }
      }));
    }
  },
  executeBehavior: () => {}
};

describe('ScorePreviewDashboardPage', () => {
  it('renders successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} handlers={testHandlers as any}>
          <ScorePreviewDashboardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByText(/成績總表預覽/i)).toBeInTheDocument();
  });
});
