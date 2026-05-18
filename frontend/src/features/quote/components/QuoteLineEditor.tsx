import { Button, Checkbox, Grid, Input, InputNumber, Tooltip } from 'antd';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormSetValue,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { formatJpy } from '@/shared/utils/format';
import type { QuoteFormValues } from '../schemas/quote.schema';
import { computeQuoteTotals } from '../utils/quote-totals';
import { UnitPriceAutocomplete } from './UnitPriceAutocomplete';

interface Props {
  control: Control<QuoteFormValues>;
  setValue: UseFormSetValue<QuoteFormValues>;
}

const DEFAULT_LINE: QuoteFormValues['lines'][number] = {
  itemName: '',
  unit: '式',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0.1,
  isOptional: false,
};

const INTEGER_UNITS = new Set(['式', '個', '本', '枚', '台', '箇所', '日', '畳', '部屋']);

function qtyStepFor(unit: string | undefined | null): number {
  if (!unit) return 1;
  return INTEGER_UNITS.has(unit) ? 1 : 0.1;
}

function qtyPrecisionFor(unit: string | undefined | null): number {
  if (!unit) return 0;
  return INTEGER_UNITS.has(unit) ? 0 : 2;
}

export function QuoteLineEditor({ control, setValue }: Props): JSX.Element {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.sm;

  const { fields, append, remove, move } = useFieldArray({ control, name: 'lines' });

  const watched = useWatch({ control, name: 'lines' }) ?? [];
  const totals = computeQuoteTotals(watched as QuoteFormValues['lines']);

  function addLine(): void {
    append({ ...DEFAULT_LINE });
  }

  function moveUp(idx: number): void {
    if (idx > 0) move(idx, idx - 1);
  }

  function moveDown(idx: number): void {
    if (idx < fields.length - 1) move(idx, idx + 1);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold text-zinc-800">{t('quote.form.linesTitle')}</h2>
        <Button type="dashed" icon={<Plus size={14} />} onClick={addLine}>
          {t('quote.form.addLine')}
        </Button>
      </div>

      {isDesktop ? (
        <DesktopTable
          fields={fields}
          control={control}
          setValue={setValue}
          remove={remove}
          moveUp={moveUp}
          moveDown={moveDown}
        />
      ) : (
        <MobileCards
          fields={fields}
          control={control}
          setValue={setValue}
          remove={remove}
          moveUp={moveUp}
          moveDown={moveDown}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-200">
        <Stat label={t('quote.detail.labelAmountSubtotal')} value={formatJpy(totals.subtotal)} />
        <Stat label={t('quote.detail.labelAmountTax')} value={formatJpy(totals.tax)} />
        <Stat
          label={t('quote.detail.labelAmountTotal')}
          value={formatJpy(totals.total)}
          highlight
        />
        <Stat
          label={t('quote.form.optionalSubtotal')}
          value={formatJpy(totals.optionalSubtotal)}
          muted
        />
      </div>
    </div>
  );
}

interface RowsProps {
  fields: { id: string }[];
  control: Control<QuoteFormValues>;
  setValue: UseFormSetValue<QuoteFormValues>;
  remove: (idx: number) => void;
  moveUp: (idx: number) => void;
  moveDown: (idx: number) => void;
}

function DesktopTable({
  fields,
  control,
  setValue,
  remove,
  moveUp,
  moveDown,
}: RowsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs text-zinc-500 border-b border-zinc-200">
            <th className="text-left py-2 pr-2 w-10">#</th>
            <th className="text-left py-2 pr-2 w-64">{t('quote.line.itemNameAndDescription')}</th>
            <th className="text-right py-2 pr-2 w-20">{t('quote.line.quantity')}</th>
            <th className="text-left py-2 pr-2 w-16">{t('quote.line.unit')}</th>
            <th className="text-right py-2 pr-2 w-28">{t('quote.line.unitPrice')}</th>
            <th className="text-right py-2 pr-2 w-20">{t('quote.line.taxRatePercent')}</th>
            <th className="text-right py-2 pr-2 w-28">{t('quote.line.amount')}</th>
            <th className="text-center py-2 pr-2 w-16">{t('quote.line.optional')}</th>
            <th className="py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, idx) => (
            <LineDesktopRow
              key={field.id}
              idx={idx}
              control={control}
              setValue={setValue}
              onRemove={() => remove(idx)}
              onUp={() => moveUp(idx)}
              onDown={() => moveDown(idx)}
              canUp={idx > 0}
              canDown={idx < fields.length - 1}
            />
          ))}
        </tbody>
      </table>
      {fields.length === 0 && (
        <div className="text-center py-6 text-sm text-zinc-400">{t('quote.form.noLines')}</div>
      )}
    </div>
  );
}

