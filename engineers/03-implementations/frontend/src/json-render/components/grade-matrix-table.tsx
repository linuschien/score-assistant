import React, { useState, useEffect } from 'react';
import { useStateStore, useStateValue } from '@json-render/react';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { toast } from 'sonner';
import type { ComponentType } from 'react';
import { shadcnComponents } from '@json-render/shadcn';
import { TYPE_TO_FRONTEND } from '@/lib/constants';

const Spinner = shadcnComponents.Spinner;

// ────────────────────────────────────────────────────────────────────────────────
// ScoreInlineInput: controlled input to prevent cursor jump, supports validation
// ────────────────────────────────────────────────────────────────────────────────
const ScoreInlineInput = ({ rowId, itemId, value, maxScore, isClassroomPerformance, onChange }: any) => {
  const [localVal, setLocalVal] = useState(value !== null && value !== undefined ? String(value) : '');

  useEffect(() => {
    setLocalVal(value !== null && value !== undefined ? String(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
  };

  const handleBlur = () => {
    if (localVal === '') {
      onChange(null);
      return;
    }
    const parsed = parseFloat(localVal);
    if (isNaN(parsed)) {
      onChange(null);
      return;
    }

    // Classroom performance allows negative scores. Others do not.
    if (!isClassroomPerformance && parsed < 0) {
      alert('除課堂表現外，分數不得低於 0');
      setLocalVal(value !== null && value !== undefined ? String(value) : '');
      return;
    }

    // Check max score limit
    if (parsed > maxScore) {
      alert(`分數不得超過該項目的滿分 (${maxScore})`);
      setLocalVal(value !== null && value !== undefined ? String(value) : '');
      return;
    }

    onChange(parsed);
  };

  const isNegative = (Number(localVal) || 0) < 0;

  return (
    <input
      type="number"
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary [color-scheme:dark] ${
        isNegative && isClassroomPerformance ? 'text-red-500 font-bold border-red-900/60' : 'text-slate-200'
      }`}
      placeholder="N/A"
      step="any"
      data-testid={`score-input-${rowId}-${itemId}`}
    />
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// AttendanceCellSelect: maps selected status string to numeric scores
// ────────────────────────────────────────────────────────────────────────────────
const AttendanceCellSelect = ({ rowId, itemId, value, onChange }: any) => {
  const getOptionFromScore = (score: number | null) => {
    if (score === 1.0) return '出席';
    if (score === 0.0) return '缺席';
    if (score === 0.5) return '請假';
    return '—';
  };

  const [localStatus, setLocalStatus] = useState(() => getOptionFromScore(value));

  useEffect(() => {
    setLocalStatus(getOptionFromScore(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLocalStatus(val);
    onChange(val);
  };

  return (
    <select
      value={localStatus}
      onChange={handleChange}
      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary [color-scheme:dark] cursor-pointer"
      data-testid={`attendance-select-${rowId}-${itemId}`}
    >
      <option value="—">—</option>
      <option value="出席">出席</option>
      <option value="缺席">缺席</option>
      <option value="請假">請假</option>
      <option value="遲到">遲到</option>
    </select>
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// GradeMatrixTable Component
// ────────────────────────────────────────────────────────────────────────────────
export const GradeMatrixTable: ComponentType<any> = ({ element, emit, on }: any) => {
  let store: any;
  try {
    store = useStateStore();
  } catch (e) {
    store = null;
  }

  const { label } = element?.props || {};

  const students = (useStateValue('/data/listStudents') || []) as any[];
  const gradeItems = (useStateValue('/data/listGradeItems') || []) as any[];
  const gradeRecords = (useStateValue('/data/listGradeRecords') || []) as any[];
  const attachments = (useStateValue('/data/allAttachments') || useStateValue('/data/listAttachments') || []) as any[];

  const isStudentsLoading = useStateValue('/loading/listStudents') === true;
  const isGradeItemsLoading = useStateValue('/loading/listGradeItems') === true;
  const isGradeRecordsLoading = useStateValue('/loading/listGradeRecords') === true;
  const isMatrixLoading = isStudentsLoading || isGradeItemsLoading || isGradeRecordsLoading;

  const handleScoreInputBlur = async (studentId: string, itemId: string, newScore: number | null) => {
    if (store) {
      const record = gradeRecords.find(
        (r: any) => String(r.studentId).toLowerCase() === String(studentId).toLowerCase() && String(r.gradeItemId).toLowerCase() === String(itemId).toLowerCase()
      );

      store.set('/form/activeStudentId', studentId);
      store.set('/form/activeGradeItemId', itemId);
      store.set('/form/activeScore', newScore);
      store.set('/form/activeRecordId', record?.id || null);

      const loadingId = toast.loading('正在儲存成績…');
      try {
        const msg = await executeRegisteredBehavior('Update an existing GradeRecord', store);
        toast.dismiss(loadingId);
        if (msg) toast.success(msg);
      } catch (err: any) {
        toast.dismiss(loadingId);
        toast.error(err?.message || '儲存失敗，請稍後再試');
      }
    }
  };

  const handleAttendanceChange = async (studentId: string, itemId: string, status: string) => {
    if (store) {
      const record = gradeRecords.find(
        (r: any) => String(r.studentId).toLowerCase() === String(studentId).toLowerCase() && String(r.gradeItemId).toLowerCase() === String(itemId).toLowerCase()
      );

      let mappedScore = null;
      let attendanceStatus = '';
      if (status === '出席') {
        mappedScore = 1.0;
        attendanceStatus = 'PRESENT';
      } else if (status === '缺席') {
        mappedScore = 0.0;
        attendanceStatus = 'ABSENT';
      } else if (status === '請假' || status === '遲到') {
        mappedScore = 0.5;
        attendanceStatus = 'EXCUSED';
      }

      store.set('/form/activeStudentId', studentId);
      store.set('/form/activeGradeItemId', itemId);
      store.set('/form/activeScore', mappedScore);
      store.set('/form/activeAttendanceStatus', attendanceStatus);
      store.set('/form/activeRecordId', record?.id || null);

      const loadingId = toast.loading('正在登記出缺席…');
      try {
        const msg = await executeRegisteredBehavior('Record Attendance with automatic status-to-score mapping', store);
        toast.dismiss(loadingId);
        if (msg) toast.success(msg);
      } catch (err: any) {
        toast.dismiss(loadingId);
        toast.error(err?.message || '登記失敗，請稍後再試');
      }
    }
  };

  const handleOpenAttachmentOverlay = async (studentId: string, itemId: string) => {
    if (store) {
      let record = gradeRecords.find(
        (r: any) => String(r.studentId).toLowerCase() === String(studentId).toLowerCase() && String(r.gradeItemId).toLowerCase() === String(itemId).toLowerCase()
      );

      if (!record) {
        store.set('/form/activeStudentId', studentId);
        store.set('/form/activeGradeItemId', itemId);
        store.set('/form/activeScore', 0);
        store.set('/form/activeRecordId', null);

        const loadingId = toast.loading('正在初始化成績紀錄…');
        try {
          await executeRegisteredBehavior('Update an existing GradeRecord', store);
          toast.dismiss(loadingId);
        } catch (err: any) {
          toast.dismiss(loadingId);
          toast.error(err?.message || '初始化成績紀錄失敗');
          return;
        }
        
        const updatedRecords = store.get('/data/listGradeRecords') || [];
        record = updatedRecords.find(
          (r: any) => String(r.studentId).toLowerCase() === String(studentId).toLowerCase() && String(r.gradeItemId).toLowerCase() === String(itemId).toLowerCase()
        );
      }

      if (record?.id) {
        store.set('/selected/gradeRecordId', record.id);
        store.set('/selected/studentId', studentId);
        store.set('/selected/gradeItemId', itemId);
        store.set('/modals/attachment-overlay', true);
      } else {
        toast.error('無法取得成績紀錄，請稍後再試');
      }
    }
  };

  return (
    <div className="bg-[#0d1321]/80 backdrop-blur-sm border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse text-slate-350 text-sm" aria-label={label}>
          <thead className="bg-[#090e18] text-slate-400 font-medium border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 sticky left-0 bg-[#090e18] z-20 border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">座號</th>
              <th className="px-6 py-4 sticky left-16 bg-[#090e18] z-20 border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.3)] min-w-[100px]">姓名</th>
              {gradeItems.map((gi: any) => {
                const rawType = gi.type || gi.itemType || 'OTHER';
                const frontendType = TYPE_TO_FRONTEND[rawType] || rawType;
                const weightPercent = gi.weight !== undefined && gi.weight !== null ? Math.round(gi.weight * 100) : 0;
                return (
                  <th key={gi.id} className="px-6 py-4 border-r border-slate-800/40 min-w-[220px]">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-slate-200 font-semibold text-sm">{gi.itemName || gi.name}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                          {frontendType}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          (滿分: {gi.maxScore} / 權重: {weightPercent}%)
                        </span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isMatrixLoading && students.length === 0 ? (
              <tr>
                <td colSpan={gradeItems.length + 2} className="px-6 py-12 text-center text-slate-500 font-medium">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Spinner
                      props={{ size: 'md', label: '正在載入成績板...' }}
                      emit={emit}
                      on={on}
                    />
                  </div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={gradeItems.length + 2} className="px-6 py-8 text-center text-slate-500 font-medium">
                  (沒有學生資料)
                </td>
              </tr>
            ) : (
              students.map((st: any) => (
                <tr key={st.id} className="border-b border-slate-800/40 hover:bg-slate-900/10 transition-colors">
                  <td className="px-6 py-4 sticky left-0 bg-[#070b13] font-medium border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    {st.studentNumber}
                  </td>
                  <td className="px-6 py-4 sticky left-16 bg-[#070b13] font-medium border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    {st.studentName}
                  </td>
                  {gradeItems.map((gi: any) => {
                    const record = gradeRecords.find(
                      (r: any) => String(r.studentId).toLowerCase() === String(st.id).toLowerCase() && String(r.gradeItemId).toLowerCase() === String(gi.id).toLowerCase()
                    );
                    const scoreVal = record?.score ?? null;

                    const itemType = gi.itemType || gi.type || 'OTHER';
                    const isAttendance = itemType === 'ATTENDANCE' || itemType === '出席';
                    const isAttachment = itemType === 'ASSIGNMENT' || itemType === 'REPORT' || itemType === '作業' || itemType === '報告';
                    const isClassroomPerformance = itemType === 'CLASSROOM_PERFORMANCE' || itemType === '課堂表現';

                    const recordAttachments = record ? attachments.filter((a: any) => String(a.gradeRecordId).toLowerCase() === String(record.id).toLowerCase()) : [];

                    return (
                      <td key={gi.id} className="px-6 py-4 border-r border-slate-800/40">
                        <div className="flex items-center space-x-2.5">
                          {isAttendance ? (
                            <AttendanceCellSelect
                              rowId={st.id}
                              itemId={gi.id}
                              value={scoreVal}
                              onChange={(val: string) => handleAttendanceChange(st.id, gi.id, val)}
                            />
                          ) : (
                            <ScoreInlineInput
                              rowId={st.id}
                              itemId={gi.id}
                              value={scoreVal}
                              maxScore={gi.maxScore}
                              isClassroomPerformance={isClassroomPerformance}
                              onChange={(val: number | null) => handleScoreInputBlur(st.id, gi.id, val)}
                            />
                          )}

                          {isAttachment && (
                            <button
                              type="button"
                              onClick={() => handleOpenAttachmentOverlay(st.id, gi.id)}
                              className="inline-flex items-center space-x-1 text-slate-400 hover:text-primary transition-colors focus:outline-none p-1.5 hover:bg-slate-800/40 rounded-lg border border-transparent hover:border-slate-850"
                              title="管理附件"
                              data-testid={`attachment-btn-${st.id}-${gi.id}`}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                              </svg>
                              {recordAttachments.length > 0 && (
                                <span className="text-xs bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-full border border-primary/30">
                                  {recordAttachments.length}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
