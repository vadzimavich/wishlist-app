/**
 * Cloudinary — прямая загрузка с фронтенда через unsigned preset.
 * API Secret никогда не попадает во фронтенд.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'wishlist'

export interface UploadResult {
  url: string
  publicId: string
}

/**
 * Загружает File или Blob в Cloudinary и возвращает URL
 */
export async function uploadImage(
  file: File,
  folder = 'wishlist',
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  if (!CLOUD_NAME) throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME не задан')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        resolve({ url: data.secure_url, publicId: data.public_id })
      } else {
        reject(new Error(`Cloudinary error: ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => reject(new Error('Ошибка сети при загрузке изображения'))

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)
    xhr.send(formData)
  })
}

/**
 * Компонент-обёртка: принимает File из <input type="file" />, загружает и возвращает URL
 */
export async function uploadFileInput(
  input: HTMLInputElement,
  folder?: string
): Promise<UploadResult | null> {
  const file = input.files?.[0]
  if (!file) return null

  // Максимум 5MB, только изображения
  if (file.size > 5 * 1024 * 1024) throw new Error('Файл слишком большой (макс. 5MB)')
  if (!file.type.startsWith('image/')) throw new Error('Допустимы только изображения')

  return uploadImage(file, folder)
}
