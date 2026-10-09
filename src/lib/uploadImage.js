import { supabase } from './supabase'

const BUCKET = 'images'

// Achica la imagen en el canvas (igual que antes) pero en vez de guardarla
// como base64 dentro de la fila de la base, la sube a Supabase Storage y
// devuelve la URL pública. Así el navegador la cachea como cualquier imagen
// de internet, en vez de volver a bajarla entera cada vez que se consulta
// la fila (lo que estaba disparando el consumo de Egress del proyecto).
export function compressAndUploadImage(file, { folder, maxDim = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onloadend = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error('No se pudo procesar la imagen')); return }
          const path = `${folder}/${crypto.randomUUID()}.jpg`
          const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
          })
          if (error) { reject(error); return }
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
          resolve(data.publicUrl)
        }, 'image/jpeg', quality)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
