import { AppLayout } from '@/shared/components/layout/AppLayout';

export function ProjectDetailPage(): JSX.Element {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="m-0 text-2xl font-semibold text-zinc-900">案件詳細</h1>
        <p className="m-0 mt-1 text-sm text-zinc-500">P5 で実装予定</p>
      </div>
    </AppLayout>
  );
}
