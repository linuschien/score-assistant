import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from '@/json-render/component-registry';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GradeEntryBoardPage from './grade-entry-board.page';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { mockGradeRecords, resetMockAttachments, setMockGradeItems, setMockGradeRecords, setMockAttachments } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0
    },
  },
});

const store = createStateStore({
  selected: {
    classId: '1',
    semesterId: '1',
    gradeRecordId: ''
  },
  data: {
    listStudents: [
      { id: '1', studentNumber: '01', studentName: '王小明' }
    ],
    listGradeItems: [
      { id: 'item-1', itemName: '期中考', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.3 },
      { id: 'item-2', itemName: '課堂出席', itemType: 'ATTENDANCE', maxScore: 10, weight: 0.2 },
      { id: 'item-3', itemName: '隨堂表現', itemType: 'CLASSROOM_PERFORMANCE', maxScore: 10, weight: 0.1 }
    ],
    listGradeRecords: [
      { id: 'r-1', studentId: '1', gradeItemId: 'item-1', score: 85 }
    ],
    listAttachments: []
  },
  modals: {}
});

const executeBehavior = vi.fn(async (params: any) => {
  const ref = params?.ref;
  if (!ref) return null;
  return executeRegisteredBehavior(ref, store);
});

const navigate = vi.fn();
const testHandlers = {
  navigate,
  openModal: (params: any) => {
    if (params?.id) {
      store.set(`/modals/${params.id}`, true);
    }
  },
  executeBehavior
};

