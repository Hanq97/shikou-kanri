import { App, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import { usersApi } from '@/shared/api/users.api';
import { useAuthStore } from '@/shared/stores/authStore';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { SettingsLayout } from '../components/SettingsLayout';

export function ProfilePage(): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const reload = useAuthStore((s) => s.loadCurrentUser);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ name: string; nameKana: string }>();

  if (!user) return <></>;

  async function onSubmit(values: { name: string; nameKana: string }): Promise<void> {
    setSubmitting(true);
    try {
      await usersApi.updateProfile(user!.id, {
        name: values.name.trim(),
        nameKana: values.nameKana?.trim() || undefined,
      });
      await reload();
      message.success(t('settings.profile.updateSuccess'));
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsLayout title={t('settings.profile.title')} description={t('settings.profile.description')}>
      <div className="bg-zinc-50 border border-zinc-200/70 rounded-lg px-4 py-3 mb-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="text-zinc-500">{t('settings.profile.labelEmail')}</div>
        <div className="text-zinc-900 font-medium">{user.email}</div>
        <div className="text-zinc-500">{t('settings.profile.labelRole')}</div>
        <div className="text-zinc-900 font-medium">{t(`users.roles.${user.role}`)}</div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: user.name, nameKana: '' }}
        onFinish={onSubmit}
      >
        <Form.Item
          label={t('settings.profile.labelName')}
          name="name"
          rules={[{ required: true, message: t('settings.profile.nameRequired') }]}
        >
          <Input size="large" placeholder={t('settings.profile.namePlaceholder')} maxLength={100} />
        </Form.Item>

        <Form.Item label={t('settings.profile.labelNameKana')} name="nameKana">
          <Input
            size="large"
            placeholder={t('settings.profile.nameKanaPlaceholder')}
            maxLength={100}
          />
        </Form.Item>

        <div className="flex justify-end">
          <Button type="primary" htmlType="submit" loading={submitting}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </Form>
    </SettingsLayout>
  );
}
