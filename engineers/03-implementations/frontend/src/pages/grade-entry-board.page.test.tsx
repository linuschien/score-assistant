import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect, beforeEach } from 'vitest';
import GradeEntryBoardPage from './grade-entry-board.page';

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

describe('GradeEntryBoardPage', () => {
  beforeEach(() => {
    store.set('/modals', {});
  });

  it('renders successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeEntryBoardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByRole('heading', { name: /成績登記總表/i })).toBeInTheDocument();
  });
});
