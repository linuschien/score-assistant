import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect } from 'vitest';
import HomePage from './home.page';

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

describe('HomePage', () => {
  it('renders successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} handlers={testHandlers as any}>
          <HomePage />
        </JSONUIProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByText(/歡迎使用 Score Assistant/i)).toBeInTheDocument();
  });
});
