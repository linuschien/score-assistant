import type { ComponentType } from 'react';
import { useState, useEffect } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import { z } from 'zod';
import { api, API_BASE } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';
import { useStateStore } from '@json-render/react';
import { useListStudents } from '@/hooks/use-list-students';

export const AttendanceReviewTool: ComponentType<any> = () => {
  const store = useStateStore();

  useHumanInTheLoop({
    name: 'askUserToReviewAttendance',
    description: 'Presents the extracted attendance records to the user for review. ALWAYS call this after extracting attendance from an image.',
    parameters: z.object({
      records: z.array(
        z.object({
          studentId: z.string(),
          name: z.string(),
          status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
        })
      ),
      gradeItemId: z.string().optional().describe('The UUID of the existing grade item to associate with. MUST examine the grade items context to find a match (e.g., matching date, or type ATTENDANCE). If the user did not specify, ask the user or guess the most appropriate existing one. ONLY omit this if a new grade item should be created.'),
    }),
    render: ({ status, args, respond }) => {
      if (status !== 'executing' || !respond) return null;

      const [localRecords, setLocalRecords] = useState(args.records || []);
      const [isSaving, setIsSaving] = useState(false);
      const [initialized, setInitialized] = useState(false);

      const classIdForQuery = store.get('/selected/classId') as string;
      const { data: studentsData } = useListStudents(classIdForQuery ? { classId: classIdForQuery } : undefined);

      useEffect(() => {
        if (!initialized && args.records && args.records.length > 0) {
          setLocalRecords(args.records);
          setInitialized(true);
        }
      }, [args.records, initialized]);

      const getStudentNumber = (id: string): string => {
        const student = studentsData?.find(s => String(s.id) === String(id));
        return student?.studentNumber ? String(student.studentNumber) : '-';
      };

      const handleStatusChange = (studentId: string, newStatus: string) => {
        setLocalRecords((prev) =>
          prev.map((r) => (r.studentId === studentId ? { ...r, status: newStatus as any } : r))
        );
      };

      const handleApprove = async () => {
        setIsSaving(true);
        try {
          const classId = store.get('/selected/classId') as string;
          const semesterId = store.get('/selected/semesterId') as string;
          let gradeItemId = args.gradeItemId;

          if (!classId || !semesterId) {
            respond('Error: classId or semesterId is not selected.');
            return;
          }

          if (!gradeItemId) {
            const newItem = (await api.post(`${API_BASE}/semesters/${semesterId}/classes/${classId}/grade-items`, {
              itemName: `出席紀錄 - ${new Date().toLocaleDateString()}`,
              itemType: 'ATTENDANCE',
              maxScore: 100,
              weight: 0,
            })) as any;
            gradeItemId = newItem.id;

            // Synchronously update the store so the new column renders immediately
            const currentItems = (store.get('/data/listGradeItems') || []) as any[];
            store.set('/data/listGradeItems', [...currentItems, newItem]);
          }

          const statusToScore: Record<string, number> = {
            PRESENT: 100,
            ABSENT: 0,
            LATE: 80,
            EXCUSED: 0,
          };

          const payload = localRecords.map((r) => ({
            gradeItemId: gradeItemId,
            studentId: r.studentId,
            score: statusToScore[r.status?.toUpperCase()] ?? 100,
          }));

          const upsertedRecords = (await api.post(`${API_BASE}/grade-records:batchUpsert`, payload)) as any[];

          // Synchronously update the store so the matrix cells render immediately
          if (Array.isArray(upsertedRecords)) {
            const currentList = (store.get('/data/listGradeRecords') || []) as any[];
            let nextList = [...currentList];
            upsertedRecords.forEach(newRec => {
              const idx = nextList.findIndex((r: any) => r.id === newRec.id);
              if (idx !== -1) {
                nextList[idx] = newRec;
              } else {
                nextList.push(newRec);
              }
            });
            store.set('/data/listGradeRecords', nextList);
          }

          // Invalidate queries to ensure TanStack cache stays consistent in background
          queryClient.invalidateQueries({ queryKey: ['listGradeRecords'] }).catch(console.error);
          queryClient.invalidateQueries({ queryKey: ['listGradeItems'] }).catch(console.error);
          
          respond('Records saved successfully');
        } catch (error) {
          console.error(error);
          respond('Failed to save records: ' + String(error));
        } finally {
          setIsSaving(false);
        }
      };

      return (
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl shadow-sm w-full flex flex-col my-2">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">確認出席紀錄</h3>
              <p className="text-sm text-slate-400">
                AI 已從圖片中擷取出以下學生的出席狀態，請確認。若有誤，可直接於下方修改。
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-md my-3">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">座號</th>
                    <th className="px-4 py-3 font-medium">學生姓名</th>
                    <th className="px-4 py-3 font-medium">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {localRecords.map((record) => (
                    <tr key={record.studentId} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3">{getStudentNumber(record.studentId)}</td>
                      <td className="px-4 py-3">{record.name}</td>
                      <td className="px-4 py-3">
                        <select
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                          value={record.status}
                          onChange={(e) => handleStatusChange(record.studentId, e.target.value)}
                        >
                          <option value="PRESENT">出席</option>
                          <option value="ABSENT">缺席</option>
                          <option value="LATE">遲到</option>
                          <option value="EXCUSED">病/事假</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {localRecords.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-slate-500">
                        未偵測到任何學生資料
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-transparent border border-slate-700 rounded hover:bg-slate-800 focus:outline-none"
                disabled={isSaving}
                onClick={() => respond('User cancelled the review.')}
              >
                取消
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none"
                disabled={isSaving}
                onClick={handleApprove}
              >
                {isSaving ? '儲存中...' : '確認並儲存'}
              </button>
            </div>
        </div>
      );
    },
  });

  return null;
}
