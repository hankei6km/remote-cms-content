import path from 'path'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { ISize } from 'image-size/dist/types/interface'
import { BaseFlds, MapFldsImage } from '../types/map.js'
import { mappingFlds } from './map.js'
import { SaveRemoteContentsOptions } from '../types/content.js'
import { fileNameFromURL, saveImageFile } from './media.js'

export async function saveContentFile(
  flds: BaseFlds,
  dstDir: string,
  position: number
): Promise<Error | null> {
  let ret: Error | null = null

  const savePath = `${path.resolve(dstDir, flds.id)}.md`

  try {
    const { content, ...metaData } = flds
    const file = matter.stringify(content || '', { ...metaData, position })
    await fs.writeFile(savePath, file)
  } catch (err: any) {
    ret = new Error(`saveFile error: ${err}`)
  }

  return ret
}

export function dimensionsValue(
  dimensions: ISize,
  prop: 'width' | 'height'
): number {
  let ret = 0
  if (Array.isArray(dimensions)) {
    if (dimensions.length > 0) {
      const c = dimensions[0]
      ret = c[prop] !== undefined ? c[prop] : 0
    }
  } else {
    const p = dimensions[prop]
    ret = p !== undefined ? p : 0
  }
  return ret
}

export async function saveRemoteContents({
  client,
  apiName,
  mapConfig,
  dstContentsDir,
  dstImagesDir,
  staticRoot,
  imageInfo
}: SaveRemoteContentsOptions): Promise<Error | null> {
  const staticRootLen = staticRoot.length
  let ret: Error | null = null
  try {
    const res = await client.request().api(apiName).fetch()
    const contens = res.contents.map((content) =>
      mappingFlds(content, mapConfig)
    )
    const len = contens.length
    for (let idx = 0; idx < len; idx++) {
      const fldsArray: [string, any][] = Object.entries(contens[idx])
      const fldsLen = fldsArray.length
      for (let fldsIdx = 0; fldsIdx < fldsLen; fldsIdx++) {
        const c = fldsArray[fldsIdx]
        const mapIdx = mapConfig.flds.findIndex(
          ({ dstName, fldType }) => dstName === c[0] && fldType === 'image'
        )
        if (mapIdx >= 0) {
          const map: MapFldsImage = mapConfig.flds[mapIdx] as MapFldsImage
          const info = await saveImageFile(
            c[1],
            dstImagesDir,
            fileNameFromURL(c[1], 'fileName'),
            map.setSize || false
          )
          if (staticRoot && info.url.startsWith(staticRoot)) {
            c[1] = {
              ...info,
              url: info.url.substring(staticRootLen)
            }
          } else {
            c[1] = info
          }
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
