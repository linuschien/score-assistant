import { useStateValue } from '@json-render/react';
import { PieChart as ReChartsPie, Pie, Cell, Tooltip as ReChartsTooltip, Legend as ReChartsLegend } from 'recharts';
import type { ComponentType } from 'react';

export const RechartsPieChartComponent: ComponentType<any> = () => {
  const list = useStateValue('/data/listGradeItems') || [];
  const items = Array.isArray(list) ? list.filter((item: any) => (Number(item.weight) || 0) > 0) : [];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800/80 rounded-xl h-64">
        <p className="text-sm text-slate-500 font-medium text-slate-450">尚無權重設定，請在下方表格輸入權重</p>
      </div>
    );
  }

  const data = items.map((item: any) => ({
    name: item.name || '',
    value: Number(item.weight) || 0,
  }));

  return (
    <div className="bg-[#0f172a] border border-slate-800/80 p-6 rounded-xl shadow-xl">
      <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4">權重分布圖</h3>
      <div className="h-64 w-full flex items-center justify-center">
        <ReChartsPie width={300} height={200}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
            isAnimationActive={false}
          >
            {data.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ReChartsTooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f1f5f9' }}
            itemStyle={{ color: '#94a3b8' }}
          />
          <ReChartsLegend verticalAlign="bottom" height={36} />
        </ReChartsPie>
      </div>
    </div>
  );
};
