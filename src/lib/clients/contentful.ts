import contentful from 'contentful'
import { BLOCKS, Document } from '@contentful/rich-text-types'
import { Element, Properties } from 'hast'
import { toHtml } from 'hast-util-to-html'
import {
  documentToHtmlString,
  NodeRenderer
} from '@contentful/rich-text-html-renderer'
import fetch from 'cross-fetch'
// SyntaxError: Named export 'HttpLink' not found. The requested module '@apollo/client' is a CommonJS module, which may not support all module.exports as named exports.
// CommonJS modules can always be imported via the default export, for example using:
// import pkg from '@apollo/client';
// const { HttpLink: HttpLink } = pkg;
// なぜかこのエラーになるので対応.
// types/gql.ts でも同じようなことになっている.
import pkgApolloClient from '@apollo/client'
const { HttpLink: HttpLink } = pkgApolloClient
import {
  ClientBase,
  ClientChain,
  ClientKind,
  ClientOpts,
  FetchParams,
  FetchResult,
  OpValue,
  RawRecord,
  ResRecord
} from '../../types/client.js'
import { MapFld } from '../../types/map.js'
import { ClientGqlBase } from '../../types/gql.js'

const nodeRendererAsset = (links?: any): NodeRenderer => {
  // https://www.contentful.com/blog/2021/05/27/rich-text-field-tips-and-tricks/
  const assetMap = new Map()
  if (links) {
    for (const asset of links?.assets?.block || []) {
      // TODO: sys.id だけでなくオブジェクト全体の検証.
      if (asset.sys?.id === undefined) {
        throw new Error(
          `nodeRendererAsset: sys.id is undefined\nasset = ${JSON.stringify(
            asset,
            null,
            ' '
          )}`
        )
      }
      assetMap.set(asset.sys.id, asset)
    }
  }

  return (node) => {
    // console.log(JSON.stringify(node.data.target.fields, null, ' '))
    let url: string = ''
    let width: number | undefined = 0
    let height: number | undefined = 0
    let title: string = ''
    let description: string = ''
    let hit = false
    if (node.data?.target?.fields) {
      // multiple locales のとき file が存在しない asset が渡されるときがある.
      const file = node.data.target.fields.file
      if (
        file !== undefined &&
        typeof file.contentType === 'string' &&
        file.contentType.startsWith('image') &&
        file.url
      ) {
        url = file.url
        width = file.details?.image?.width
        height = file.details?.image?.height
        title = node.data.target.fields.title
        description = node.data.target.fields.description
        hit = true
      }
    } else if (node.data?.target?.sys?.id && links) {
      const asset = assetMap.get(node.data.target.sys.id)
      if (
        asset &&
        asset.url &&
        typeof asset.contentType === 'string' &&
        asset.contentType.startsWith('image')
      ) {
        url = asset.url
        width = asset.width
        height = asset.height
        title = asset.title
        description = asset.description
        hit = true
      }
    }
    if (hit) {
      // この時点で rehype-image-salt で展開させる?
      let alt = title || ''
      const m = (description || '').match(/.*({.+}).*/ms)
      if (m) {
        const attr = m[1].replace(/\n/g, ' ')
        alt = `${alt}${attr}`
      }
      const imgProperties: Properties = {
        alt,
        src: url, // REST は protocol なし、GraphQL は https.
        width: width,
        height: height
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
    return ''
  }
}

const nodeRendererEntry = (links: any): NodeRenderer => {
  const entriesMap = new Map()
  if (links) {
    for (const entry of links?.entries?.block || []) {
      // TODO: sys.id だけでなくオブジェクト全体の検証.
      if (entry.sys?.id === undefined) {
        throw new Error(
          `nodeRendererEntry: sys.id is undefined\nentry = ${JSON.stringify(
            entry,
            null,
            ' '
          )}`
        )
      }
      entriesMap.set(entry.sys.id, entry)
    }
  }
  return (node) => {
    // console.log(JSON.stringify(node.data.target.fields, null, ' '))
    let hit = false
    let content: string = ''
    if (
      node.data?.target?.sys?.contentType?.sys?.id === 'fragmentCodeblock' &&
      node.data?.target?.fields?.content
    ) {
      content = node.data.target.fields.content
      hit = true
    } else if (node.data?.target?.sys?.id && links) {
      const entry = entriesMap.get(node.data.target.sys.id)
      if (entry && entry.__typename === 'FragmentCodeblock' && entry.content) {
        content = entry.content
        hit = true
      }
    }
    if (hit) {
      const pre: Element = {
        type: 'element',
        tagName: 'pre',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [{ type: 'text', value: content }]
          }
        ]
      }
      return toHtml(pre)
    }
    return ''
  }
}

export function richTextToHtml(
  v: Document,
  links?: any /* cda の Asset 等が使えるか微妙なので any */
): string {
  // async は一旦やめておく.
  return documentToHtmlString(v, {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: nodeRendererAsset(links),
      [BLOCKS.EMBEDDED_ENTRY]: nodeRendererEntry(links)
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
  isAsyncFld(map: MapFld): boolean {
    return map.fldType === 'html'
  }
  async getAsync(map: MapFld): Promise<unknown> {
    const v = this._getValue(map)
    if (map.fldType === 'html') {
      // https://www.contentful.com/blog/2021/05/27/rich-text-field-tips-and-tricks/
      // GraphQL では asset 等は埋め込まれないので、links から取得する必要がある.
      if (v && typeof v === 'object') {
        if ((v as any).nodeType === 'document') {
          return richTextToHtml(v as Document)
        } else if (
          typeof (v as any).json === 'object' &&
          (v as any).json.nodeType === 'document'
        ) {
          return richTextToHtml((v as any).json as Document, (v as any).links)
        }
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
  resRecord(r: RawRecord): ResRecord {
    return new CtfRecord(r)
  }
  async _fetch({ skip, pageSize }: FetchParams): Promise<FetchResult> {
    const res = await this.ctfClient
      .getEntries<Record<string, any>>({
        ...queryEquality(this._filter),
        skip: skip,
        limit: pageSize,
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
    const contentRaw = this._execTransform(
      res.items as unknown as Record<string, unknown>[]
    )
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
      return this.resRecord(ret)
    })
    return {
      fetch: {
        count: res.items.length,
        next: {
          kind: 'total',
          total: res.total
        }
      },
      content: content
    }
  }
  request(): ClientChain {
    this.ctfClient = contentful.createClient({
      space: this._opts.credential[0],
      accessToken: this._opts.credential[1]
    })
    return super.request()
  }
}

export class ClientCtfGql extends ClientGqlBase {
  constructor(opts: ClientOpts) {
    super(
      new HttpLink({
        uri: `${opts.apiBaseURL}${opts.credential[0]}`,
        fetch,
        headers: {
          Authorization: `Bearer ${opts.credential[1]}`
        }
      }),
      opts
    )
  }
  kind(): ClientKind {
    return 'contentful:gql'
  }
  resRecord(r: RawRecord): ResRecord {
    return new CtfRecord(r)
  }
}
