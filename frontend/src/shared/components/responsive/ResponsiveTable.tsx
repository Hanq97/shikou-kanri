import { Empty, Grid, Pagination, Spin, Table, type TableProps } from 'antd';
import type { Key, ReactNode } from 'react';

export interface ResponsiveTableProps<T> extends Omit<TableProps<T>, 'pagination'> {
  mobileCard: (row: T) => ReactNode;
  pagination?: TableProps<T>['pagination'];
  mobileEmptyText?: ReactNode;
}

export function ResponsiveTable<T extends object>({
  mobileCard,
  pagination,
  mobileEmptyText,
  dataSource,
  rowKey,
  loading,
  ...tableProps
}: ResponsiveTableProps<T>): JSX.Element {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  if (!isMobile) {
    return (
      <Table<T>
        {...tableProps}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        pagination={pagination}
      />
    );
  }

  const rows = dataSource ?? [];
  const isLoading = typeof loading === 'object' ? loading.spinning : loading;

  function getKey(row: T, index: number): Key {
    if (typeof rowKey === 'function') return rowKey(row);
    if (typeof rowKey === 'string') {
      const v = (row as Record<string, unknown>)[rowKey];
      if (typeof v === 'string' || typeof v === 'number') return v;
    }
    return index;
  }

  const paginationProps = pagination && typeof pagination === 'object' ? pagination : undefined;

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center py-12 bg-white rounded-lg">
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white py-12 rounded-lg">
          <Empty description={mobileEmptyText} />
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={getKey(row, idx)}>{mobileCard(row)}</div>
          ))}
        </div>
      )}

      {paginationProps && pagination !== false && (
        <div className="mt-4 flex justify-center">
          <Pagination
            current={paginationProps.current}
            pageSize={paginationProps.pageSize}
            total={paginationProps.total}
            onChange={paginationProps.onChange}
            showSizeChanger={false}
            simple
          />
        </div>
      )}
    </div>
  );
}
