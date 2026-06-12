'use client'

import { useRef, useState } from 'react'
import { Image, Loader2, X } from 'lucide-react'
import { uploadImage } from '@/lib/cloudinary'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  value: string
  onChange: (url: string) => void
  folder?: string
  className?: string
  placeholder?: string
}

export function ImageUpload({ value, onChange, folder = 'wishlist', className, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Файл слишком большой (макс. 5MB)'); return }
    if (!file.type.startsWith('image/')) { toast.error('Только изображения'); return }

    setUploading(true)
    setProgress(0)
    try {
      const result = await uploadImage(file, folder, setProgress)
      onChange(result.url)
      toast.success('Фото загружено')
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка загрузки')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Preview / drop area */}
      <div
        className={cn(
          'relative rounded-xl border border-dashed border-admin-border overflow-hidden',
          'transition-colors hover:border-brand-violet/40 cursor-pointer',
          value ? 'h-32' : 'h-24 flex items-center justify-center'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault() }}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        {value ? (
          <>
            <img src={value} alt="preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity
                            flex items-center justify-center">
              <p className="text-white text-xs font-medium">Изменить фото</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange('') }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white
                         flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={12} />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="text-brand-violet animate-spin" />
            <p className="text-xs text-admin-muted">{progress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-admin-muted">
            <Image size={20} />
            <p className="text-xs">{placeholder ?? 'Нажми или перетащи фото'}</p>
          </div>
        )}
      </div>

      {/* Or paste URL */}
      <input
        className="admin-input text-xs"
        placeholder="…или вставь URL изображения"
        value={value}
        onChange={e => onChange(e.target.value)}
      />

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
