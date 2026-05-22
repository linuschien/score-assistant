import React from 'react';
import { shadcnComponents } from '@json-render/shadcn';
import { useStateStore } from '@json-render/react';
import type { ComponentType } from 'react';

import { MetricCard } from './components/metric-card';
import { DataTable } from './components/data-table';
import { Breadcrumb } from './components/breadcrumb';
import { AlertDialog } from './components/alert-dialog';
import { DatePicker } from './components/date-picker';
import { CustomButton } from './components/custom-button';
import { RechartsPieChartComponent } from './components/pie-chart';
import { ChartPlaceholder } from './components/chart-placeholder';

// ────────────────────────────────────────────────────────────────────────────────
// Adapter: bridges @json-render/react's ComponentRenderProps  { element, children, emit, on, bindings, loading }
//          to   @json-render/shadcn's BaseComponentProps       { props, children, emit, on, bindings, loading }
// ────────────────────────────────────────────────────────────────────────────────
function adapt(Comp: ComponentType<any>): ComponentType<any> {
  const Adapted: ComponentType<any> = ({ element, children, emit, on, bindings, loading }: any) => {
    let store: any;
    try {
      store = useStateStore();
    } catch (e) {
      console.error('useStateStore error in adapt:', e);
      store = null;
    }

    const customEmit = (eventName: string, ...args: any[]) => {
      if (eventName === 'press' && store) {
        const label = element?.props?.label ?? '';
        const id = element?.props?.id ?? '';

        // Auto-close modals when clicking Cancel/取消 or standard close triggers
        if (label === '取消' || id.includes('cancel')) {
          const modals = store.get('/modals') || {};
          const updated = { ...modals };
          Object.keys(updated).forEach((k) => {
            updated[k] = false;
          });
          store.set('/modals', updated);
        }
      }

      if (emit) {
        emit(eventName, ...args);
      }
    };

    const rawProps = element?.props ?? {};
    const props = { ...rawProps };

    // Dynamic curly-brace interpolation (e.g. {{state.data.getSemesterById?.name ...}})
    if (store) {
      const interpolate = (val: any): any => {
        if (typeof val !== 'string') return val;
        return val.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
          const trimmed = expression.trim();
          if (trimmed.includes('getSemesterById')) {
            const semester = store.get('/data/getSemesterById');
            return semester?.name || semester?.label || '';
          }
          if (trimmed.includes('getClassById')) {
            const classVal = store.get('/data/getClassById');
            return classVal?.name || classVal?.label || '';
          }
          return '';
        });
      };
      if (props.text) props.text = interpolate(props.text);
      if (props.label) props.label = interpolate(props.label);
      if (props.placeholder) props.placeholder = interpolate(props.placeholder);
    }

    if (element?.type === 'Button') {
      const v = props.variant;
      if (v === 'primary') {
        props.variant = 'default';
        props.className = `${props.className || ''} bg-primary`.trim();
      } else if (v === 'danger') {
        props.variant = 'destructive';
        props.className = `${props.className || ''} bg-danger`.trim();
      } else if (v === 'secondary') {
        props.variant = 'secondary';
        props.className = `${props.className || ''} bg-secondary`.trim();
      } else if (v === 'outline') {
        props.variant = 'outline';
      } else if (!v) {
        if (props.id?.includes('link') || props.id?.includes('crumb') || props.id?.includes('breadcrumb')) {
          props.variant = 'link';
        } else {
          props.variant = 'default';
          props.className = `${props.className || ''} bg-primary`.trim();
        }
      }
      props['data-variant'] = props.variant;
    }

    return React.createElement(Comp, {
      props,
      children,
      emit: customEmit,
      on,
      bindings,
      loading,
    });
  };
  Adapted.displayName = `Adapted(${(Comp as any).displayName || Comp.name || 'Component'})`;
  return Adapted;
}

// ────────────────────────────────────────────────────────────────────────────────
// Component Registry
// ────────────────────────────────────────────────────────────────────────────────
export const componentRegistry: Record<string, ComponentType<any>> = {
  // ── 1. All 36 @json-render/shadcn presets, adapted to ComponentRenderProps ──
  ...Object.fromEntries(
    Object.entries(shadcnComponents).map(([key, Comp]) => [key, adapt(Comp as ComponentType<any>)])
  ),

  // Override black-box preset button with our CustomButton to get perfect variant styling control
  'Button': adapt(CustomButton),

  // ── 2. Custom layout shell ──────────────────────────────────────────────────
  'Container:page': ({ children }) => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">{children}</div>
  ),

  // ── 3. Custom composite components ─────────────────────────────────────────
  'MetricCard': MetricCard,
  'DataTable': DataTable,
  'Breadcrumb': Breadcrumb,
  'AlertDialog': AlertDialog,
  'DatePicker': DatePicker,

  // ── 4. Chart wrappers ───────────────────────────────────────────────────────
  'Chart:bar': ChartPlaceholder('Bar'),
  'Chart:line': ChartPlaceholder('Line'),
  'Chart:pie': RechartsPieChartComponent,

  // ── 5. Native HTML wrapper (no-op passthrough) ──────────────────────────────
  'div': ({ element, children }) => (
    <div className={element?.props?.className}>{children}</div>
  ),
};
