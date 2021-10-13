import { BaseCols, MapConfig } from '../types/map'

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
  colType: string
) {
  throw new Error(
    `mappingCols: invalid id: value = ${value}, params = ${srcName}, ${dstName}, ${colType}`
  )
}

function throwInvalidType(
  actually: string,
  srcName: string,
  dstName: string,
  colType: string
) {
  throw new Error(
    `mappingCols: invalid type: actually type = ${actually}, params = ${srcName}, ${dstName}, ${colType}`
  )
}

export function mappingCols(s: any, mapConfig: MapConfig): BaseCols {
  const n = new Date()
  const id = validId(s.id) ? s.id : throwInvalidId(s.id, 'id', 'id', 'id')
  const ret: BaseCols = {
    _RowNumber: s._RowNumber !== undefined ? s._RowNumber! : -1,
    id,
    createdAt: s.createdAt ? new Date(s.createdAt) : n,
    updatedAt: s.updatedAt ? new Date(s.updatedAt) : n
  }
  mapConfig.cols.forEach((m) => {
    if (s.hasOwnProperty(m.srcName)) {
      const srcColType = typeof s[m.srcName]
      switch (m.colType) {
        case 'id':
          if (srcColType === 'number' || srcColType === 'string') {
            if (validId(s[m.srcName])) {
              ret[m.dstName] = `${s[m.srcName]}`
            } else {
              throwInvalidId(s[m.srcName], m.srcName, m.dstName, m.colType)
            }
          } else {
            throwInvalidType(srcColType, m.srcName, m.dstName, m.colType)
          }
          break
        case 'number':
          if (srcColType === 'number') {
            ret[m.dstName] = s[m.srcName]
          } else {
            throwInvalidType(srcColType, m.srcName, m.dstName, m.colType)
          }
          break
        case 'string':
        case 'image': // この時点では文字列として扱う(保存時にファイルをダウンロードする).
          if (srcColType === 'string' || srcColType === 'number') {
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
