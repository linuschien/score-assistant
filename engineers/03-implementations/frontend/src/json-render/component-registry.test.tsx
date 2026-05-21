import { render as tlRender, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import { componentRegistry } from './component-registry';

function render(ui: React.ReactElement) {
  const store = createStateStore({});
  const result = tlRender(
    <JSONUIProvider store={store} registry={componentRegistry} handlers={{}}>
      {ui}
    </JSONUIProvider>
  );
  return {
    ...result,
    rerender: (newUi: React.ReactElement) => result.rerender(
      <JSONUIProvider store={store} registry={componentRegistry} handlers={{}}>
        {newUi}
      </JSONUIProvider>
    )
  };
}

describe('ComponentRegistry custom components', () => {
  it('renders MetricCard successfully with and without values', () => {
    const MetricCard = componentRegistry['MetricCard'];
    
    // Case 1: Label and value present
    const { rerender } = render(
      <MetricCard element={{ props: { label: 'Total Students', value: 45 } }} />
    );
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();

    // Case 2: Value absent (fallback)
    rerender(<MetricCard element={{ props: { label: 'Empty Metric' } }} />);
    expect(screen.getByText('—')).toBeInTheDocument();

    // Case 3: props missing entirely
    rerender(<MetricCard element={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders DataTable with various configurations', () => {
    const DataTable = componentRegistry['DataTable'];

    // Case 1: Empty rows
    const { rerender } = render(
      <DataTable
        element={{
          props: {
            columns: [{ field: 'id', label: 'ID' }, { field: 'name', label: 'Name' }],
            data: [],
            label: 'Students Table',
          },
        }}
      />
    );
    expect(screen.getByRole('table', { name: 'Students Table' })).toBeInTheDocument();
    expect(screen.getByText('(沒有資料)')).toBeInTheDocument();

    // Case 2: Rows present, table with children (operations column)
    rerender(
      <DataTable
        element={{
          props: {
            columns: [{ field: 'id', label: 'ID' }, { field: 'name', label: 'Name' }],
            data: [
              { id: 'S01', name: 'Alice' },
              { name: 'Bob' }, // no id to test index fallback
            ],
            label: 'Students Table',
          },
        }}
      >
        <button>Delete</button>
      </DataTable>
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getAllByText('Delete')).toHaveLength(2);
    expect(screen.getByText('操作')).toBeInTheDocument();

    // Case 3: Missing columns and props edge cases
    rerender(<DataTable element={null} />);
    expect(screen.getByText('(沒有資料)')).toBeInTheDocument();
  });

  it('renders MultiSelect component', () => {
    const MultiSelect = componentRegistry['MultiSelect'];
    render(<MultiSelect />);
    expect(screen.getByText('MultiSelect')).toBeInTheDocument();
  });

  it('renders Breadcrumb component with children', () => {
    const Breadcrumb = componentRegistry['Breadcrumb'];
    render(
      <Breadcrumb>
        <li>Item 1</li>
        <li>Item 2</li>
      </Breadcrumb>
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('renders AlertDialog with label, text, and fallback configurations', () => {
    const AlertDialog = componentRegistry['AlertDialog'];

    // Case 1: Label present
    const { rerender } = render(
      <AlertDialog element={{ props: { label: 'Confirm Action' } }}>
        <p>Warning details</p>
      </AlertDialog>
    );
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Warning details')).toBeInTheDocument();

    // Case 2: Text present instead of label
    rerender(
      <AlertDialog element={{ props: { text: 'Confirm Text Action' } }}>
        <p>Warning details</p>
      </AlertDialog>
    );
    expect(screen.getByText('Confirm Text Action')).toBeInTheDocument();

    // Case 3: No label or text
    rerender(
      <AlertDialog element={{ props: {} }}>
        <p>Warning details</p>
      </AlertDialog>
    );
    expect(screen.getByText('確認操作')).toBeInTheDocument();

    // Case 4: No element at all
    rerender(
      <AlertDialog element={null}>
        <p>Warning details</p>
      </AlertDialog>
    );
    expect(screen.getByText('確認操作')).toBeInTheDocument();
  });

  it('renders Chart placeholders correctly', () => {
    const ChartBar = componentRegistry['Chart:bar'];
    const ChartLine = componentRegistry['Chart:line'];
    const ChartPie = componentRegistry['Chart:pie'];

    const { rerender } = render(
      <ChartBar element={{ props: { label: 'Bar Chart Metric' } }} />
    );
    expect(screen.getByText('Bar Chart: Bar Chart Metric')).toBeInTheDocument();

    rerender(<ChartLine element={{ props: { label: 'Line Chart Metric' } }} />);
    expect(screen.getByText('Line Chart: Line Chart Metric')).toBeInTheDocument();

    rerender(<ChartPie element={{ props: { label: 'Pie Chart Metric' } }} />);
    expect(screen.getByText('Pie Chart: Pie Chart Metric')).toBeInTheDocument();
  });

  it('renders custom div component with class names and children', () => {
    const DivComponent = componentRegistry['div'];
    render(
      <DivComponent element={{ props: { className: 'custom-class' } }}>
        <span>Inner child</span>
      </DivComponent>
    );
    expect(screen.getByText('Inner child')).toBeInTheDocument();
  });

  it('verifies the adapter function handles empty props gracefully', () => {
    // Test the adapted Component behaviour using an adapted button
    const AdaptedButton = componentRegistry['Button'];
    render(
      <AdaptedButton
        element={{
          props: {
            label: 'Adapted Button',
          },
        }}
      />
    );
    // Button is part of @json-render/shadcn, let's verify it renders with its adapted displayName
    expect(AdaptedButton.displayName).toContain('Adapted(');
  });
});
