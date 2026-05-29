import { useStateValue } from '@json-render/react';
import { shadcnComponents } from '@json-render/shadcn';
import { TYPE_TO_FRONTEND } from '@/lib/constants';

const Spinner = shadcnComponents.Spinner;

export const ScoreSummaryTable = (props: any) => {
  const label = props.element?.props?.label || '成績總表';
  const { emit, on } = props;

  const students = (useStateValue('/data/listStudents') || []) as any[];
  const gradeItems = (useStateValue('/data/listGradeItems') || []) as any[];
  const gradeRecords = (useStateValue('/data/listGradeRecords') || []) as any[];

  const isStudentsLoading = useStateValue('/loading/listStudents') === true;
  const isGradeItemsLoading = useStateValue('/loading/listGradeItems') === true;
  const isGradeRecordsLoading = useStateValue('/loading/listGradeRecords') === true;
  const isMatrixLoading = isStudentsLoading || isGradeItemsLoading || isGradeRecordsLoading;

  return (
    <div className="bg-[#0d1321]/80 backdrop-blur-sm border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse text-slate-300 text-sm" aria-label={label}>
          <thead className="bg-[#090e18] text-slate-400 font-medium border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 sticky left-0 bg-[#090e18] z-20 border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">座號</th>
              <th className="px-6 py-4 sticky left-16 bg-[#090e18] z-20 border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.3)] min-w-[100px]">姓名</th>
              {gradeItems.map((gi: any) => {
                const percent = Math.round((Number(gi.weight) || 0) * 100);
                const rawType = gi.itemType || gi.type || 'OTHER';
                const typeLabel = TYPE_TO_FRONTEND[rawType] || rawType;
                return (
                  <th key={gi.id} className="px-6 py-4 border-r border-slate-800/40 min-w-[150px]">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-slate-200 font-semibold text-sm">{gi.itemName || gi.name}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                          {typeLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          ({percent}%)
                        </span>
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="px-6 py-4 text-right font-bold text-slate-200 min-w-[120px]">加權總分</th>
            </tr>
          </thead>
          <tbody>
            {isMatrixLoading && students.length === 0 ? (
              <tr>
                <td colSpan={gradeItems.length + 3} className="px-6 py-12 text-center text-slate-500 font-medium">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Spinner
                      props={{ size: 'md', label: '正在載入成績總表...' }}
                      emit={emit}
                      on={on}
                    />
                  </div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={gradeItems.length + 3} className="px-6 py-8 text-center text-slate-500 font-medium">
                  (沒有資料)
                </td>
              </tr>
            ) : (
              students.map((st: any) => {
                let totalSum = 0;
                return (
                  <tr key={st.id} className="border-b border-slate-800/40 hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 sticky left-0 bg-[#070b13] font-medium border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                      {st.studentNumber}
                    </td>
                    <td className="px-6 py-4 sticky left-16 bg-[#070b13] font-medium border-r border-slate-800/60 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                      {st.studentName || st.name || st.student_name}
                    </td>
                    {gradeItems.map((gi: any) => {
                      const record = gradeRecords.find(
                        (r: any) => String(r.studentId) === String(st.id) && String(r.gradeItemId) === String(gi.id)
                      );
                      const scoreVal = record?.score ?? null;

                      // Sum contribution: Σ(score / maxScore * weight)
                      const scoreNum = scoreVal !== null ? Number(scoreVal) : 0;
                      const maxScore = Number(gi.maxScore) || 100;
                      const weight = Number(gi.weight) || 0;
                      totalSum += (scoreNum / maxScore) * weight;

                      // Display mapped value
                      let displayVal = '—';
                      if (scoreVal !== null) {
                        const itemType = gi.itemType || gi.type || 'OTHER';
                        if (itemType === 'ATTENDANCE') {
                          if (Math.abs(scoreNum - maxScore) < 0.0001) displayVal = '出席';
                          else if (Math.abs(scoreNum - maxScore * 0.5) < 0.0001) displayVal = '請假/遲到';
                          else if (scoreNum === 0) displayVal = '缺席';
                          else displayVal = String(scoreNum);
                        } else {
                          displayVal = String(scoreNum);
                        }
                      }

                      return (
                        <td key={gi.id} className="px-6 py-4 border-r border-slate-800/40 font-medium text-slate-300">
                          {displayVal}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right font-bold text-primary text-base">
                      {(totalSum * 100).toFixed(1)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
