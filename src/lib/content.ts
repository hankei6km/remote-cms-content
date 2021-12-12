import path from 'path'
import { writeFile } from 'fs/promises'
import matter from 'gray-matter'
import {
  MappedFlds,
  defaultPosition,
  MapConfig,
  MapFldsImage
} from '../types/map.js'
import { fileNameFromURL, isImageDownload, mappingFlds } from './map.js'
import { TransformContent } from '../types/client.js'
import { SaveRemoteContentOptions } from '../types/content.js'
import { imageInfoFromSrc, saveImageFile } from './media.js'
import { printInfo } from './log.js'

export async function saveContentFile(
  flds: MappedFlds,
  dstDir: string,
  position: { fldName: string; value: number }
): Promise<Error | null> {
  let ret: Error | null = null

  const savePath = `${path.resolve(dstDir, flds.id)}.md`

  try {
    const { content, ...metaData } = flds
    if (typeof metaData === 'object') {
      Object.entries(metaData).forEach(([k, v]) => {
        if (v === undefined) {
          delete metaData[k]
        }
      })
    }
    // content は string を期待しているが、異なる場合もある、かな.
    const file = matter.stringify(content !== undefined ? `${content}` : '', {
      ...metaData,
      [position.fldName]: position.value
    })
    await writeFile(savePath, file)
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

export function transformContent(m: MapConfig): TransformContent {
  const ret: TransformContent = (content, arrayPath) => {
    const valueType = typeof content
    if (
      (valueType === 'number' ||
        valueType === 'string' ||
        valueType === 'object') &&
      m.transformJsonata
    ) {
      try {
        const ret = m.transformJsonata.evaluate(content)
        let arrayItem = ret
        let arrayPathLabel = 'resutl'
        if (arrayPath) {
          arrayPath.forEach((p) => {
            if (typeof arrayItem === 'object' && arrayItem.hasOwnProperty(p)) {
              arrayItem = arrayItem[p]
              arrayPathLabel = `${arrayPathLabel}.${p}`
              return
            }
            throw new Error(
              `transformContent: ${arrayPath.join(
                '.'
              )} is not exist in the object: transform=${m.transform}`
            )
          })
        }
        if (!Array.isArray(arrayItem)) {
          throw new Error(
            `transformContent: ${arrayPathLabel} is not array: transform=${m.transform}`
          )
        }
        return ret
      } catch (err: any) {
        throw new Error(
          `transformContent: transform=${m.transform} message=${
            err.message
          } value=${JSON.stringify(content)}`
        )
      }
    }
    return content
  }
  return ret
}

export async function saveRemoteContent({
  client,
  apiName,
  mapConfig,
  dstContentDir,
  dstImagesDir,
  staticRoot,
  skip,
  limit,
  pageSize,
  positioStart,
  maxRepeat,
  filter,
  query,
  vars,
  varsStr
}: SaveRemoteContentOptions): Promise<Error | null> {
  let ret: Error | null = null
  try {
    const c = client
      .request()
      .api(apiName)
      .skip(skip)
      .limit(limit)
      .pageSize(pageSize)
      .transform(transformContent(mapConfig))
      .filter(filter)
      .query(query)
      .vars(vars)
      .vars(varsStr, true)
    const positionConfig = Object.assign(
      {},
      defaultPosition,
      mapConfig.position
    )
    let repeat = 1
    let position: number =
      typeof positioStart === 'number' ? positioStart : positionConfig.start

    printInfo(
      `saveRemoteContent: start max-repeat=${maxRepeat}${
        limit != undefined ? ` limit=${limit}` : ''
      }`
    )

    for await (let res of c.fetch()) {
      const contenSrc = res.content
      const len = contenSrc.length
      const content: MappedFlds[] = new Array(len) as MappedFlds[]
      for (let idx = 0; idx < len; idx++) {
        content[idx] = await mappingFlds(contenSrc[idx], mapConfig)
      }
      // 途中で field の入れ替えがごちゃっとしている.
      // 新しい配列に map する処理に変更を検討.
      for (let idx = 0; idx < len; idx++) {
        const fldsArray: [string, any][] = Object.entries(content[idx])
        const fldsLen = fldsArray.length
        for (let fldsIdx = 0; fldsIdx < fldsLen; fldsIdx++) {
          const c = fldsArray[fldsIdx]
          const imageFld: MapFldsImage | undefined = (() => {
            const mapIdx = mapConfig.flds.findIndex(
              ({ dstName, fldType }) => dstName === c[0] && fldType === 'image'
            )
            if (mapIdx >= 0) {
              return mapConfig.flds[mapIdx] as MapFldsImage
            }
            return
          })()
          if (imageFld) {
            let imageInfo = await imageInfoFromSrc(
              c[1],
              imageFld.setSize || false
            )
            if (isImageDownload(mapConfig, imageInfo)) {
              imageInfo = await saveImageFile(
                imageInfo,
                dstImagesDir,
                staticRoot,
                fileNameFromURL(imageInfo.url, mapConfig, imageFld),
                imageFld.setSize || false
              )
            }
            c[1] = imageInfo
          }
        }
        const flds: MappedFlds = { ...content[idx] }
        fldsArray.forEach(([k, v]) => (flds[k] = v))
        ret = await saveContentFile(flds, dstContentDir, {
          fldName: positionConfig.fldName,
          value: position++
        })
        if (ret) {
          break
        }
      }
      printInfo(`saveRemoteContent: repeat=${repeat} done`)
      repeat = repeat + 1
      if (maxRepeat > 0 && repeat > maxRepeat) {
        break
      }
    }

    printInfo(`saveRemoteContent: done`)
  } catch (err: any) {
    // console.log('err:', err);
    ret = new Error(`saveRemoteContent error: ${err}`)
  }
  return ret
}
