import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ImportStudentsRequest {
  [key: string]: unknown;
}

export function useImportStudents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportStudentsRequest) => {
      const id = payload.id;
      const url = id ? `/importstudentses` : '/importstudentses';
      return api.post<void>(url, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listImportStudentss'] });
    },
  });
}
