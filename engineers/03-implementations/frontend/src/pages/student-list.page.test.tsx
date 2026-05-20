import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect, beforeEach } from 'vitest';
import StudentListPage from './student-list.page';

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

describe('StudentListPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
  });

  it('renders successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <StudentListPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByText(/學生管理/i)).toBeInTheDocument();
  });
  it('opens modal on click of 新增學生', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <StudentListPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    const trigger = await screen.findByRole('button', { name: /新增學生/i });
    expect(trigger).toBeInTheDocument();
    
    fireEvent.click(trigger);
    
    expect(await screen.findByText(/新增 \/ 編輯學生/i)).toBeInTheDocument();
  });
});
