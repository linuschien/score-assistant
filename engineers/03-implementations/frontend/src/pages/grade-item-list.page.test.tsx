import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect, beforeEach } from 'vitest';
import GradeItemListPage from './grade-item-list.page';

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

describe('GradeItemListPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
  });

  it('renders successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeItemListPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByRole('heading', { name: /成績項目管理/i })).toBeInTheDocument();
  });
  it('opens modal on click of 建立成績項目', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeItemListPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    const trigger = await screen.findByRole('button', { name: /建立成績項目/i });
    expect(trigger).toBeInTheDocument();
    
    fireEvent.click(trigger);
    
    expect(await screen.findByText(/建立 \/ 編輯成績項目/i)).toBeInTheDocument();
  });
});
