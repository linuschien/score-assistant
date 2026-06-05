import { render as tlRender, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { JSONUIProvider, createStateStore } from '@json-render/react';
import userEvent from '@testing-library/user-event';
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

    // Case 4: Custom operations column label
    rerender(
      <DataTable
        element={{
          props: {
            columns: [{ field: 'id', label: 'ID' }],
            data: [{ id: 'S01' }],
            label: 'Students Table',
            operationsLabel: '動作群組',
          },
        }}
      >
        <button>Delete</button>
      </DataTable>
    );
    expect(screen.getByText('動作群組')).toBeInTheDocument();

    // Case 3: Missing columns and props edge cases
    rerender(<DataTable element={null} />);
    expect(screen.getByText('(沒有資料)')).toBeInTheDocument();
  });

  it('supports column sorting in DataTable', async () => {
    const user = userEvent.setup();
    const DataTable = componentRegistry['DataTable'];

    const mockData = [
      { id: 'S02', name: 'Bob', score: 90 },
      { id: 'S01', name: 'Charlie', score: 85 },
      { id: 'S03', name: 'Alice', score: 95 },
    ];

    const columns = [
      { field: 'id', label: 'ID', sortable: true },
      { field: 'name', label: 'Name', sortable: true, default_sort: 'asc' },
      { field: 'score', label: 'Score', sortable: false },
    ];

    render(
      <DataTable
        element={{
          props: {
            columns,
            data: mockData,
            label: 'Sort Table',
          },
        }}
      />
    );

    // Initial render should be sorted by Name in 'asc' order (Alice, Bob, Charlie) due to default_sort: 'asc'
    let rows = screen.getAllByRole('row');
    // Note: row 0 is the table header
    expect(rows[1]).toHaveTextContent('Alice');
    expect(rows[2]).toHaveTextContent('Bob');
    expect(rows[3]).toHaveTextContent('Charlie');

    // Click 'Name' header to toggle to descending (Charlie, Bob, Alice)
    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Charlie');
    expect(rows[2]).toHaveTextContent('Bob');
    expect(rows[3]).toHaveTextContent('Alice');

    // Click 'ID' header to sort by ID in ascending (S01, S02, S03)
    // S01 is Charlie, S02 is Bob, S03 is Alice
    const idHeader = screen.getByText('ID');
    await user.click(idHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Charlie'); // S01
    expect(rows[2]).toHaveTextContent('Bob');     // S02
    expect(rows[3]).toHaveTextContent('Alice');   // S03

    // Click 'ID' header again to sort by ID in descending (S03, S02, S01)
    await user.click(idHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Alice');   // S03
    expect(rows[2]).toHaveTextContent('Bob');     // S02
    expect(rows[3]).toHaveTextContent('Charlie'); // S01

    // Clicking non-sortable 'Score' header shouldn't change the sorting
    const scoreHeader = screen.getByText('Score');
    await user.click(scoreHeader);
    rows = screen.getAllByRole('row');
    // Still sorted by ID descending
    expect(rows[1]).toHaveTextContent('Alice');
    expect(rows[2]).toHaveTextContent('Bob');
    expect(rows[3]).toHaveTextContent('Charlie');
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
    expect(screen.getByText('尚無權重設定，請在下方表格輸入權重')).toBeInTheDocument();
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

  it('renders GradeMatrixTable component and calculates/formats cells correctly', () => {
    const GradeMatrixTable = componentRegistry['GradeMatrixTable'];
    const mockState = {
      data: {
        listStudents: [
          { id: 'stud-1', studentNumber: '01', studentName: '王小明' }
        ],
        listGradeItems: [
          { id: 'item-1', itemName: '期中考', type: 'EXAM', maxScore: 100, weight: 0.4 },
          { id: 'item-2', itemName: '出席表現', type: 'ATTENDANCE', maxScore: 10, weight: 0.2 }
        ],
        listGradeRecords: [
          { id: 'rec-1', studentId: 'stud-1', gradeItemId: 'item-1', score: 85 },
          { id: 'rec-2', studentId: 'stud-1', gradeItemId: 'item-2', score: 1 }
        ]
      }
    };

    const store = createStateStore(mockState);
    tlRender(
      <JSONUIProvider store={store} registry={componentRegistry} handlers={{}}>
        <GradeMatrixTable element={{ props: { label: 'Grade Matrix Test' } }} />
      </JSONUIProvider>
    );

    // Verify row headers
    expect(screen.getByText('王小明')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();

    // Verify dynamic column headers
    expect(screen.getByText('期中考')).toBeInTheDocument();
    expect(screen.getByText('出席表現')).toBeInTheDocument();

    // Verify type translations and maxscore/weight descriptions
    expect(screen.getByText('考試')).toBeInTheDocument();
    expect(screen.getByText('(滿分: 100 / 權重: 40%)')).toBeInTheDocument();

    // Verify inputs and select controls rendered correctly
    const scoreInput = screen.getByTestId('score-input-stud-1-item-1');
    expect(scoreInput).toBeInTheDocument();
    expect(scoreInput).toHaveValue(85);

    const attendanceSelect = screen.getByTestId('attendance-select-stud-1-item-2');
    expect(attendanceSelect).toBeInTheDocument();
    expect(attendanceSelect).toHaveValue('出席');
  });
});
