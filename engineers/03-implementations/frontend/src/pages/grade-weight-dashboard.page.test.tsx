import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect } from 'vitest';
import GradeWeightDashboardPage from './grade-weight-dashboard.page';

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

describe('GradeWeightDashboardPage', () => {
  it('renders successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} handlers={testHandlers as any}>
          <GradeWeightDashboardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByText(/成績項目權重管理/i)).toBeInTheDocument();
  });
});
