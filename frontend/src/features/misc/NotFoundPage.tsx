import { Button } from 'antd';
import { Home, MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-zinc-50 via-white to-brand-50/30">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 grid place-items-center mx-auto mb-6">
          <MapPinOff size={28} strokeWidth={1.8} />
        </div>
        <p className="m-0 text-6xl font-semibold text-zinc-900 tracking-tight tabular-nums">404</p>
        <h2 className="m-0 mt-3 text-lg font-semibold text-zinc-900">ページが見つかりません</h2>
        <p className="m-0 mt-2 text-sm text-zinc-500">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <Link to="/home" className="inline-block mt-8">
          <Button type="primary" icon={<Home size={14} />}>
            ホームに戻る
          </Button>
        </Link>
      </div>
    </div>
  );
}
