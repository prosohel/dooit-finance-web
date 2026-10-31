'use client';
import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { cn } from '@/lib/utils';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable';
import ResizableTableHead from './ResizableTableHead';
import { Skeleton } from './skeleton';
/**
 * CustomResizableTable
 *
 * A flexible table component with:
 * - Resizable columns (mouse drag)
 * - Draggable column reordering (horizontal only)
 * - Loading skeleton state
 * - Optional action toolbar
 * - Row highlighting via localStorage
 *
 * --------------------
 * PROPS
 * --------------------
 *
 * @param {string} [className]
 *  Additional CSS/Tailwind classes applied to the Table element.
 *
 * @param {string} mainClass
 *  REQUIRED for column resizing.
 *  Used to query DOM tables via `document.getElementsByClassName`.
 *  All resizable tables must share this class.
 *
 * @param {string} [tableId="1111"]
 *  Unique table ID used internally to control table width during column resize.
 *  Must be unique when multiple tables exist on the page.
 *
 * @param {Array} columns
 *  Column configuration array.
 *
 *  Column shape:
 *  {
 *    id: string; // required, used for drag & resize
 *    header: ReactNode | ({ column }) => ReactNode;
 *    accessorKey?: string; // used when cell renderer is not provided
 *    cell?: ({ row, index }) => ReactNode;
 *    size?: number | string; // initial column width
 *  }
 *
 * @param {Array} [data=[]]
 *  Array of row objects.
 *  Each row is passed to `cell` as `row.original`.
 *
 * @param {boolean} [loading=false]
 *  When true, renders skeleton rows instead of data.
 *
 * @param {(row: any) => void} [onDoubleClick]
 *  Callback fired when a table row is double-clicked.
 *  Receives the original row object.
 *
 * @param {React.ReactNode} [actions]
 *  Optional toolbar rendered above the table (filters, buttons, etc.).
 *
 * @param {...any} props
 *  Additional props forwarded to the underlying Table component.
 *
 * --------------------
 * BEHAVIOR NOTES
 * --------------------
 *
 * - Column order is managed internally and resets when `columns` change.
 * - Column resizing is done via direct DOM manipulation (not React state).
 * - Drag overlay shows the active column header while dragging.
 * - Row highlighting reads `newId` from localStorage and auto-clears after 10s.
 */