interface RowProps {
  idx: number;
  control: Control<QuoteFormValues>;
  setValue: UseFormSetValue<QuoteFormValues>;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
}

function applyMasterPick(
  setValue: UseFormSetValue<QuoteFormValues>,
  idx: number,
  up: { id: string; itemName: string; unit: string; defaultUnitPrice: string },
): void {
  setValue(`lines.${idx}.itemName`, up.itemName, { shouldDirty: true });
  setValue(`lines.${idx}.unit`, up.unit, { shouldDirty: true });
  setValue(`lines.${idx}.unitPrice`, Number(up.defaultUnitPrice), { shouldDirty: true });
  setValue(`lines.${idx}.unitPriceMasterId`, up.id, { shouldDirty: true });
}

function LineDesktopRow({
  idx,
  control,
  setValue,
  onRemove,
  onUp,
  onDown,
  canUp,
  canDown,
}: RowProps): JSX.Element {
  const { t } = useTranslation();
  const line = useWatch({ control, name: `lines.${idx}` });
  const amount = Math.round(Number(line?.quantity ?? 0) * Number(line?.unitPrice ?? 0));

  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="py-2 pr-2 text-zinc-500 pt-3">{idx + 1}</td>
      <td className="py-2 pr-2 space-y-1">
        <Controller
          control={control}
          name={`lines.${idx}.itemName`}
          render={({ field }) => (
            <Input {...field} placeholder={t('quote.line.itemName')} size="small" />
          )}
        />
        <Controller
          control={control}
          name={`lines.${idx}.description`}
          render={({ field }) => (
            <Input.TextArea
              {...field}
              value={field.value ?? ''}
              placeholder={t('quote.line.descriptionPlaceholder')}
              autoSize={{ minRows: 1, maxRows: 3 }}
              size="small"
            />
          )}
        />
        <UnitPriceAutocomplete
          className="w-full"
          value={line?.unitPriceMasterId ?? null}
          onPick={(up) => applyMasterPick(setValue, idx, up)}
          onClear={() => setValue(`lines.${idx}.unitPriceMasterId`, '', { shouldDirty: true })}
        />
      </td>
      <td className="py-2 pr-2 text-right">
        <Controller
          control={control}
          name={`lines.${idx}.quantity`}
          render={({ field }) => (
            <InputNumber
              className="w-full"
              size="small"
              min={0}
              step={qtyStepFor(line?.unit)}
              precision={qtyPrecisionFor(line?.unit)}
              value={field.value}
              onChange={(v) => field.onChange(Number(v ?? 0))}
            />
          )}
        />
      </td>
      <td className="py-2 pr-2">
        <Controller
          control={control}
          name={`lines.${idx}.unit`}
          render={({ field }) => <Input {...field} size="small" placeholder="式" />}
        />
      </td>
      <td className="py-2 pr-2 text-right">
        <Controller
          control={control}
          name={`lines.${idx}.unitPrice`}
          render={({ field }) => (
            <InputNumber
              className="w-full"
              size="small"
              min={0}
              step={1000}
              value={field.value}
              onChange={(v) => field.onChange(Math.round(Number(v ?? 0)))}
            />
          )}
        />
      </td>
      <td className="py-2 pr-2 text-right">
        <Controller
          control={control}
          name={`lines.${idx}.taxRate`}
          render={({ field }) => (
            <InputNumber
              className="w-full"
              size="small"
              min={0}
              max={1}
              step={0.01}
              value={field.value}
              onChange={(v) => field.onChange(Number(v ?? 0))}
              formatter={(v) => `${Math.round(Number(v ?? 0) * 100)}%`}
              parser={(v) => Number((v ?? '').replace('%', '')) / 100}
            />
          )}
        />
      </td>
      <td className="py-2 pr-2 text-right pt-3">
        <span className="font-mono text-sm">{formatJpy(amount)}</span>
      </td>
      <td className="py-2 pr-2 text-center pt-3">
        <Controller
          control={control}
          name={`lines.${idx}.isOptional`}
          render={({ field }) => (
            <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )}
        />
      </td>
      <td className="py-2 pt-3">
        <div className="flex items-center gap-1">
          <Tooltip title={t('common.moveUp')}>
            <button
              type="button"
              disabled={!canUp}
              onClick={onUp}
              className="w-7 h-7 rounded grid place-items-center text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer"
            >
              <ChevronUp size={14} />
            </button>
          </Tooltip>
          <Tooltip title={t('common.moveDown')}>
            <button
              type="button"
              disabled={!canDown}
              onClick={onDown}
              className="w-7 h-7 rounded grid place-items-center text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer"
            >
              <ChevronDown size={14} />
            </button>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <button
              type="button"
              onClick={onRemove}
              className="w-7 h-7 rounded grid place-items-center text-red-500 hover:bg-red-50 bg-transparent border-0 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

function MobileCards({
  fields,
  control,
  setValue,
  remove,
  moveUp,
  moveDown,
}: RowsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {fields.map((field, idx) => (
        <LineMobileCard
          key={field.id}
          idx={idx}
          control={control}
          setValue={setValue}
          onRemove={() => remove(idx)}
          onUp={() => moveUp(idx)}
          onDown={() => moveDown(idx)}
          canUp={idx > 0}
          canDown={idx < fields.length - 1}
        />
      ))}
      {fields.length === 0 && (
        <div className="text-center py-6 text-sm text-zinc-400">{t('quote.form.noLines')}</div>
      )}
    </div>
  );
}

