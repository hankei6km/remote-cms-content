import path from 'path'
import { createWriteStream } from 'fs'
import axios from 'axios'
import sizeOf from 'image-size'
import { ImageInfo, ImageSrc } from '../types/media.js'

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

export function trimStaticRoot(s: string, staticRoot: string): string {
  if (staticRoot && s.startsWith(staticRoot)) {
    return s.substring(staticRoot.length)
  }
  return s
}

export async function imageInfoFromSrc(
  src: ImageSrc,
  setSize: boolean
): Promise<ImageInfo> {
  if (typeof src === 'string') {
    return {
      url: src,
      size: {},
      meta: {}
    }
  }

  return {
    url: src.url,
    size:
      src.width !== undefined && src.height !== undefined
        ? {
            width: src.width,
            height: src.height
          }
        : {},
    meta: {}
  }
}

export async function saveImageFile(
  src: ImageInfo,
  imagesDir: string,
  staticRoot: string,
  imageFileName: string,
  setSize: boolean
): Promise<ImageInfo> {
  let savePath = path.join(imagesDir, imageFileName)
  await new Promise((resolve, reject) => {
    axios
      .request({
        method: 'get',
        url: src.url,
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
            `content.saveImage error: src = ${src.url}, status = ${err.response.status}:${err.response.statusText}`
          )
        )
      })
  })

  const savePathInStatic = trimStaticRoot(savePath, staticRoot)

  if (src.size.width !== undefined && src.size.height !== undefined) {
    return {
      url: savePathInStatic,
      size: {
        width: src.size.width,
        height: src.size.height
      },
      meta: {}
    }
  }
  return {
    url: savePathInStatic,
    // TODO: orientation の処理を検討(おそらく raw などでの補正? がいると思う).
    size:
      setSize && savePath
        ? await sizeOf(savePath) // Promise が返ってくるのだが?
        : {}, // { width: undefined, height: undefined } の代わり.
    meta: {}
  }
}
