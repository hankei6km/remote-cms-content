import path from 'path'
import { createWriteStream } from 'fs'
import axios from 'axios'
import sizeOf from 'image-size'
import { ImageInfo } from '../types/media'

export function fileNameFromURL(src: string, fieldName: string): string {
  // client 側の処理にする？
  let fileName = ''
  try {
    if (fieldName) {
      const q = new URLSearchParams(new URL(src).searchParams)
      fileName = path.basename(q.get(fieldName) || '')
    } else {
      const u = new URL(src)
      fileName = path.basename(u.pathname)
    }
  } catch (err: any) {
    throw new Error(
      `fileNameFromURL: src=${src},filedName=${fieldName}: ${err}`
    )
  }
  if (fileName === '') {
    throw new Error(
      `fileNameFromURL: src=${src},filedName=${fieldName}: image filename is blank`
    )
  }
  return fileName
}

export async function saveImageFile(
  src: string,
  imagesDir: string,
  imageFileName: string,
  setSize: boolean
): Promise<ImageInfo> {
  const savePath = path.join(imagesDir, imageFileName)
  await new Promise((resolve, reject) => {
    axios
      .request({
        method: 'get',
        url: src,
        responseType: 'stream'
      })
      .then((response) => {
        const w = createWriteStream(savePath)
        w.on('close', () => resolve(savePath))
        w.on('error', (err) => reject(err))
        response.data.pipe(w)
      })
      .catch((err) => {
        reject(
          new Error(
            `content.saveImage error: src = ${src}, status = ${err.response.status}:${err.response.statusText}`
          )
        )
      })
  })

  return {
    url: savePath,
    // TODO: orientation の処理を検討(おそらく raw などでの補正? がいると思う).
    size:
      setSize && savePath
        ? await sizeOf(savePath) // Promise が返ってくるのだが?
        : {}, // { width: undefined, height: undefined } の代わり.
    meta: {}
  }
}
