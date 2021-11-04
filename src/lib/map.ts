import path from 'path'
import { readFile } from 'fs/promises'
import Ajv from 'ajv'
import jsonata from 'jsonata'
import { BaseFlds, MapConfig, MapFld, MapFldsImage } from '../types/map.js'
import { mapConfigSchema } from '../types/mapConfigSchema.js'
import { ImageInfo } from '../types/media.js'
import { htmlToMarkdown } from './html.js'

const ajv = new Ajv()
const validate = ajv.compile(mapConfigSchema)

export function validateMapConfig(mapConfig: any): MapConfig {
  if (!validate(mapConfig) && validate.errors) {
    // allErrors false 前提.
    throw new Error(
      `validateMapConfig: message=${
        validate.errors[0]?.message
      } params=${JSON.stringify(validate.errors[0]?.params)}`
    )
  }
  return mapConfig as MapConfig
}

export async function loadMapConfig(jsonFile: string): Promise<MapConfig> {
  try {
    const s = await readFile(jsonFile)
    return validateMapConfig(JSON.parse(s.toString()))
  } catch (err) {
    throw new Error(`loadMapConfig: jsonFile=${jsonFile} ${err}`)
  }
}

export function fileNameFromURL(
  src: string,
  mapConfig: MapConfig,
  imageFld: MapFldsImage
): string {
  // client 側の処理にする？
  const fieldName =
    imageFld.fileNameField || mapConfig.media?.image?.fileNameField || ''
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

export function isImageDownload(
  mapConfig: MapConfig,
  imageInfo: ImageInfo
): boolean {
  if (mapConfig.media?.image) {
    if (mapConfig.media.image.library) {
      const libIdx = mapConfig.media.image.library.findIndex(({ src }) =>
        imageInfo.url.startsWith(src)
      )
      if (libIdx >= 0) {
        return mapConfig.media.image.library[libIdx].download || false
      }
    }
    return mapConfig.media.image.download || false
  }
  return false
}

const validIdRegExp = /^[-_0-9a-zA-Z]+$/
export function validId(s: unknown): s is number | string {
  if (typeof s === 'number') {
    return true
  } else if (typeof s === 'string' && s.match(validIdRegExp)) {
    return true
  }
  return false
}

function throwInvalidId(
  value: unknown,
  srcName: string,
  dstName: string,
  fldType: string
) {
  throw new Error(
    `mappingFlds: invalid id: value = ${value}, params = ${srcName}, ${dstName}, ${fldType}`
  )
}

function throwInvalidType(
  actually: string,
  srcName: string,
  dstName: string,
  fldType: string
) {
  throw new Error(
    `mappingFlds: invalid type: actually type = ${actually}, params = ${srcName}, ${dstName}, ${fldType}`
  )
}

function transformFldValue(m: MapFld, value: unknown): any {
  const valueType = typeof value
  if (
    (valueType === 'number' ||
      valueType === 'string' ||
      valueType === 'object') &&
    m.jsonata
  ) {
    try {
      const expression = jsonata(m.jsonata)
      return expression.evaluate(value)
    } catch (err: any) {
      throw new Error(
        `transformFldValue: jsonata=${m.jsonata}, message=${err.message}`
      )
    }
  }
  return value
}

export async function mappingFlds(
  s: Record<string, unknown>,
  mapConfig: MapConfig
): Promise<BaseFlds> {
  const { _RowNumber, id, createdAt, updatedAt, ...src } = s
  const n = new Date()
  const ret: BaseFlds = {
    _RowNumber: typeof _RowNumber === 'number' ? _RowNumber! : -1,
    id: '',
    createdAt: typeof createdAt === 'string' ? new Date(createdAt) : n,
    updatedAt: typeof updatedAt === 'string' ? new Date(updatedAt) : n
  }
  if (validId(id)) {
    ret.id = `${id}`
  } else {
    throwInvalidId(id, 'id', 'id', 'id')
  }
  const mapFldsLen = mapConfig.flds.length
  for (let mapFldsIdx = 0; mapFldsIdx < mapFldsLen; mapFldsIdx++) {
    const m = mapConfig.flds[mapFldsIdx]
    if (src.hasOwnProperty(m.srcName)) {
      const srcValue = transformFldValue(m, src[m.srcName])
      const srcFldType = typeof srcValue
      switch (m.fldType) {
        case 'id':
          if (srcFldType === 'number' || srcFldType === 'string') {
            if (validId(srcValue)) {
              ret[m.dstName] = `${srcValue}`
            } else {
              throwInvalidId(srcValue, m.srcName, m.dstName, m.fldType)
            }
          } else {
            throwInvalidType(srcFldType, m.srcName, m.dstName, m.fldType)
          }
          break
        case 'boolean':
          if (srcFldType === 'boolean') {
            ret[m.dstName] = srcValue
          } else {
            throwInvalidType(srcFldType, m.srcName, m.dstName, m.fldType)
          }
          break
        case 'number':
          if (srcFldType === 'number') {
            ret[m.dstName] = srcValue
          } else {
            throwInvalidType(srcFldType, m.srcName, m.dstName, m.fldType)
          }
          break
        case 'string':
          if (srcFldType === 'string' || srcFldType === 'number') {
            ret[m.dstName] = `${srcValue}`
          } else {
            ret[m.dstName] = `${srcValue || ''}`
          }
          break
        case 'image': // この時点では文字列として扱う(保存時にファイルをダウンロードする).
          if (srcFldType === 'string' || srcFldType === 'number') {
            ret[m.dstName] = `${srcValue}`
          } else if (srcFldType === 'object') {
            ret[m.dstName] = srcValue
          } else {
            throwInvalidType(srcFldType, m.srcName, m.dstName, m.fldType)
          }
          break
        case 'datetime':
          ret[m.dstName] = new Date(`${srcValue}`)
          break
        case 'enum':
          const str = `${srcValue}`
          const matchIdx = m.replace.findIndex(({ pattern }) =>
            str.match(pattern)
          )
          if (matchIdx >= 0) {
            ret[m.dstName] = str.replace(
              m.replace[matchIdx].pattern,
              m.replace[matchIdx].replacement
            )
          } else {
            ret[m.dstName] = str
          }
          break
        case 'object':
          ret[m.dstName] = srcValue
          break
        case 'html':
          if (srcFldType === 'string') {
            ret[m.dstName] = await htmlToMarkdown(srcValue as string, {
              embedImgAttrs: m.embedImgAttrs
            })
          } else {
            throwInvalidType(srcFldType, m.srcName, m.dstName, m.fldType)
          }
          break
      }
      if (ret.hasOwnProperty(m.dstName)) {
        delete src[m.srcName]
      }
    }
  }
  if (mapConfig.passthruUnmapped) {
    Object.entries(src).forEach(([k, v]) => {
      if (!ret.hasOwnProperty(k)) {
        ret[k] = v
      }
    })
  }
  return ret
}
