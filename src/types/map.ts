import { Expression } from 'jsonata'

export type BaseFlds = {
  _RowNumber: number
  id: string
  createdAt: Date
  updatedAt: Date
} & Record<string, unknown>

export type MapFldsBase = {
  srcName: string
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

type HtmlToMarkdownOptsEmbedImgAttrs = {
  baseURL?: string
  embedTo?: 'alt' | 'block'
  pickAttrs?: string[]
}
export type HtmlToMarkdownOpts = {
  embedImgAttrs?:
    | HtmlToMarkdownOptsEmbedImgAttrs
    | HtmlToMarkdownOptsEmbedImgAttrs[]
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
  passthruUnmapped?: boolean
  transform?: string
  /**
   * @ignore
   */
  transformJsonata?: Expression
  position?: {
    fldName?: string
    start?: number
  }
  flds: MapFlds
}

export const defaultPosition = {
  fldName: 'position',
  start: 1
}
