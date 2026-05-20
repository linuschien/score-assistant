import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect, beforeEach } from 'vitest';
import SemesterListPage from './semester-list.page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const store = createStateStore({ modals: {} });

const testHandlers = {
  navigate: () => {},
  openModal: (params: any) => {
    if (params?.id) {
      store.set(`/modals/${params.id}`, true);
    }
  },
  executeBehavior: () => {}
};

describe('SemesterListPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
  });

  it('renders successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <SemesterListPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByRole('heading', { name: /學期列表/i })).toBeInTheDocument();
  });
  it('opens modal on click of 建立學期', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <SemesterListPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    const trigger = await screen.findByRole('button', { name: /建立學期/i });
    expect(trigger).toBeInTheDocument();
    
    fireEvent.click(trigger);
    
    expect(await screen.findByText(/建立 \/ 編輯學期/i)).toBeInTheDocument();
  });
});
