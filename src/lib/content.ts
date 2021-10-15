import path from 'path'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { ISize } from 'image-size/dist/types/interface'
import { BaseFlds, MapFldsImage } from '../types/map.js'
import { isImageDownload, mappingFlds } from './map.js'
import { SaveRemoteContentsOptions } from '../types/content.js'
import { fileNameFromURL, imageInfoFromSrc, saveImageFile } from './media.js'

export async function saveContentFile(
  flds: BaseFlds,
  dstDir: string,
  position: number
): Promise<Error | null> {
  let ret: Error | null = null

  const savePath = `${path.resolve(dstDir, flds.id)}.md`

  try {
    const { content, ...metaData } = flds
    // content は string を期待しているが、異なる場合もある、かな.
    const file = matter.stringify(content !== undefined ? `${content}` : '', {
      ...metaData,
      position
    })
    await fs.writeFile(savePath, file)
  } catch (err: any) {
    ret = new Error(`saveFile error: ${err}`)
  }

  return ret
}

// size が array のときは無視するようにしたので使わない.
// export function dimensionsValue(
//   dimensions: ISize,
//   prop: 'width' | 'height'
// ): number {
//   let ret = 0
//   if (Array.isArray(dimensions)) {
//     if (dimensions.length > 0) {
//       const c = dimensions[0]
//       ret = c[prop] !== undefined ? c[prop] : 0
//     }
//   } else {
//     const p = dimensions[prop]
//     ret = p !== undefined ? p : 0
//   }
//   return ret
// }

export async function saveRemoteContents({
  client,
  apiName,
  mapConfig,
  dstContentsDir,
  dstImagesDir,
  staticRoot
}: SaveRemoteContentsOptions): Promise<Error | null> {
  let ret: Error | null = null
  try {
    const res = await client.request().api(apiName).fetch()
    const contens = res.contents.map((content) =>
      mappingFlds(content, mapConfig)
    )
    // 途中で field の入れ替えがごちゃっとしている.
    // 新しい配列に map する処理に変更を検討.
    const len = contens.length
    for (let idx = 0; idx < len; idx++) {
      const fldsArray: [string, any][] = Object.entries(contens[idx])
      const fldsLen = fldsArray.length
      for (let fldsIdx = 0; fldsIdx < fldsLen; fldsIdx++) {
        const c = fldsArray[fldsIdx]
        const mapFld: MapFldsImage | undefined = (() => {
          const mapIdx = mapConfig.flds.findIndex(
            ({ dstName, fldType }) => dstName === c[0] && fldType === 'image'
          )
          if (mapIdx >= 0) {
            return mapConfig.flds[mapIdx] as MapFldsImage
          }
          return
        })()
        if (mapFld) {
          let imageInfo = await imageInfoFromSrc(c[1], mapFld.setSize || false)
          if (isImageDownload(mapConfig, imageInfo)) {
            imageInfo = await saveImageFile(
              imageInfo,
              dstImagesDir,
              staticRoot,
              fileNameFromURL(imageInfo.url, 'fileName'),
              mapFld.setSize || false
            )
          }
          c[1] = imageInfo
        }
      }
      const flds: BaseFlds = { ...contens[idx] }
      fldsArray.forEach(([k, v]) => (flds[k] = v))
      ret = await saveContentFile(flds, dstContentsDir, idx)
      if (ret) {
        break
      }
    }
  } catch (err: any) {
    // console.log('err:', err);
    ret = new Error(`saveRemoteContents error: ${err}`)
  }
  return ret
}
