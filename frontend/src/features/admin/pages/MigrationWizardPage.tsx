/**
 * MOCK-IMPL (partial) — see DEMO-TO-PROD-MIGRATION.md#migration-tool
 * 顧客 (customer) tab links to real customer CSV import.
 * 物件 (property) + 引渡日 (handover-date) tabs are mock UI only.
 * Productize: extend existing F1 customer-import infra to property + handover_date CSV parsing.
 */
import {
  Alert,
  Button,
  Result,
  Space,
  Steps,
  Tabs,
  Typography,
  Upload,
  type UploadFile,
} from 'antd';
import { Database, FileUp, Home } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';

type WizardStep = 0 | 1 | 2 | 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function MockMigrationTab({ kind }: { kind: 'property' | 'handover' }): JSX.Element {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>(0);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [validation, setValidation] = useState<{
    valid: number;
    invalid: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function validate(): Promise<void> {
    setLoading(true);
    setStep(1);
    await delay(2000);
    // Mock parse: pretend file has N rows
    const fakeRows = 50 + Math.floor(Math.random() * 100);
    const fakeInvalid = Math.floor(Math.random() * 5);
    setValidation({ valid: fakeRows - fakeInvalid, invalid: fakeInvalid });
    setLoading(false);
  }

  async function runImport(): Promise<void> {
    setLoading(true);
    setStep(2);
    await delay(4000);
    if (validation) {
      setImportResult({
        imported: validation.valid,
        skipped: validation.invalid,
      });
    }
    setLoading(false);
    setStep(3);
  }

  function reset(): void {
    setStep(0);
    setFiles([]);
    setValidation(null);
    setImportResult(null);
  }

  return (
    <div className="space-y-4">
      <Steps
        current={step}
        items={[
          { title: t('migration.steps.upload') },
          { title: t('migration.steps.validate') },
          { title: t('migration.steps.import') },
          { title: t('migration.steps.done') },
        ]}
      />

      {step === 0 && (
        <div className="bg-white border border-zinc-200/70 rounded-xl p-6 shadow-card">
          <Upload.Dragger
            multiple={false}
            accept=".csv"
            beforeUpload={(file) => {
              setFiles([
                {
                  uid: '-1',
                  name: file.name,
                  status: 'done',
                  size: file.size,
                },
              ]);
              return false;
            }}
            fileList={files}
            onRemove={() => setFiles([])}
          >
            <p className="text-4xl mb-2">📁</p>
            <p className="text-base font-medium">{t('migration.uploadHint')}</p>
            <p className="text-xs text-zinc-500 mt-2">{t(`migration.${kind}.schema`)}</p>
          </Upload.Dragger>

          <div className="mt-4 flex justify-end">
            <Button
              type="primary"
              disabled={files.length === 0}
              onClick={validate}
              icon={<FileUp size={14} />}
            >
              {t('migration.nextValidate')}
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white border border-zinc-200/70 rounded-xl p-6 shadow-card">
          {loading ? (
            <Result
              status="info"
              title={t('migration.validating')}
              subTitle={t('migration.validatingDesc')}
            />
          ) : (
            <>
              <Alert
                type={validation && validation.invalid === 0 ? 'success' : 'warning'}
                showIcon
                message={t('migration.validateResult', {
                  valid: validation?.valid ?? 0,
                  invalid: validation?.invalid ?? 0,
                })}
                description={
                  validation && validation.invalid > 0
                    ? t('migration.invalidWarn')
                    : t('migration.allGood')
                }
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={reset}>{t('common.back')}</Button>
                <Button
                  type="primary"
                  onClick={runImport}
                  disabled={!validation || validation.valid === 0}
                >
                  {t('migration.nextImport')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border border-zinc-200/70 rounded-xl p-6 shadow-card">
          <Result
            status="info"
            title={t('migration.importing')}
            subTitle={t('migration.importingDesc')}
          />
        </div>
      )}

      {step === 3 && importResult && (
        <div className="bg-white border border-zinc-200/70 rounded-xl p-6 shadow-card">
          <Result
            status="success"
            title={t('migration.doneTitle')}
            subTitle={t('migration.doneDetail', {
              imported: importResult.imported,
              skipped: importResult.skipped,
            })}
            extra={
              <Space>
                <Button onClick={reset}>{t('migration.startOver')}</Button>
                <Link to="/home">
                  <Button type="primary" icon={<Home size={14} />}>
                    {t('common.backToHome')}
                  </Button>
                </Link>
              </Space>
            }
          />
        </div>
      )}
    </div>
  );
}

function CustomerTab(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Alert
      type="info"
      showIcon
      message={t('migration.customer.title')}
      description={
        <span>
          {t('migration.customer.desc')}{' '}
          <Link to="/admin/customer-import" className="text-brand-700 underline">
            {t('migration.customer.goto')}
          </Link>
        </span>
      }
    />
  );
}

export function MigrationWizardPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-brand-600" />
          <Typography.Title level={4} className="!m-0">
            {t('migration.title')}
          </Typography.Title>
        </div>

        <Tabs
          defaultActiveKey="property"
          items={[
            {
              key: 'customer',
              label: t('migration.tabs.customer'),
              children: <CustomerTab />,
            },
            {
              key: 'property',
              label: t('migration.tabs.property'),
              children: <MockMigrationTab kind="property" />,
            },
            {
              key: 'handover',
              label: t('migration.tabs.handover'),
              children: <MockMigrationTab kind="handover" />,
            },
          ]}
        />
      </div>
    </AppLayout>
  );
}
