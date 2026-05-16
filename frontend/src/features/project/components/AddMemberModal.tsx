import { useQuery } from '@tanstack/react-query';
import { App, Form, Modal, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import { projectMembersApi, type ProjectMemberRole } from '@/shared/api/projects.api';
import { usersApi } from '@/shared/api/users.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

const ROLES: ProjectMemberRole[] = ['owner', 'contributor', 'inspector', 'invited_worker'];

interface Props {
  open: boolean;
  projectId: string;
  excludeUserIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddMemberModal({
  open,
  projectId,
  excludeUserIds,
  onClose,
  onSuccess,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectMemberRole>('contributor');
  const [submitting, setSubmitting] = useState(false);

  const { data: usersResp } = useQuery({
    queryKey: ['users', 'picker'],
    queryFn: () => usersApi.list({ status: 'active', pageSize: 100, sortBy: 'name' }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setUserId(null);
      setRole('contributor');
    }
  }, [open]);

  const userOptions = useMemo(
    () =>
      (usersResp?.data ?? [])
        .filter((u) => !excludeUserIds.includes(u.id))
        .map((u) => ({
          value: u.id,
          label: `${u.name} (${u.email}) · ${t(`users.roles.${u.role}`)}`,
        })),
    [usersResp, excludeUserIds, t],
  );

  async function submit(): Promise<void> {
    if (!userId) return;
    setSubmitting(true);
    try {
      await projectMembersApi.add(projectId, userId, role);
      message.success(t('project.members.messages.added'));
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
      title={t('project.members.addTitle')}
      onCancel={onClose}
      onOk={submit}
      okText={t('project.members.submit')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !userId, loading: submitting }}
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item label={t('project.members.addUserLabel')} required>
          <Select
            showSearch
            value={userId}
            onChange={(v) => setUserId(v)}
            placeholder={t('project.members.addUserPlaceholder')}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={userOptions}
            notFoundContent={null}
          />
        </Form.Item>
        <Form.Item label={t('project.members.addRoleLabel')} required>
          <Select
            value={role}
            onChange={(v: ProjectMemberRole) => setRole(v)}
            options={ROLES.map((r) => ({
              value: r,
              label: t(`project.memberRole.${r}`),
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
