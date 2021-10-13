import path from 'path'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { ISize } from 'image-size/dist/types/interface'
import { BaseCols } from '../types/map.js'
import { mappingCols } from './map.js'
import { SaveRemoteContentsOptions } from '../types/content.js'
import { fileNameFromURL, saveImageFile } from './media.js'

export async function saveContentFile(
  cols: BaseCols,
  dstDir: string,
  position: number
): Promise<Error | null> {
  let ret: Error | null = null

  const savePath = `${path.resolve(dstDir, cols.id)}.md`

  try {
    const { content, ...metaData } = cols
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
    const rows = res.rows.map((row) => mappingCols(row, mapConfig))
    const len = rows.length
    for (let idx = 0; idx < len; idx++) {
      const colsArray: [string, any][] = Object.entries(rows[idx])
      const colsLen = colsArray.length
      for (let colsIdx = 0; colsIdx < colsLen; colsIdx++) {
        const c = colsArray[colsIdx]
        if (
          mapConfig.cols.findIndex(
            ({ dstName, colType }) => dstName === c[0] && colType === 'image'
          ) >= 0
        ) {
          const info = await saveImageFile(
            c[1],
            dstImagesDir,
            fileNameFromURL(c[1], 'fileName'),
            imageInfo
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
      const cols: BaseCols = { ...rows[idx] }
      colsArray.forEach(([k, v]) => (cols[k] = v))
      ret = await saveContentFile(cols, dstContentsDir, idx)
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
