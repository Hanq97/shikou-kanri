import { App, Form, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import { savedSearchesApi, type ListProjectsParams } from '@/shared/api/projects.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface Props {
  open: boolean;
  filters: ListProjectsParams;
  onClose: () => void;
  onSuccess: () => void;
}

export function SaveSearchModal({ open, filters, onClose, onSuccess }: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      message.error(t('project.savedSearches.nameRequired'));
      return;
    }
    setSubmitting(true);
    try {
      // Strip pagination + sort from saved filter
      const { page: _p, pageSize: _ps, sortBy: _sb, sortOrder: _so, ...rest } = filters;
      void _p;
      void _ps;
      void _sb;
      void _so;
      await savedSearchesApi.create({
        name: trimmed,
        scope: 'projects',
        filterJson: rest as Record<string, unknown>,
      });
      message.success(t('project.savedSearches.saved'));
      onSuccess();
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={t('project.savedSearches.saveTitle')}
      onCancel={onClose}
      onOk={submit}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item label={t('project.savedSearches.nameLabel')} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('project.savedSearches.namePlaceholder')}
            maxLength={100}
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
