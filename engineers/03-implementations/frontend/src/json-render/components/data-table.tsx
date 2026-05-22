import React from 'react';
import { useStateStore, useStateValue } from '@json-render/react';
import { WeightInlineInput } from './weight-inline-input';
import type { ComponentType } from 'react';

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
            {!isWeightTable && children && <th className="px-6 py-4 text-right">操作</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={(columns?.length || 0) + (children || isWeightTable ? 1 : 0)}
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
                {!isWeightTable && children && (
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
