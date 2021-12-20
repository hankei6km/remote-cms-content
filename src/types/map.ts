import { Expression } from 'jsonata'
import imageSalt from '@hankei6km/rehype-image-salt'

export type BaseFlds = {
  id: string
  _RowNumber: number
  createdAt: Date
  updatedAt: Date
}

export type MappedFlds = {
  id: string
} & Record<string, unknown>

export type MapFldsBase = {
  fetchFld?: string
  query: string
  dstName: string
  /**
   * @ignore
   */
  transformJsonata?: Expression
}

export type MapFldsId = {
  fldType: 'id'
} & MapFldsBase

export type MapFldsBoolean = {
  fldType: 'boolean'
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
  fileNameField?: string
  setSize?: boolean
} & MapFldsBase

export type MapFldsEnum = {
  fldType: 'enum'
  replace: {
    pattern: string | RegExp
    replacement: string
  }[]
} & MapFldsBase

export type MapFldsObject = {
  fldType: 'object' // 実質 any
} & MapFldsBase

export type HtmlToHtmlOpts = {
  frontMatter?: boolean
  splitParagraph?: boolean
  lfTo?: string
}

export type HtmlToMarkdownOpts = {
  imageSalt?: Parameters<typeof imageSalt>[0]
}
export type MapFldsHtmlOpts = {
  convert?: 'none' | 'html' | 'markdown'
  toHtmlOpts?: HtmlToHtmlOpts
  toMarkdownOpts?: HtmlToMarkdownOpts
}
export type MapFldsHtml = {
  fldType: 'html'
  convert?: MapFldsHtmlOpts['convert']
  toHtmlOpts?: MapFldsHtmlOpts['toHtmlOpts']
  toMarkdownOpts?: MapFldsHtmlOpts['toMarkdownOpts']
} & MapFldsBase

export type MapFld =
  | MapFldsId
  | MapFldsBoolean
  | MapFldsNumber
  | MapFldsString
  | MapFldsDatetime
  | MapFldsImage
  | MapFldsEnum
  | MapFldsObject
  | MapFldsHtml

export type MapFlds = MapFld[]

export type MapConfig = {
  media?: {
    image?: {
      fileNameField?: string
      download?: boolean
      library?: [
        {
          src: string
          kind: 'imgix'
          download?: boolean
        }
      ]
    }
  }
  disableBaseFlds?: boolean
  passthruUnmapped?: boolean
  selectFldsToFetch?: boolean
  fldsToFetch?: string[]
  transform?: string
  /**
   * @ignore
   */
  transformJsonata?: Expression
  position?: {
    disable?: boolean
    fldName?: string
    start?: number
  }
  flds: MapFlds
}

export const defaultPosition = {
  disable: false,
  fldName: 'position',
  start: 1
}
