import { useMutation } from '@tanstack/react-query';
import { Alert, App, Button, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { ArrowLeft, FileSpreadsheet, Upload as UploadIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import { customersApi, type ImportResult } from '@/shared/api/customers.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

const TEMPLATE_CSV = `customer_type,name,name_kana,phone,email,address,is_ob,acquired_at,notes
individual,山田 太郎,ヤマダ タロウ,0312345678,yamada@example.com,東京都新宿区西新宿1-1-1,true,2018-04-15,OB
corporate,株式会社 サンプル,カブシキガイシャ サンプル,0335556666,contact@sample.example.com,東京都港区赤坂3-3-3,false,,新規法人
`;

export function CustomerImportPage(): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => customersApi.import(file),
    onSuccess: (res) => {
      setResult(res);
      message.success(t('customer.import.result'));
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const uploadProps: UploadProps = {
    accept: '.csv',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      setFileList([
        {
          uid: file.name,
          name: file.name,
          status: 'done',
          originFileObj: file,
        } as UploadFile,
      ]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
      setResult(null);
    },
  };

  function startImport(): void {
    const file = fileList[0]?.originFileObj as File | undefined;
    if (!file) return;
    setResult(null);
    importMutation.mutate(file);
  }

  function downloadTemplate(): void {
    const blob = new Blob(['﻿' + TEMPLATE_CSV], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600"
        >
          <ArrowLeft size={14} />
          {t('common.back')}
        </Link>

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200/70">
            <h1 className="m-0 text-lg sm:text-xl font-semibold text-zinc-900">
              {t('customer.import.title')}
            </h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">{t('customer.import.subtitle')}</p>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <Alert
              type="info"
              showIcon
              message={t('customer.import.instructions')}
              description={
                <>
                  <p className="m-0 mb-2">{t('customer.import.instructionsDetail')}</p>
                  <Button
                    size="small"
                    icon={<FileSpreadsheet size={14} />}
                    onClick={downloadTemplate}
                  >
                    {t('customer.import.downloadTemplate')}
                  </Button>
                </>
              }
            />

            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <UploadIcon size={32} className="mx-auto text-zinc-400" />
              </p>
              <p className="ant-upload-text">{t('customer.import.selectFile')}</p>
              <p className="ant-upload-hint text-xs text-zinc-500">.csv · UTF-8 · &lt;5MB</p>
            </Upload.Dragger>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="primary"
                disabled={fileList.length === 0}
                loading={importMutation.isPending}
                onClick={startImport}
                block
                className="sm:!w-auto"
              >
                {t('customer.import.submit')}
              </Button>
            </div>

            {result && (
              <div className="border-t border-zinc-200/70 pt-4 space-y-3">
                <h2 className="m-0 text-base font-semibold text-zinc-900">
                  {t('customer.import.result')}
                </h2>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                    {t('customer.import.created', { count: result.created })}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    {t('customer.import.skipped', { count: result.skipped })}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ring-1 ${
                      result.errors.length > 0
                        ? 'bg-red-50 text-red-700 ring-red-200'
                        : 'bg-zinc-50 text-zinc-600 ring-zinc-200'
                    }`}
                  >
                    {t('customer.import.errors', { count: result.errors.length })}
                  </span>
                </div>

                {result.errors.length === 0 ? (
                  <p className="m-0 text-sm text-zinc-500">{t('customer.import.noErrors')}</p>
                ) : (
                  <ul className="m-0 p-0 list-none border border-red-200 rounded-lg bg-red-50/30 max-h-64 overflow-y-auto divide-y divide-red-200/50">
                    {result.errors.map((e) => (
                      <li key={e.rowIndex} className="px-3 py-2 text-xs text-zinc-700">
                        <span className="font-mono text-red-700">
                          {t('customer.import.errorRow', {
                            row: e.rowIndex,
                            message: e.message,
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
