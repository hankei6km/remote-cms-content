import { readFile } from 'fs/promises'
import Ajv from 'ajv'
import { BaseFlds, MapConfig } from '../types/map.js'
import { mapConfigSchema } from '../types/mapConfigSchema.js'

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

const validIdRegExp = /^[-_0-9a-zA-Z]+$/
export function validId(s: string | number): boolean {
  if (typeof s === 'number') {
    return true
  } else if (typeof s === 'string' && s.match(validIdRegExp)) {
    return true
  }
  return false
}

function throwInvalidId(
  value: string,
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

export function mappingFlds(s: any, mapConfig: MapConfig): BaseFlds {
  const n = new Date()
  const id = validId(s.id) ? s.id : throwInvalidId(s.id, 'id', 'id', 'id')
  const ret: BaseFlds = {
    _RowNumber: s._RowNumber !== undefined ? s._RowNumber! : -1,
    id,
    createdAt: s.createdAt ? new Date(s.createdAt) : n,
    updatedAt: s.updatedAt ? new Date(s.updatedAt) : n
  }
  mapConfig.flds.forEach((m) => {
    if (s.hasOwnProperty(m.srcName)) {
      const srcFldType = typeof s[m.srcName]
      switch (m.fldType) {
        case 'id':
          if (srcFldType === 'number' || srcFldType === 'string') {
            if (validId(s[m.srcName])) {
              ret[m.dstName] = `${s[m.srcName]}`
            } else {
              throwInvalidId(s[m.srcName], m.srcName, m.dstName, m.fldType)
            }
          } else {
            throwInvalidType(srcFldType, m.srcName, m.dstName, m.fldType)
          }
          break
        case 'number':
          if (srcFldType === 'number') {
            ret[m.dstName] = s[m.srcName]
          } else {
            throwInvalidType(srcFldType, m.srcName, m.dstName, m.fldType)
          }
          break
        case 'string':
        case 'image': // この時点では文字列として扱う(保存時にファイルをダウンロードする).
          if (srcFldType === 'string' || srcFldType === 'number') {
            ret[m.dstName] = `${s[m.srcName]}`
          } else {
            ret[m.dstName] = `${s[m.srcName] || ''}`
          }
          break
        case 'datetime':
          ret[m.dstName] = new Date(`${s[m.srcName]}`)
          break
        case 'enum':
          const str = `${s[m.srcName]}`
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
      }
    }
  })
  return ret
}
