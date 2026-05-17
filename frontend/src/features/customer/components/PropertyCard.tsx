import { App, Button, Dropdown, type MenuProps } from 'antd';
import dayjs from 'dayjs';
import { Calendar, Edit, Home, MoreVertical, Ruler, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import { propertiesApi, type PropertySummary } from '@/shared/api/properties.api';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface Props {
  property: PropertySummary;
  onEdit: () => void;
  onChanged: () => void;
}

export function PropertyCard({ property, onEdit, onChanged }: Props): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { message, modal } = App.useApp();

  const canDelete = user?.role === 'system_admin' || user?.role === 'manager';

  function confirmDelete(): void {
    modal.confirm({
      title: t('property.confirms.deleteTitle'),
      content: t('property.confirms.deleteContent'),
      okText: t('property.confirms.deleteOk'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await propertiesApi.softDelete(property.id);
          message.success(t('property.messages.deleted'));
          onChanged();
        } catch (err) {
          message.error(mapErrorMessage(extractApiError(err)));
        }
      },
    });
  }

  const menu: MenuProps['items'] = [
    { key: 'edit', icon: <Edit size={14} />, label: t('common.edit'), onClick: onEdit },
  ];
  if (canDelete) {
    menu.push({ type: 'divider' });
    menu.push({
      key: 'delete',
      icon: <Trash2 size={14} />,
      label: t('common.delete'),
      danger: true,
      onClick: confirmDelete,
    });
  }

  return (
    <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
      {property.photoUrls.length > 0 ? (
        <div className="aspect-video bg-zinc-100">
          <img src={property.photoUrls[0]} className="w-full h-full object-cover" alt="Property" />
        </div>
      ) : (
        <div className="aspect-video bg-zinc-50 grid place-items-center text-zinc-300">
          <Home size={32} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 bg-zinc-50 text-zinc-700 ring-zinc-200">
                {t(`property.type.${property.propertyType}`)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 bg-zinc-50 text-zinc-600 ring-zinc-200">
                {t(`property.structure.${property.structure}`)}
              </span>
            </div>
            <p className="m-0 text-sm font-medium text-zinc-900 line-clamp-2">{property.address}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              {property.yearBuilt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} />
                  {property.yearBuilt}年
                </span>
              )}
              {property.handoverDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} />
                  {t('property.fields.handoverDate')}:{' '}
                  {dayjs(property.handoverDate).format('YYYY/MM/DD')}
                </span>
              )}
              {property.floorAreaSqm && (
                <span className="inline-flex items-center gap-1">
                  <Ruler size={12} />
                  {property.floorAreaSqm}m²
                </span>
              )}
            </div>
          </div>
          <Dropdown menu={{ items: menu }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              icon={<MoreVertical size={16} />}
              aria-label={t('common.actions')}
            />
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
