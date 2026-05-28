import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface WhoAmIResponse {
  email: string;
}

export const whoamiKeys = {
  all: ['whoami'] as const,
};

export function useWhoAmI() {
  return useQuery({
    queryKey: whoamiKeys.all,
    queryFn: () => api.get<WhoAmIResponse>('/api/whoami'),
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
    retry: false, // Do not retry on auth failures
  });
}
