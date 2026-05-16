import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Spin } from 'antd';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { propertiesApi, type PropertySummary } from '@/shared/api/properties.api';
import { PropertyCard } from './PropertyCard';
import { PropertyFormModal } from './PropertyFormModal';

interface Props {
  customerId: string;
}

export function PropertyListTab({ customerId }: Props): JSX.Element {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertySummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'properties'],
    queryFn: () => propertiesApi.listByCustomer(customerId),
    enabled: Boolean(customerId),
  });

  function openCreate(): void {
    setEditingProperty(null);
    setModalOpen(true);
  }

  function openEdit(p: PropertySummary): void {
    setEditingProperty(p);
    setModalOpen(true);
  }

  function handleSuccess(): void {
    setModalOpen(false);
    setEditingProperty(null);
    qc.invalidateQueries({ queryKey: ['customers', customerId, 'properties'] });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    );
  }

  const properties = data ?? [];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
          {t('property.addButton')}
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-12">
          <Empty description={t('property.empty')}>
            <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
              {t('property.addButton')}
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onEdit={() => openEdit(p)}
              onChanged={handleSuccess}
            />
          ))}
        </div>
      )}

      <PropertyFormModal
        open={modalOpen}
        customerId={customerId}
        property={editingProperty}
        onClose={() => {
          setModalOpen(false);
          setEditingProperty(null);
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
