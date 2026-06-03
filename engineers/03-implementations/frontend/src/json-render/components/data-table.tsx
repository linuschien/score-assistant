import React, { createContext, useState, useMemo } from 'react';
import { useStateStore, useStateValue } from '@json-render/react';
import { shadcnComponents } from '@json-render/shadcn';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ComponentType } from 'react';

const Spinner = shadcnComponents.Spinner;

export const RowContext = createContext<{ rowId?: string; row?: any }>({});

export const DataTable: ComponentType<any> = ({ element, children, bindings, emit, on }: any) => {
  let store: any;
  try {
    store = useStateStore();
  } catch (e) {
    store = null;
  }

  const { columns, data: rawData, label, dataRef } = element?.props || {};
  
  // Resolve data reactively using useStateValue
  let bindPath = '';
  const dataProp = bindings?.data ?? rawData;
  if (typeof dataProp === 'string' && dataProp.startsWith('/')) {
    bindPath = dataProp;
  } else if (dataProp && typeof dataProp === 'object' && '$bindState' in dataProp) {
    bindPath = dataProp.$bindState;
  }

  const isLoading = useStateValue(`/loading/${dataRef}`) === true;
  const stateVal = useStateValue(bindPath);
  const rows: any[] = Array.isArray(stateVal) ? (stateVal as any[]) : (Array.isArray(dataProp) ? dataProp : []);

  const hasOperations = React.Children.count(children) > 0;

  const tableId = element?.props?.id || '';
  const [prevTableId, setPrevTableId] = useState<string>(tableId);

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(() => {
    const col = columns?.find((c: any) => c.default_sort);
    return col ? col.field : null;
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(() => {
    const col = columns?.find((c: any) => c.default_sort);
    return col ? (col.default_sort === 'desc' ? 'desc' : 'asc') : null;
  });

  // Reset sorting state if the table ID changes (e.g. navigation or switching tabs)
  if (tableId !== prevTableId) {
    const col = columns?.find((c: any) => c.default_sort);
    setSortField(col ? col.field : null);
    setSortDirection(col ? (col.default_sort === 'desc' ? 'desc' : 'asc') : null);
    setPrevTableId(tableId);
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      const col = columns?.find((c: any) => c.field === field);
      setSortDirection(col?.default_sort === 'desc' ? 'desc' : 'asc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortField || !sortDirection) return rows;

    return [...rows].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle null/undefined values by placing them at the bottom
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Convert to string and compare
      const strA = String(aVal).trim();
      const strB = String(bVal).trim();

      // Check if they are numeric strings (e.g. seat numbers like "01", "02")
      const numA = Number(strA);
      const numB = Number(strB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // Localized string comparison
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, 'zh-Hant-TW', { numeric: true })
        : strB.localeCompare(strA, 'zh-Hant-TW', { numeric: true });
    });
  }, [rows, sortField, sortDirection]);

  return (
    <div className="bg-[#0d1321]/80 backdrop-blur-sm border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
      <table className="w-full text-left border-collapse text-slate-300 text-sm" aria-label={label}>
        <thead className="bg-slate-900/50 text-slate-400 font-medium border-b border-slate-800/80">
          <tr>
            {columns?.map((col: any) => {
              const isSortable = col.sortable === true;
              const isSorted = sortField === col.field;
              return (
                <th
                  key={col.field}
                  className={`px-6 py-4 select-none ${
                    isSortable
                      ? 'cursor-pointer group hover:text-slate-200 transition-colors duration-200'
                      : ''
                  }`}
                  onClick={() => isSortable && handleSort(col.field)}
                  aria-sort={
                    isSorted
                      ? (sortDirection === 'asc' ? 'ascending' : 'descending')
                      : undefined
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.label}</span>
                    {isSortable && (
                      <span className="inline-flex">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4 text-indigo-400 transition-transform duration-200" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-indigo-400 transition-transform duration-200" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-slate-600/60 group-hover:text-slate-400/80 transition-colors duration-200" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
            {hasOperations && <th className="px-6 py-4 text-right">操作</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <td
                colSpan={(columns?.length || 0) + (hasOperations ? 1 : 0)}
                className="px-6 py-12 text-center text-slate-500 font-medium"
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Spinner
                    props={{ size: 'md', label: '正在載入資料...' }}
                    emit={emit}
                    on={on}
                  />
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={(columns?.length || 0) + (hasOperations ? 1 : 0)}
                className="px-6 py-8 text-center text-slate-500 font-medium"
              >
                (沒有資料)
              </td>
            </tr>
          ) : (
            sortedRows.map((row: any, idx: number) => (
              <tr key={row.id || idx} className="border-b border-slate-800/40 hover:bg-slate-900/30 transition-colors">
                {columns?.map((col: any) => (
                  <td key={col.field} className="px-6 py-4">
                    {col.field === 'email' && row[col.field] ? (
                      <a
                        href={`mailto:${row[col.field]}`}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors font-medium"
                      >
                        {String(row[col.field])}
                      </a>
                    ) : (
                      String(row[col.field] ?? '')
                    )}
                  </td>
                ))}
                {hasOperations && (
                  <td className="px-6 py-4 text-right space-x-2">
                    <RowContext.Provider value={{ rowId: row.id, row }}>
                      {React.Children.map(children, (child) => {
                        if (!React.isValidElement(child)) return child;
                        
                        // Clone the child and dynamically inject rowId and row details if it is a component, not a native tag
                        const clonedChild = typeof child.type === 'string'
                          ? child
                          : React.cloneElement(child as any, {
                              rowId: row.id,
                              row: row,
                            });

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
                            {clonedChild}
                          </div>
                        );
                      })}
                    </RowContext.Provider>
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
