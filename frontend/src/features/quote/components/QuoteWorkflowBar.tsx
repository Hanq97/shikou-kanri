import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Input, Modal, Tooltip, type MenuProps } from 'antd';
import {
  Ban,
  Check,
  Copy,
  Download,
  GitBranch,
  MoreVertical,
  Send,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import { quotesApi, type QuoteDetail } from '@/shared/api/quotes.api';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface Props {
  quote: QuoteDetail;
}

type PromptKind = 'reject' | 'delete' | 'version';

export function QuoteWorkflowBar({ quote }: Props): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState<PromptKind | null>(null);
  const [reason, setReason] = useState('');

  const role = user?.role;
  const isAdmin = role === 'system_admin';
  const isManagerOrAdmin = isAdmin || role === 'manager';
  const isStaff = isManagerOrAdmin || role === 'employee';

  function invalidate(): void {
    qc.invalidateQueries({ queryKey: ['quotes'] });
  }

  const submitMutation = useMutation({
    mutationFn: () => quotesApi.submit(quote.id),
    onSuccess: () => {
      message.success(t('quote.actions.submitOk'));
      invalidate();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const approveMutation = useMutation({
    mutationFn: () => quotesApi.approve(quote.id),
    onSuccess: () => {
      message.success(t('quote.actions.approveOk'));
      invalidate();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const rejectMutation = useMutation({
    mutationFn: (r: string) => quotesApi.reject(quote.id, r),
    onSuccess: () => {
      message.success(t('quote.actions.rejectOk'));
      setPrompt(null);
      setReason('');
      invalidate();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const sendMutation = useMutation({
    mutationFn: () => quotesApi.send(quote.id),
    onSuccess: () => {
      message.success(t('quote.actions.sendOk'));
      invalidate();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const wonMutation = useMutation({
    mutationFn: () => quotesApi.won(quote.id),
    onSuccess: () => {
      message.success(t('quote.actions.wonOk'));
      invalidate();
      modal.confirm({
        title: t('quote.actions.wonGoToProjectTitle'),
        content: t('quote.actions.wonGoToProjectContent'),
        okText: t('quote.actions.wonGoToProjectOk'),
        cancelText: t('common.close'),
        onOk: () => navigate(`/projects/${quote.projectId}`),
      });
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const lostMutation = useMutation({
    mutationFn: () => quotesApi.lost(quote.id),
    onSuccess: () => {
      message.success(t('quote.actions.lostOk'));
      invalidate();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const cloneMutation = useMutation({
    mutationFn: () => quotesApi.clone(quote.id),
    onSuccess: (q) => {
      message.success(t('quote.actions.cloneOk'));
      invalidate();
      navigate(`/estimates/${q.id}/edit`);
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const deleteMutation = useMutation({
    mutationFn: (r: string) => quotesApi.softDelete(quote.id, r),
    onSuccess: () => {
      message.success(t('quote.messages.deleted'));
      invalidate();
      setPrompt(null);
      setReason('');
      navigate('/estimates');
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const versionMutation = useMutation({
    mutationFn: (r: string) =>
      quotesApi.createVersion(quote.id, {
        reason: r,
        lines: quote.lines.map((l) => ({
          sortOrder: l.sortOrder,
          category: l.category ?? undefined,
          itemName: l.itemName,
          description: l.description ?? undefined,
          unit: l.unit,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate),
          isOptional: l.isOptional,
          unitPriceMasterId: l.unitPriceMasterId ?? undefined,
        })),
      }),
    onSuccess: (q) => {
      message.success(t('quote.actions.versionOk'));
      invalidate();
      setPrompt(null);
      setReason('');
      navigate(`/estimates/${q.id}/edit`);
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  function openPdf(): void {
    window.open(quotesApi.pdfUrl(quote.id), '_blank', 'noopener');
  }

  function actionsByStatus(): JSX.Element[] {
    const out: JSX.Element[] = [];

    if (quote.status === 'draft' && isStaff) {
      out.push(
        <Button
          key="submit"
          type="primary"
          icon={<Send size={14} />}
          loading={submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {t('quote.actions.submit')}
        </Button>,
      );
    }

    if ((quote.status === 'submitted' || quote.status === 'pending_admin') && isStaff) {
      const canApprove = quote.status === 'pending_admin' ? isAdmin : isManagerOrAdmin || isAdmin;
      if (canApprove) {
        out.push(
          <Button
            key="approve"
            type="primary"
            icon={<Check size={14} />}
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate()}
          >
            {t('quote.actions.approve')}
          </Button>,
        );
        out.push(
          <Button key="reject" danger icon={<X size={14} />} onClick={() => setPrompt('reject')}>
            {t('quote.actions.reject')}
          </Button>,
        );
      }
    }

    if (quote.status === 'approved' && isStaff) {
      out.push(
        <Button
          key="send"
          type="primary"
          icon={<Send size={14} />}
          loading={sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
        >
          {t('quote.actions.send')}
        </Button>,
      );
    }

    if (quote.status === 'sent' && isStaff) {
      out.push(
        <Button
          key="won"
          type="primary"
          icon={<Trophy size={14} />}
          loading={wonMutation.isPending}
          onClick={() => wonMutation.mutate()}
        >
          {t('quote.actions.won')}
        </Button>,
      );
      out.push(
        <Button
          key="lost"
          icon={<Ban size={14} />}
          loading={lostMutation.isPending}
          onClick={() => lostMutation.mutate()}
        >
          {t('quote.actions.lost')}
        </Button>,
      );
      out.push(
        <Button key="version" icon={<GitBranch size={14} />} onClick={() => setPrompt('version')}>
          {t('quote.actions.version')}
        </Button>,
      );
    }

    return out;
  }

  const moreItems: MenuProps['items'] = [
    {
      key: 'clone',
      icon: <Copy size={14} />,
      label: t('quote.actions.clone'),
      onClick: () => cloneMutation.mutate(),
    },
  ];
  if (isAdmin && quote.status !== 'won' && quote.status !== 'sent') {
    moreItems.push({ type: 'divider' });
    moreItems.push({
      key: 'delete',
      icon: <Trash2 size={14} />,
      label: t('common.delete'),
      danger: true,
      onClick: () => setPrompt('delete'),
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {actionsByStatus()}
        <Tooltip title={t('quote.actions.pdf')}>
          <Button icon={<Download size={14} />} onClick={openPdf}>
            {t('quote.actions.pdf')}
          </Button>
        </Tooltip>
        <Dropdown menu={{ items: moreItems }} trigger={['click']} placement="bottomRight">
          <Button icon={<MoreVertical size={14} />} aria-label={t('common.actions')} />
        </Dropdown>
      </div>

      <Modal
        open={prompt !== null}
        title={
          prompt === 'reject'
            ? t('quote.actions.rejectTitle')
            : prompt === 'delete'
              ? t('quote.confirms.deleteTitle')
              : t('quote.actions.versionTitle')
        }
        okText={
          prompt === 'reject'
            ? t('quote.actions.reject')
            : prompt === 'delete'
              ? t('quote.confirms.deleteOk')
              : t('quote.actions.version')
        }
        okType={prompt === 'delete' ? 'danger' : 'primary'}
        okButtonProps={{
          loading:
            rejectMutation.isPending || deleteMutation.isPending || versionMutation.isPending,
        }}
        onOk={() => {
          if (reason.trim().length < 5) {
            message.error(t('quote.errors.reasonMin5'));
            return;
          }
          if (prompt === 'reject') rejectMutation.mutate(reason.trim());
          else if (prompt === 'delete') deleteMutation.mutate(reason.trim());
          else if (prompt === 'version') versionMutation.mutate(reason.trim());
        }}
        onCancel={() => {
          setPrompt(null);
          setReason('');
        }}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <div className="space-y-3">
          <p className="m-0 text-sm text-zinc-600">
            {prompt === 'reject'
              ? t('quote.actions.rejectHelp')
              : prompt === 'delete'
                ? t('quote.confirms.deleteContent', { number: quote.quoteNumber })
                : t('quote.actions.versionHelp')}
          </p>
          <Input.TextArea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('quote.actions.reasonPlaceholder')}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
