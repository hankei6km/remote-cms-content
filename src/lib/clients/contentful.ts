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
  ClientChain,
  ClientInstance,
  ClientOpts,
  FetchResult,
  OpValue,
  TransformContents
} from '../../types/client.js'
import { validateAdditionalItems } from 'ajv/dist/vocabularies/applicator/additionalItems'

const nodeRendererAsset: NodeRenderer = (node) => {
  // console.log(JSON.stringify(node.data.target.fields, null, ' '))
  const { title, file, description } = node.data.target.fields
  if (
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
  return ''
}

const nodeRendererEntry: NodeRenderer = (node) => {
  // console.log(JSON.stringify(node.data.target.fields, null, ' '))
  if (
    node.data.target.sys.contentType.sys.id === 'fragmentCodeblock' &&
    node.data.target.fields.content
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

export const client: Client = function client({
  apiName: inApiName,
  credential
}: ClientOpts): ClientInstance {
  const request = () => {
    const ctfClient = contentful.createClient({
      space: credential[0],
      accessToken: credential[1]
    })
    let apiName: string | undefined = inApiName
    const filter: OpValue[] = []
    let skip: number | undefined = undefined
    let limit: number | undefined = undefined
    let transformer: TransformContents | undefined = undefined

    const clientChain: ClientChain = {
      api(name: string) {
        apiName = name
        return clientChain
      },
      filter(o: OpValue[]) {
        filter.push(...o)
        return clientChain
      },
      limit(n: number) {
        limit = n
        return clientChain
      },
      skip(n: number) {
        skip = n
        return clientChain
      },
      transform(t: TransformContents) {
        transformer = t
        return clientChain
      },
      async fetch(): Promise<FetchResult> {
        const res = await ctfClient
          .getEntries<Record<string, any>>({
            ...queryEquality(filter),
            content_type: apiName
          })
          .catch((err) => {
            const m = JSON.parse(err.message)
            delete m.request // bearer が一部見えるのでいちおう消す
            throw new Error(
              `client_contentful.fetch API getEntries error: content type = ${apiName}\n${JSON.stringify(
                m,
                null,
                ' '
              )}`
            )
          })
        // console.log(JSON.stringify(res, null, '  '))
        const contentsRaw = transformer
          ? transformer(res.items as unknown as Record<string, unknown>[])
          : res.items
        const contents = contentsRaw.map((item) => {
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
          Object.entries(fields).forEach(([k, v]) => {
            const n = `fields.${k}`
            if (ret[n] === undefined) {
              if (
                v &&
                typeof v === 'object' &&
                (v as any).nodeType === 'document'
              ) {
                ret[n] = richTextToHtml(v as Document)
              } else {
                ret[n] = v
              }
            }
          })
          return ret
        })
        return { contents }
      }
    }
    return clientChain
  }
  return {
    kind: () => 'contentful',
    request
  }
}
