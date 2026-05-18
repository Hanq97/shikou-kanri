import {
  App as AntdApp,
  Avatar,
  Button,
  Input,
  Spin,
  Tag,
  Tooltip,
  Upload,
  type UploadFile,
} from 'antd';
import dayjs from 'dayjs';
import { Paperclip, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { chatApi, type ChatMessageSummary } from '@/shared/api/chat.api';
import { useAuth } from '@/shared/hooks/useAuth';

interface ChatTabProps {
  projectId: string;
}

const MAX_ATTACHMENT_MB = 5;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1_048_576;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data URL prefix → just base64
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTimestamp(iso: string): string {
  const d = dayjs(iso);
  const now = dayjs();
  if (d.isSame(now, 'day')) return d.format('HH:mm');
  if (d.isSame(now.subtract(1, 'day'), 'day')) return `昨日 ${d.format('HH:mm')}`;
  return d.format('MM/DD HH:mm');
}

function MessageBubble({
  msg,
  isOwn,
  onMarkRead,
}: {
  msg: ChatMessageSummary;
  isOwn: boolean;
  onMarkRead: (id: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  useEffect(() => {
    if (!msg.isReadByMe && !isOwn) {
      onMarkRead(msg.id);
    }
  }, [msg.id, msg.isReadByMe, isOwn, onMarkRead]);

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar size={32} className="!bg-brand-500 shrink-0">
        {msg.authorName.charAt(0)}
      </Avatar>
      <div className={`flex flex-col max-w-[80%] ${isOwn ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{msg.authorName}</span>
          <span>{formatTimestamp(msg.createdAt)}</span>
        </div>
        <div
          className={`mt-1 px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
            isOwn
              ? 'bg-brand-500 text-white rounded-tr-none'
              : 'bg-zinc-100 text-zinc-900 rounded-tl-none'
          }`}
        >
          {msg.body}
        </div>
        {msg.attachments.length > 0 && (
          <div className={`mt-1.5 flex flex-wrap gap-2 ${isOwn ? 'justify-end' : ''}`}>
            {msg.attachments.map((a) => {
              const url = chatApi.attachmentUrl(msg.projectId, a.id);
              const isImage = a.mimeType.startsWith('image/');
              return isImage ? (
                <a
                  key={a.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={url}
                    alt={a.fileName}
                    className="max-h-32 max-w-[200px] rounded-lg border border-zinc-200/70 object-cover"
                  />
                </a>
              ) : (
                <a
                  key={a.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white border border-zinc-200/70 hover:bg-zinc-50 text-zinc-700"
                >
                  <Paperclip size={12} />
                  {a.fileName}
                  <span className="text-zinc-400">({(a.sizeBytes / 1024).toFixed(0)} KB)</span>
                </a>
              );
            })}
          </div>
        )}
        {isOwn && msg.readBy.length > 0 && (
          <Tooltip
            title={msg.readBy.map((r) => `${r.userName} (${formatTimestamp(r.readAt)})`).join('\n')}
          >
            <Tag color="default" className="!mt-1 !text-[10px]">
              {t('chat.readBy', { count: msg.readBy.length })}
            </Tag>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export function ChatTab({ projectId }: ChatTabProps): JSX.Element {
  const { t } = useTranslation();
  const { message: messageApi } = AntdApp.useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['chat', projectId, 'messages'],
    queryFn: () => chatApi.listMessages(projectId, { pageSize: 100 }),
    refetchOnWindowFocus: false,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const attachments = await Promise.all(
        files.map(async (f) => {
          const file = f.originFileObj as File;
          if (!file) throw new Error('No file object');
          if (file.size > MAX_ATTACHMENT_BYTES) {
            throw new Error(t('chat.attachmentTooLarge', { mb: MAX_ATTACHMENT_MB }));
          }
          const dataBase64 = await fileToBase64(file);
          return {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            dataBase64,
          };
        }),
      );
      return chatApi.createMessage(projectId, {
        body: body.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    },
    onSuccess: () => {
      setBody('');
      setFiles([]);
      void queryClient.invalidateQueries({
        queryKey: ['chat', projectId, 'messages'],
      });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || t('chat.sendFailed'));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (msgId: string) => chatApi.markRead(projectId, msgId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', projectId, 'messages'],
      });
    },
  });

  // Socket.io connection
  useEffect(() => {
    const socket = io('/chat', { withCredentials: true });
    socketRef.current = socket;
    socket.emit('join', { projectId });
    socket.on('message:new', () => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', projectId, 'messages'],
      });
    });
    socket.on('message:read', () => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', projectId, 'messages'],
      });
    });
    return () => {
      socket.emit('leave', { projectId });
      socket.disconnect();
    };
  }, [projectId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.items.length]);

  // Render messages oldest-first
  const ordered = useMemo(() => (data?.items ? [...data.items].reverse() : []), [data?.items]);

  const canSend = body.trim().length > 0 || files.length > 0;

  return (
    <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card flex flex-col h-[600px] overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <Spin />
          </div>
        ) : ordered.length === 0 ? (
          <div className="text-center text-sm text-zinc-400 py-8">{t('chat.empty')}</div>
        ) : (
          ordered.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              isOwn={m.authorId === user?.id}
              onMarkRead={(id) => markReadMutation.mutate(id)}
            />
          ))
        )}
        <div ref={scrollAnchorRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-200/70 p-3 space-y-2">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {files.map((f) => (
              <Tag
                key={f.uid}
                closable
                closeIcon={<X size={12} />}
                onClose={() => setFiles((prev) => prev.filter((x) => x.uid !== f.uid))}
                className="!flex items-center"
              >
                <Paperclip size={12} className="mr-1" />
                {f.name}
              </Tag>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Upload
            multiple
            beforeUpload={(file) => {
              if (file.size > MAX_ATTACHMENT_BYTES) {
                messageApi.error(t('chat.attachmentTooLarge', { mb: MAX_ATTACHMENT_MB }));
                return Upload.LIST_IGNORE;
              }
              setFiles((prev) => [
                ...prev,
                {
                  uid: `${Date.now()}-${file.name}`,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  originFileObj: file as never,
                },
              ]);
              return false;
            }}
            showUploadList={false}
            accept="image/*,application/pdf,text/plain"
          >
            <Button icon={<Paperclip size={16} />} type="text" />
          </Upload>
          <Input.TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('chat.composePlaceholder')}
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey && canSend) {
                e.preventDefault();
                sendMutation.mutate();
              }
            }}
          />
          <Button
            type="primary"
            icon={<Send size={16} />}
            onClick={() => sendMutation.mutate()}
            loading={sendMutation.isPending}
            disabled={!canSend}
          />
        </div>
      </div>
    </div>
  );
}
