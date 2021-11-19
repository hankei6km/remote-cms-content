import contentful from 'contentful'
import { BLOCKS, Document } from '@contentful/rich-text-types'
import { Element, Properties } from 'hast'
import { toHtml } from 'hast-util-to-html'
import {
  documentToHtmlString,
  NodeRenderer
} from '@contentful/rich-text-html-renderer'
import {
  Client,
  ClientBase,
  ClientChain,
  ClientKind,
  ClientOpts,
  FetchResult,
  OpValue,
  ResRecord,
  TransformContent
} from '../../types/client.js'
import { MapFld } from '../../types/map.js'

const nodeRendererAsset: NodeRenderer = (node) => {
  // console.log(JSON.stringify(node.data.target.fields, null, ' '))
  if (node.data?.target?.fields) {
    // multiple locales のとき file が存在しない asset が渡されるときがある.
    const { title, file, description } = node.data.target.fields
    if (
      file !== undefined &&
      typeof file.contentType === 'string' &&
      file.contentType.startsWith('image') &&
      file.url
    ) {
      // この時点で rehype-image-salt で展開させる?
      let alt = title || ''
      const m = (description || '').match(/.*({.+}).*/ms)
      if (m) {
        const attr = m[1].replace(/\n/g, ' ')
        alt = `${alt}${attr}`
      }
      const imgProperties: Properties = {
        alt,
        src: `https:${file.url}`,
        // src: file.url, // http://localhost:3000 などで http になる、nuxt-image で扱いにくい.
        width: file.details?.image?.width,
        height: file.details?.image?.height
      }
      const p: Element = {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'img',
            properties: imgProperties,
            children: []
          }
        ]
      }
      return toHtml(p)
    }
  }
  return ''
}

const nodeRendererEntry: NodeRenderer = (node) => {
  // console.log(JSON.stringify(node.data.target.fields, null, ' '))
  if (
    node.data?.target?.sys?.contentType?.sys?.id === 'fragmentCodeblock' &&
    node.data?.target?.fields?.content
  ) {
    const pre: Element = {
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: [{ type: 'text', value: node.data.target.fields.content }]
        }
      ]
    }
    return toHtml(pre)
  }
  return ''
}

export function richTextToHtml(v: Document): string {
  // async は一旦やめておく.
  return documentToHtmlString(v, {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: nodeRendererAsset,
      [BLOCKS.EMBEDDED_ENTRY]: nodeRendererEntry
    }
  })
}

export function queryEquality(filter: OpValue[]): Record<string, any> {
  const ret: Record<string, any> = {}
  filter
    .filter(([o]) => o === 'eq')
    .forEach(([_o, k, v]) => {
      ret[k] = v
    })
  return ret
}

export class CtfRecord extends ResRecord {
  has(map: MapFld): boolean {
    const n = map.srcName.split('.', 2)
    if (n.length === 2) {
      if (n[0] === 'fields') {
        const f = this.record[n[0]]
        if (typeof f === 'object') {
          return (f as any).hasOwnProperty(n[1])
        }
      }
    }
    return this.record.hasOwnProperty(map.srcName)
  }
  isAsyncFld(map: MapFld): boolean {
    return map.fldType === 'html'
  }
  _getValue(fldName: string) {
    const n = fldName.split('.', 2)
    if (n.length === 2) {
      if (n[0] === 'fields') {
        const f = this.record[n[0]]
        if (typeof f === 'object') {
          return (f as any)[n[1]]
        }
      }
    }
    return this.record[fldName]
  }
  getSync(map: MapFld): boolean {
    return this._getValue(map.srcName)
  }
  async getAsync(map: MapFld): Promise<unknown> {
    const v = this._getValue(map.srcName)
    if (map.fldType === 'html') {
      if (v && typeof v === 'object' && (v as any).nodeType === 'document') {
        return richTextToHtml(v as Document)
      } else {
        return v
      }
    }
    return v
  }
}

export class ClientCtf extends ClientBase {
  ctfClient!: contentful.ContentfulClientApi
  kind(): ClientKind {
    return 'contentful'
  }
  async fetch(): Promise<FetchResult> {
    const res = await this.ctfClient
      .getEntries<Record<string, any>>({
        ...queryEquality(this._filter),
        content_type: this._apiName
      })
      .catch((err) => {
        const m = JSON.parse(err.message)
        delete m.request // bearer が一部見えるのでいちおう消す
        throw new Error(
          `client_contentful.fetch API getEntries error: content type = ${
            this._apiName
          }\n${JSON.stringify(m, null, ' ')}`
        )
      })
    // console.log(JSON.stringify(res, null, '  '))
    const contentRaw = this._transformer
      ? this._transformer(res.items as unknown as Record<string, unknown>[])
      : res.items
    const content = contentRaw.map((item) => {
      const sys: Record<string, unknown> =
        typeof item.sys === 'object' ? item.sys : ({} as any)
      const fields: Record<string, unknown> =
        typeof item.fields === 'object' ? item.fields : ({} as any)
      const ret: Record<string, unknown> = {
        id: sys.id,
        createdAt: sys.createdAt,
        updatedAt: sys.updatedAt,
        sys: sys,
        fields: fields
      }
      return new CtfRecord(ret)
    })
    return { content: content }
  }
  request(): ClientChain {
    this.ctfClient = contentful.createClient({
      space: this._opts.credential[0],
      accessToken: this._opts.credential[1]
    })
    return super.request()
  }
}
