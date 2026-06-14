import { useStateValue } from '@json-render/react';
import { TYPE_TO_FRONTEND } from '@/lib/constants';

export function StudentGradesPreview() {
  const selectedStudentId = useStateValue('/selected/studentId') as string;

  // Retrieve students, grade items, and grade records from store
  const students = (useStateValue('/data/listStudents') || []) as any[];
  const gradeItems = (useStateValue('/data/listGradeItems') || []) as any[];
  const gradeRecords = (useStateValue('/data/listGradeRecords') || []) as any[];

  const isItemsLoading = useStateValue('/loading/listGradeItems') === true;
  const isRecordsLoading = useStateValue('/loading/listGradeRecords') === true;
  const isLoading = isItemsLoading || isRecordsLoading;

  // Find the selected student
  const student = students.find((s) => String(s.id).toLowerCase() === String(selectedStudentId).toLowerCase());

  if (!selectedStudentId || !student) {
    return (
      <div className="py-8 text-center text-slate-500 font-medium">
        無選取的學生資料
      </div>
    );
  }

  // Filter grade records for this student and map them to their corresponding grade items
  const mappedGrades = gradeItems.map((gi: any) => {
    const record = gradeRecords.find(
      (r: any) => String(r.studentId).toLowerCase() === String(selectedStudentId).toLowerCase() && String(r.gradeItemId).toLowerCase() === String(gi.id).toLowerCase()
    );
    const scoreVal = record?.score ?? null;
    const scoreNum = scoreVal !== null ? Number(scoreVal) : 0;
    const maxScore = Number(gi.maxScore) || 100;
    const weight = Number(gi.weight) || 0;

    // display values
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

    const typeLabel = TYPE_TO_FRONTEND[gi.itemType || gi.type || 'OTHER'] || gi.itemType || gi.type || '其他';

    return {
      itemId: gi.id,
      itemName: gi.itemName || gi.name,
      itemType: gi.itemType || gi.type || 'OTHER',
      typeLabel,
      score: scoreVal,
      scoreNum,
      maxScore,
      weight,
      displayVal,
    };
  });

  // Calculate student's personal weighted total score: Σ (score / maxScore * weight) * 100
  let totalSum = 0;
  mappedGrades.forEach((g: any) => {
    if (g.score !== null) {
      totalSum += (g.scoreNum / g.maxScore) * g.weight;
    }
  });
  const weightedTotalScore = (totalSum * 100).toFixed(1);

  return (
    <div className="space-y-6 text-slate-200">
      {/* Student Personal Info Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4 shadow-lg">
        <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          學生基本資料
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-slate-400">學號</span>
            <span className="text-sm font-semibold text-slate-200" data-testid="modal-student-id">{student.studentId}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-slate-400">座號</span>
            <span className="text-sm font-semibold text-slate-200" data-testid="modal-student-number">{student.studentNumber}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-slate-400">姓名</span>
            <span className="text-sm font-semibold text-slate-200" data-testid="modal-student-name">{student.studentName}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-slate-400">電子信箱</span>
            <span className="text-sm font-semibold text-indigo-400 hover:underline cursor-pointer break-all" data-testid="modal-student-email">{student.email}</span>
          </div>
        </div>
      </div>

      {/* Grades List Table - Styled using premium shadcn table elements and classes */}
      <div className="bg-[#0d1321]/80 backdrop-blur-sm border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse text-slate-300 text-sm">
            <thead className="bg-[#090e18] text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">評量項目</th>
                <th className="px-6 py-4">類型</th>
                <th className="px-6 py-4 text-right">分數</th>
                <th className="px-6 py-4 text-right">滿分</th>
                <th className="px-6 py-4 text-right">權重</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && mappedGrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    正在載入成績資料...
                  </td>
                </tr>
              ) : mappedGrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                    (沒有評量項目)
                  </td>
                </tr>
              ) : (
                mappedGrades.map((g: any) => (
                  <tr key={g.itemId} className="border-b border-slate-800/40 hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-semibold">{g.itemName}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                        {g.typeLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-200">{g.displayVal}</td>
                    <td className="px-6 py-4 text-right text-slate-400">{g.maxScore}</td>
                    <td className="px-6 py-4 text-right text-slate-400">{Math.round(g.weight * 100)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weighted Total Score Card */}
      <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-900/40 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center shadow-lg gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-sm font-semibold text-slate-300">目前學期加權總分數</h4>
          <p className="text-xs text-slate-400">依據各成績項目之滿分與所設權重加權計算後之總得分（總權重 100%）</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/30">
            加權計算完成
          </span>
          <span className="text-3xl font-extrabold text-primary" data-testid="weighted-total-score">
            {weightedTotalScore}
          </span>
        </div>
      </div>
    </div>
  );
}
