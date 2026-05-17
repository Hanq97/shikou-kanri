import { App } from 'antd';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MAX_PHOTOS = 3;
const MAX_WIDTH_PX = 800;
const JPEG_QUALITY = 0.7;
const MAX_RESIZED_BYTES = 140_000; // safety margin from BE 150KB

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function resizeAndEncode(file: File): Promise<string> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ratio = Math.min(MAX_WIDTH_PX / img.width, 1);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export function PhotoUploadField({ photos, onChange }: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // reset for re-pick
    if (photos.length + files.length > MAX_PHOTOS) {
      message.error(t('property.photo.tooMany'));
      return;
    }
    const newPhotos: string[] = [];
    for (const file of files) {
      try {
        const dataUrl = await resizeAndEncode(file);
        if (dataUrl.length > MAX_RESIZED_BYTES) {
          message.error(t('property.photo.tooLarge'));
          return;
        }
        newPhotos.push(dataUrl);
      } catch {
        message.error(t('property.photo.tooLarge'));
        return;
      }
    }
    onChange([...photos, ...newPhotos]);
  }

  function remove(idx: number): void {
    onChange(photos.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <div
            key={`${i}-${photo.slice(0, 20)}`}
            className="relative aspect-square border border-zinc-200/70 rounded-lg overflow-hidden bg-zinc-50"
          >
            <img src={photo} className="w-full h-full object-cover" alt={`Property ${i + 1}`} />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white shadow grid place-items-center text-zinc-700 hover:text-red-600 cursor-pointer border-0"
              aria-label="Remove"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="aspect-square border-2 border-dashed border-zinc-300 rounded-lg grid place-items-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />
            <div className="text-center text-zinc-500">
              <Plus size={20} className="mx-auto" />
              <div className="text-xs mt-1">
                {photos.length}/{MAX_PHOTOS}
              </div>
            </div>
          </label>
        )}
      </div>
      <p className="m-0 mt-2 text-xs text-zinc-500">{t('property.photo.uploadHint')}</p>
    </div>
  );
}
