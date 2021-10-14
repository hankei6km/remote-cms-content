export type BaseFlds = {
  _RowNumber: number
  id: string
  createdAt: Date
  updatedAt: Date
} & Record<string, unknown>

export type MapFldsBase = {
  srcName: string
  dstName: string
}

export type MapFldsId = {
  fldType: 'id'
} & MapFldsBase

export type MapFldsNumber = {
  fldType: 'number'
} & MapFldsBase

export type MapFldsString = {
  fldType: 'string'
} & MapFldsBase

export type MapFldsDatetime = {
  fldType: 'datetime'
} & MapFldsBase

export type MapFldsImage = {
  fldType: 'image'
  setSize?: boolean
} & MapFldsBase

export type MapFldsEnum = {
  fldType: 'enum'
  replace: {
    pattern: string | RegExp
    replacement: string
  }[]
} & MapFldsBase

export type MapFlds = (
  | MapFldsId
  | MapFldsNumber
  | MapFldsString
  | MapFldsDatetime
  | MapFldsImage
  | MapFldsEnum
)[]

export type MapConfig = {
  passthruUnmapped?: boolean
  flds: MapFlds
}