function LineMobileCard({
  idx,
  control,
  setValue,
  onRemove,
  onUp,
  onDown,
  canUp,
  canDown,
}: RowProps): JSX.Element {
  const { t } = useTranslation();
  const line = useWatch({ control, name: `lines.${idx}` });
  const amount = Math.round(Number(line?.quantity ?? 0) * Number(line?.unitPrice ?? 0));

  return (
    <div className="border border-zinc-200 rounded-lg p-3 space-y-2 bg-zinc-50/40">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">#{idx + 1}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canUp}
            onClick={onUp}
            className="w-8 h-8 rounded grid place-items-center text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 bg-transparent border-0 cursor-pointer"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            disabled={!canDown}
            onClick={onDown}
            className="w-8 h-8 rounded grid place-items-center text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 bg-transparent border-0 cursor-pointer"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 rounded grid place-items-center text-red-500 hover:bg-red-50 bg-transparent border-0 cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <Controller
        control={control}
        name={`lines.${idx}.itemName`}
        render={({ field }) => <Input {...field} placeholder={t('quote.line.itemName')} />}
      />
      <Controller
        control={control}
        name={`lines.${idx}.description`}
        render={({ field }) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ''}
            placeholder={t('quote.line.descriptionPlaceholder')}
            autoSize={{ minRows: 1, maxRows: 3 }}
          />
        )}
      />
      <div className="grid grid-cols-3 gap-2">
        <Controller
          control={control}
          name={`lines.${idx}.quantity`}
          render={({ field }) => (
            <InputNumber
              className="w-full"
              addonBefore={t('quote.line.qtyShort')}
              min={0}
              step={qtyStepFor(line?.unit)}
              precision={qtyPrecisionFor(line?.unit)}
              value={field.value}
              onChange={(v) => field.onChange(Number(v ?? 0))}
            />
          )}
        />
        <Controller
          control={control}
          name={`lines.${idx}.unit`}
          render={({ field }) => <Input {...field} placeholder="式" />}
        />
        <Controller
          control={control}
          name={`lines.${idx}.taxRate`}
          render={({ field }) => (
            <InputNumber
              className="w-full"
              min={0}
              max={1}
              step={0.01}
              value={field.value}
              onChange={(v) => field.onChange(Number(v ?? 0))}
              formatter={(v) => `${Math.round(Number(v ?? 0) * 100)}%`}
              parser={(v) => Number((v ?? '').replace('%', '')) / 100}
            />
          )}
        />
      </div>
      <Controller
        control={control}
        name={`lines.${idx}.unitPrice`}
        render={({ field }) => (
          <InputNumber
            className="w-full"
            addonBefore="¥"
            min={0}
            step={1000}
            value={field.value}
            onChange={(v) => field.onChange(Math.round(Number(v ?? 0)))}
          />
        )}
      />
      <UnitPriceAutocomplete
        className="w-full"
        value={line?.unitPriceMasterId ?? null}
        onPick={(up) => applyMasterPick(setValue, idx, up)}
        onClear={() => setValue(`lines.${idx}.unitPriceMasterId`, '', { shouldDirty: true })}
      />
      <div className="flex items-center justify-between pt-1">
        <Controller
          control={control}
          name={`lines.${idx}.isOptional`}
          render={({ field }) => (
            <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
              {t('quote.line.optional')}
            </Checkbox>
          )}
        />
        <span className="font-mono text-sm text-zinc-900">{formatJpy(amount)}</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}): JSX.Element {
  return (
    <div
      className={`${
        highlight ? 'bg-brand-50' : muted ? 'bg-zinc-50' : 'bg-white'
      } border border-zinc-200/70 rounded-lg p-3`}
    >
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={`mt-0.5 font-mono ${
          highlight ? 'text-lg font-semibold text-brand-700' : 'text-zinc-800'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
