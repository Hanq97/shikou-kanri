import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  return (
    <Result
      status="404"
      title="404"
      subTitle="お探しのページは見つかりませんでした。"
      extra={
        <Link to="/home">
          <Button type="primary">ホームに戻る</Button>
        </Link>
      }
    />
  );
}
