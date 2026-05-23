import React, { useState, useEffect } from 'react';
import { useStateStore, useStateValue } from '@json-render/react';
import { WeightInlineInput } from './weight-inline-input';
import { executeRegisteredBehavior } from '@/behaviors/registry';
import { toast } from 'sonner';
import type { ComponentType } from 'react';

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

export const DataTable: ComponentType<any> = ({ element, children, bindings }: any) => {
  let store: any;
  try {
    store = useStateStore();
  } catch (e) {
    store = null;
  }

  const { columns, data: rawData, label } = element?.props || {};
  
  // Resolve data reactively using useStateValue
  let bindPath = '';
  const dataProp = bindings?.data ?? rawData;
  if (typeof dataProp === 'string' && dataProp.startsWith('/')) {
    bindPath = dataProp;
  } else if (dataProp && typeof dataProp === 'object' && '$bindState' in dataProp) {
    bindPath = dataProp.$bindState;
  }

  const isWeightTable = element?.props?.id === 'weight-editor-table';
  const isGradeMatrixTable = element?.props?.id === 'grade-matrix-table';

  // ────────────────────────────────────────────────────────────────────────────────
  // Custom 2D Grade matrix structure
  // ────────────────────────────────────────────────────────────────────────────────
  if (isGradeMatrixTable) {
    const students = (useStateValue('/data/listStudents') || []) as any[];
    const gradeItems = (useStateValue('/data/listGradeItems') || []) as any[];
    const gradeRecords = (useStateValue('/data/listGradeRecords') || []) as any[];
    const attachments = (useStateValue('/data/allAttachments') || useStateValue('/data/listAttachments') || []) as any[];

    const handleScoreInputBlur = async (studentId: string, itemId: string, newScore: number | null) => {
      if (store) {
        const record = gradeRecords.find(
          (r: any) => String(r.studentId) === String(studentId) && String(r.gradeItemId) === String(itemId)
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
          (r: any) => String(r.studentId) === String(studentId) && String(r.gradeItemId) === String(itemId)
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
          (r: any) => String(r.studentId) === String(studentId) && String(r.gradeItemId) === String(itemId)
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
            (r: any) => String(r.studentId) === String(studentId) && String(r.gradeItemId) === String(itemId)
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
                  const frontendType = gi.type || gi.itemType || '其他';
                  return (
                    <th key={gi.id} className="px-6 py-4 border-r border-slate-800/40 min-w-[220px]">
                      <div className="flex flex-col space-y-0.5">
                        <span className="text-slate-200 font-semibold text-sm">{gi.itemName || gi.name}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            {frontendType}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            (滿分: {gi.maxScore})
                          </span>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
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
                        (r: any) => String(r.studentId) === String(st.id) && String(r.gradeItemId) === String(gi.id)
                      );
                      const scoreVal = record?.score ?? null;

                      const itemType = gi.itemType || gi.type || 'OTHER';
                      const isAttendance = itemType === 'ATTENDANCE' || itemType === '出席';
                      const isAttachment = itemType === 'ASSIGNMENT' || itemType === 'REPORT' || itemType === '作業' || itemType === '報告';
                      const isClassroomPerformance = itemType === 'CLASSROOM_PERFORMANCE' || itemType === '課堂表現';

                      const recordAttachments = record ? attachments.filter((a: any) => String(a.gradeRecordId) === String(record.id)) : [];

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
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Standard list / weight table rendering
  // ────────────────────────────────────────────────────────────────────────────────
  const boundData = useStateValue(isWeightTable ? '/data/listGradeItems' : (bindPath || '/__dummy__'));
  const data = isWeightTable ? boundData : (bindPath ? boundData : dataProp);
  const rows: any[] = Array.isArray(data) ? data : [];

  const handleWeightChange = (rowId: string, newVal: number) => {
    if (store) {
      const currentList = store.get('/data/listGradeItems') || [];
      const updatedList = currentList.map((item: any) => {
        if (item.id === rowId) {
          return { ...item, weight: newVal };
        }
        return item;
      });
      store.set('/data/listGradeItems', updatedList);
    }
  };

  return (
    <div className="bg-[#0d1321]/80 backdrop-blur-sm border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
      <table className="w-full text-left border-collapse text-slate-300 text-sm" aria-label={label}>
        <thead className="bg-slate-900/50 text-slate-400 font-medium border-b border-slate-800/80">
          <tr>
            {columns?.map((col: any) => (
              <th key={col.field} className="px-6 py-4">{col.label}</th>
            ))}
            {isWeightTable && <th className="px-6 py-4 text-right">權重 (%)</th>}
            {!isWeightTable && React.Children.count(children) > 0 && <th className="px-6 py-4 text-right">操作</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={(columns?.length || 0) + ((React.Children.count(children) > 0 || isWeightTable) ? 1 : 0)}
                className="px-6 py-8 text-center text-slate-500 font-medium"
              >
                (沒有資料)
              </td>
            </tr>
          ) : (
            rows.map((row: any, idx: number) => (
              <tr key={row.id || idx} className="border-b border-slate-800/40 hover:bg-slate-900/30 transition-colors">
                {columns?.map((col: any) => (
                  <td key={col.field} className="px-6 py-4">{String(row[col.field] ?? '')}</td>
                ))}
                {isWeightTable && (
                  <td className="px-6 py-4 text-right">
                    <WeightInlineInput
                      rowId={row.id}
                      value={row.weight ?? 0}
                      onChange={(newVal) => handleWeightChange(row.id, newVal)}
                    />
                  </td>
                )}
                {!isWeightTable && React.Children.count(children) > 0 && (
                  <td className="px-6 py-4 text-right space-x-2">
                    {React.Children.map(children, (child) => {
                      if (!React.isValidElement(child)) return child;
                      return (
                        <div
                          className="inline-block"
                          onClickCapture={() => {
                            if (store && row?.id) {
                              const tableId = element?.props?.id || '';
                              const dataRef = element?.props?.dataRef || '';
                              let entity = '';
                              if (dataRef && dataRef.startsWith('list')) {
                                const raw = dataRef.slice(4);
                                const base = raw.endsWith('es') ? raw.slice(0, -2) : raw.endsWith('s') ? raw.slice(0, -1) : raw;
                                entity = base.charAt(0).toLowerCase() + base.slice(1);
                              } else if (tableId) {
                                entity = tableId.replace('-table', '').replace('-list', '');
                              }
                              if (entity) {
                                store.set(`/selected/${entity}Id`, row.id);
                              }
                            }
                          }}
                        >
                          {child}
                        </div>
                      );
                    })}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