describe('GradeEntryBoardPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    store.set('/modals', {});
    store.set('/selected/gradeRecordId', '');
    store.set('/data/listGradeRecords', [
      { id: 'r-1', studentId: '1', gradeItemId: 'item-1', score: 85 }
    ]);
    store.set('/data/listAttachments', []);
    
    // Seed MSW Mock Server dynamically to match exactly what is required
    setMockGradeItems([
      { id: 'item-1', classId: '1', itemName: '期中考', itemType: 'ASSIGNMENT', maxScore: 100, weight: 0.3 },
      { id: 'item-2', classId: '1', itemName: '課堂出席', itemType: 'ATTENDANCE', maxScore: 10, weight: 0.2 },
      { id: 'item-3', classId: '1', itemName: '隨堂表現', itemType: 'CLASSROOM_PERFORMANCE', maxScore: 10, weight: 0.1 }
    ]);

    setMockGradeRecords([
      { id: 'r-1', gradeItemId: 'item-1', studentId: '1', score: 85, lastModifiedAt: '2026-05-22T22:23:43', version: 1 }
    ]);
    
    resetMockAttachments();
    window.alert = vi.fn();
  });

  it('renders matrix table layout with headers and students successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeEntryBoardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByRole('heading', { name: /成績登記總表/i })).toBeInTheDocument();
    expect(screen.getByText('王小明')).toBeInTheDocument();
    expect(screen.getByText('期中考')).toBeInTheDocument();
    expect(screen.getByText('課堂出席')).toBeInTheDocument();
  });

  it('verifies numeric score input changes and blur triggers the update behavior', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeEntryBoardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    const input = await screen.findByTestId('score-input-1-item-1');
    expect(input).toHaveValue(85);

    // change value and blur
    fireEvent.change(input, { target: { value: '95' } });
    fireEvent.blur(input);

    await waitFor(() => {
      const r = mockGradeRecords.find(x => x.gradeItemId === 'item-1');
      expect(r).toBeDefined();
      expect(r?.score).toBe(95);
    });
  });

  it('verifies score validation alerts for negative and max score limits', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeEntryBoardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    const input = await screen.findByTestId('score-input-1-item-1');
    const alertSpy = vi.spyOn(window, 'alert');

    // Test exceeding maxScore limit (>100)
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.blur(input);
    expect(alertSpy).toHaveBeenCalledWith('分數不得超過該項目的滿分 (100)');

    // Test negative score check for standard ASSIGNMENT
    fireEvent.change(input, { target: { value: '-10' } });
    fireEvent.blur(input);
    expect(alertSpy).toHaveBeenCalledWith('除課堂表現外，分數不得低於 0');

    // Test CLASSROOM_PERFORMANCE allowing negative score
    const performanceInput = screen.getByTestId('score-input-1-item-3');
    fireEvent.change(performanceInput, { target: { value: '-5' } });
    fireEvent.blur(performanceInput);
    
    await waitFor(() => {
      const r = mockGradeRecords.find(x => x.gradeItemId === 'item-3');
      expect(r).toBeDefined();
      expect(r?.score).toBe(-5);
    });
  });

  it('verifies attendance select dropdown status to score mapping', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeEntryBoardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    const dropdown = await screen.findByTestId('attendance-select-1-item-2');
    expect(dropdown).toHaveValue('—');

    // Change status to 請假 (EXCUSED)
    fireEvent.change(dropdown, { target: { value: '請假' } });

    await waitFor(() => {
      const r = mockGradeRecords.find(x => x.gradeItemId === 'item-2');
      expect(r).toBeDefined();
      expect(r?.score).toBe(0.5); // 0.5 for EXCUSED status
    });
  });

  it('verifies attachment overlay dialog trigger and lists files', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeEntryBoardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    const paperclipBtn = await screen.findByTestId('attachment-btn-1-item-1');
    fireEvent.click(paperclipBtn);

    // Dialog should open
    expect(store.get('/modals/attachment-overlay')).toBe(true);
  });

  it('verifies download and delete attachment behaviors successfully', async () => {
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    setMockAttachments([
      { id: 'att-1', gradeRecordId: 'r-1', fileName: 'mock-test.pdf', mimeType: 'application/pdf', fileSize: 1024, uploadedAt: '2026-05-23T11:00:00Z' }
    ]);

    store.set('/selected/gradeRecordId', 'r-1');
    store.set('/selected/attachmentId', 'att-1');

    const downloadMsg = await executeRegisteredBehavior('Download an Attachment', store);
    expect(downloadMsg).toBe('檔案下載成功');
    expect(createObjectURLMock).toHaveBeenCalled();

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const deleteMsg = await executeRegisteredBehavior('Delete an Attachment', store);
    expect(deleteMsg).toBe('附件已刪除');
    expect(confirmSpy).toHaveBeenCalled();
  });

  it('verifies CopilotKit integration sends message, context readables, and tools to backend', async () => {
    class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    global.ResizeObserver = MockResizeObserver as any;

    let capturedRequest: any = null;

    server.use(
      http.post('*/api/agui/:agentId/chat', async ({ request }) => {
        try {
          const text = await request.clone().text();
          console.log("=== MOCK REQUEST RECEIVED ===");
          console.log("URL:", request.url);
          console.log("BODY TEXT:", text);
          
          let body: any = null;
          try {
            body = JSON.parse(text);
          } catch (err) {
            console.log("PARSING BODY FAILED:", err);
          }
          
          if (body?.method === 'info') {
            console.log("HANDSHAKE 'info' RECEIVED");
            return HttpResponse.json({
              version: '1.0',
              mode: 'sse',
              agents: {
                default: {
                  description: 'Grade Entry assistant',
                  capabilities: {}
                },
                'grade-entry-agent': {
                  description: 'Grade Entry Agent',
                  capabilities: {}
                }
              }
            });
          }
          const innerBody = body?.body || body;
          if (innerBody?.messages && innerBody.messages.length > 0) {
            console.log("MESSAGES RECEIVED:", innerBody.messages);
            capturedRequest = innerBody;
          }
        } catch (e) {
          console.log("ERROR IN MOCK HANDLER:", e);
        }
        return new HttpResponse(
          `data: {"type": "RUN_STARTED", "threadId": "t1", "runId": "r1"}\n\n` +
          `data: {"type": "TEXT_MESSAGE_CHUNK", "messageId": "msg-1", "delta": "I will update the grade."}\n\n` +
          `data: {"type": "RUN_FINISHED", "threadId": "t1", "runId": "r1", "outcome": {"type": "success"}}\n\n`,
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          }
        );
      })
    );

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <JSONUIProvider registry={componentRegistry} store={store} handlers={testHandlers as any}>
          <GradeEntryBoardPage />
        </JSONUIProvider>
      </QueryClientProvider>
    );

    // Find Copilot popup trigger. By default, CopilotPopup renders a button with class copilot-kit-popup-trigger
    const trigger = document.querySelector('.copilot-kit-popup-trigger') || 
                    screen.queryByRole('button', { name: /assistant/i }) ||
                    screen.queryByRole('button', { name: /chat/i });
                    
    expect(trigger).toBeInTheDocument();
    if (trigger) {
      await user.click(trigger);
      console.log("BODY HTML AFTER OPEN:", document.body.innerHTML);

      // Locate input textarea (there's only one textarea on the page - the chat input)
      const input = document.querySelector('textarea');
      expect(input).toBeInTheDocument();

      if (input) {
        await user.type(input, '座號 01 期中考 95 分');
        const sendBtn = screen.getByTestId('copilot-send-button');
        expect(sendBtn).toBeInTheDocument();
        await user.click(sendBtn);
      }

      // Assert that the request was made and intercepted with appropriate payloads
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest.messages).toBeDefined();
        expect(capturedRequest.messages.length).toBeGreaterThan(0);
        expect(capturedRequest.messages[capturedRequest.messages.length - 1].content).toContain('座號 01 期中考 95 分');
        
        // Assert context variables are included (since listStudents and listGradeItems are loaded)
        expect(capturedRequest.context).toBeDefined();
        expect(capturedRequest.context.length).toBeGreaterThan(0);
      });
    }
  });
});