const CustomResizableTable = ({
  className,
  mainClass,
  tableId = '1111',
  columns = [],
  data = [],
  loading = false,
  onDoubleClick,
  actions,
  trBgColor,
  ...props
}) => {
  const [highlightedId, setHighlightedId] = useState(null);
  const sensors = useSensors(useSensor(MouseSensor, {}));
  const [activeDragId, setActiveDragId] = useState(null);
  const [columnOrder, setColumnOrder] = useState(
    columns.map((column) => column.id)
  );

  useEffect(() => {
    setColumnOrder(columns.map((column) => column.id));
  }, [columns]);

  const resizableGrid = (table) => {
    if (!table) return;
    const tableHeight = table.offsetHeight;
    table.style.overflow = 'hidden';

    const row = table.getElementsByTagName('tr')[0];
    const cols = row ? row.children : undefined;
    if (!cols) return;

    const paddingDiff = (col) => {
      const getStyleVal = (elm, css) =>
        window.getComputedStyle(elm, null).getPropertyValue(css);
      if (getStyleVal(col, 'box-sizing') === 'border-box') return 0;

      const padLeft = getStyleVal(col, 'padding-left');
      const padRight = getStyleVal(col, 'padding-right');
      return Number.parseInt(padLeft) + Number.parseInt(padRight);
    };

    const setListeners = (div) => {
      let pageX, curCol, curColWidth, tableWidth;

      const handleMouseDown = (e) => {
        const tableElement = document.getElementById(tableId);
        if (!tableElement) return;

        tableWidth = tableElement.offsetWidth;
        curCol = e.target.parentElement;
        pageX = e.pageX;
        const padding = paddingDiff(curCol);
        curColWidth = curCol.offsetWidth - padding;
      };

      const handleMouseMove = (e) => {
        setActiveDragId(null);
        const tableElement = document.getElementById(tableId);
        if (curCol && tableElement) {
          const diffX = e.pageX - pageX;
          curCol.style.width = `${curColWidth + diffX}px`;
          tableElement.style.width = `${tableWidth + diffX}px`;
        }
      };

      const handleMouseUp = () => {
        curCol = undefined;
        pageX = undefined;
        curColWidth = undefined;
      };

      div.addEventListener('mousedown', handleMouseDown);
      div.addEventListener(
        'mouseover',
        (e) => (e.target.style.borderRight = '3px solid lightgray')
      );
      div.addEventListener(
        'mouseout',
        (e) => (e.target.style.borderRight = '')
      );

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        div.removeEventListener('mousedown', handleMouseDown);
        div.removeEventListener(
          'mouseover',
          (e) => (e.target.style.borderRight = '3px solid #FBBC06')
        );
        div.removeEventListener(
          'mouseout',
          (e) => (e.target.style.borderRight = '')
        );

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    };

    const createDiv = (height) => {
      const div = document.createElement('div');
      div.style.top = 0;
      div.style.right = 0;
      div.style.width = '5px';
      div.style.boxSizing = 'border-box';
      div.style.position = 'absolute';
      div.style.cursor = 'col-resize';
      div.style.userSelect = 'none';
      div.style.height = `${height}px`;
      return div;
    };

    for (let i = 0; i < cols.length; i++) {
      const div = createDiv(tableHeight);
      cols[i].appendChild(div);
      cols[i].style.position = 'relative';
      setListeners(div);
    }
  };

  useEffect(() => {
    const newId = localStorage.getItem('newId');
    if (newId) {
      setHighlightedId(newId);
      localStorage.removeItem('newId');
      setTimeout(() => setHighlightedId(null), 10000);
    }
  }, []);

  useEffect(() => {
    const tables = document.getElementsByClassName(mainClass);

    if (tables.length === 0) return;
    for (let i = 0; i < tables.length; i++) {
      resizableGrid(tables[i]);
    }
  }, [tableId]);

  const handleDragStart = (event) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((prev) => {
        const oldIndex = prev.indexOf(String(active.id));
        const newIndex = prev.indexOf(String(over.id));
        return arrayMove(prev, oldIndex, newIndex);
      });
    }

    setActiveDragId(null);
  };

  const orderedColumns = columnOrder
    .map((id) => columns.find((col) => col.id === id))
    .filter(Boolean);

  return (
    <div className="mt-4">
      {actions ? (
        <div className="flex items-center justify-end gap-2 mb-2">
          {actions}
        </div>
      ) : null}
      <DndContext
        collisionDetection={closestCorners}
        modifiers={[restrictToHorizontalAxis]}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columnOrder}
          strategy={horizontalListSortingStrategy}
        >
          <Table
            id={tableId}
            className={cn(mainClass, className, 'w-full  border table-auto ')}
            {...props}
          >
            <TableHeader>
              <TableRow>
                {orderedColumns.map((column) => (
                  <ResizableTableHead
                    key={column.id}
                    id={column.id}
                    className="border-r border-gray-300 bg-gray-100 text-gray-800"
                    style={{ width: column.size ?? 'auto' }}
                  >
                    {typeof column.header === 'function'
                      ? column.header({ column })
                      : column.header}
                  </ResizableTableHead>
                ))}
              </TableRow>
            </TableHeader>
            {loading ? (
              <>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={`skeleton-row-${index}`} className="my-3">
                      {orderedColumns.map((header) => {
                        return (
                          <TableCell
                            key={header.id}
                            // Same dividers as the loaded rows, so the table
                            // does not change shape when the data arrives.
                            className="border-r border-border font-bold last:border-r-0"
                          >
                            <Skeleton className="w-full h-10 animate-pulse" />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </>
            ) : (
              <TableBody>
                {data?.length > 0 ? (
                  data?.map((row, index) => {
                    return (
                      <TableRow
                        onDoubleClick={() => onDoubleClick?.(row)}
                        key={row.id || index}
                        data-highlighted={highlightedId === row?.original?.id}
                        className={cn(' hover:bg-neutral-100  font-medium ', {
                          'bg-blue-50 ': highlightedId === row?.original?.id,
                          [row.bgColor]: row.bgColor,
                        })}
                      >
                        {orderedColumns.map((column) => {
                          return (
                            // Column dividers: the header row draws them, so a
                            // body without them left every column open below the
                            // first line. `border-border` is a lighter step than
                            // the header's gray-300 — the same rule repeated down
                            // hundreds of rows reads as a grid, not as structure.
                            <TableCell
                              key={column.id}
                              className="border-r border-border last:border-r-0"
                            >
                              {column.cell
                                ? column.cell({
                                    row: {
                                      original: row,
                                    },
                                    index,
                                  })
                                : row[column.accessorKey]}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center">
                      No data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            )}
            {activeDragId && (
              <DragOverlay wrapperElement="thead">
                <TableRow className="flex w-full h-full">
                  <TableHead className="cursor-grabbing bg-primary shadow-lg font-bold text-primary-foreground">
                    <div className="flex flex-row items-center w-full h-full">
                      {(() => {
                        const activeColumn = columns.find(
                          (col) => col.id === activeDragId
                        );
                        return activeColumn
                          ? typeof activeColumn.header === 'function'
                            ? activeColumn.header({ column: activeColumn })
                            : activeColumn.header
                          : '';
                      })()}
                    </div>
                  </TableHead>
                </TableRow>
              </DragOverlay>
            )}
          </Table>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default CustomResizableTable;
