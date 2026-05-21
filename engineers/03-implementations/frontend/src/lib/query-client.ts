import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? false : 1,
    },
  },
});
