import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AttendanceReviewTool } from '../attendance-review-tool';
import * as copilotkit from '@copilotkit/react-core/v2';
import * as jsonRender from '@json-render/react';
import { api } from '@/lib/api-client';

vi.mock('@/hooks/use-list-students', () => ({
  useListStudents: vi.fn().mockReturnValue({ data: [] }),
}));

// Mock dependencies
vi.mock('@copilotkit/react-core/v2', () => ({
  useHumanInTheLoop: vi.fn(),
}));

vi.mock('@json-render/react', () => ({
  useStateStore: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
  API_BASE: '/api/v1',
}));

describe('AttendanceReviewTool', () => {
  it('renders nothing when not executing', () => {
    (copilotkit.useHumanInTheLoop as any).mockImplementation((opts: any) => {
      // simulate status = complete
      return opts.render({ status: 'complete', args: {}, respond: vi.fn() });
    });
    const { container } = render(<AttendanceReviewTool />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the dialog and handles approve correctly', async () => {
    const mockRespond = vi.fn();
    const mockStore = { 
        get: vi.fn().mockImplementation((key) => {
            if (key === '/selected/classId') return 'mock-class-id';
            if (key === '/selected/semesterId') return 'mock-semester-id';
            return undefined;
        }),
        set: vi.fn()
    };
    (jsonRender.useStateStore as any).mockReturnValue(mockStore);

    let capturedRender: any;
    (copilotkit.useHumanInTheLoop as any).mockImplementation((opts: any) => {
      capturedRender = opts.render;
    });

    (api.post as any).mockResolvedValueOnce({ id: 'new-grade-item' }); // first post for grade item
    (api.post as any).mockResolvedValueOnce({}); // second post for batch

    render(<AttendanceReviewTool />);

    // Now render the UI captured by the hook as a React Component
    const CapturedComponent = capturedRender;
    const ui = <CapturedComponent 
        status="executing"
        args={{
          records: [
            { studentId: 'stu-1', name: 'Alice', status: 'PRESENT' },
            { studentId: 'stu-2', name: 'Bob', status: 'ABSENT' },
          ],
        }}
        respond={mockRespond}
    />;
    render(ui);

    // Check dialog renders
    expect(screen.getByText('確認出席紀錄')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Click Approve
    const approveBtn = screen.getByRole('button', { name: /確認並儲存/i });
    await userEvent.click(approveBtn);

    await waitFor(() => {
      console.log('API calls:', (api.post as any).mock.calls);
      expect(api.post).toHaveBeenCalledTimes(2);
      expect(api.post).toHaveBeenNthCalledWith(1, '/api/v1/semesters/mock-semester-id/classes/mock-class-id/grade-items', expect.any(Object));
      expect(api.post).toHaveBeenNthCalledWith(2, '/api/v1/grade-records:batchUpsert', [
        { gradeItemId: 'new-grade-item', studentId: 'stu-1', score: 100 },
        { gradeItemId: 'new-grade-item', studentId: 'stu-2', score: 0 },
      ]);
      expect(mockRespond).toHaveBeenCalledWith('Records saved successfully');
    });
  });
});
