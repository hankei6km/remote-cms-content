import contentful from 'contentful'
import { BLOCKS } from '@contentful/rich-text-types'
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
  OpValue
} from '../../types/client.js'

const nodeRendererAsset: NodeRenderer = (node) => {
  // console.log(JSON.stringify(node.data.target.fields, null, ' '))
  const { title, file } = node.data.target.fields
  if (
    typeof file.contentType === 'string' &&
    file.contentType.startsWith('image') &&
    file.url
  ) {
    // この時点で rehype-image-salt で展開させる?
    const imgProperties: Properties = {
      alt: title || '',
      //src: `https:${file.url}`
      src: file.url,
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

export async function richTextToHtml(
  c: contentful.EntryCollection<Record<string, any>>
): Promise<void> {
  c.items.forEach((i) =>
    Object.entries(i.fields).forEach(([k, v]) => {
      if (typeof v === 'object' && v.nodeType === 'document') {
        i.fields[k] = documentToHtmlString(v, {
          renderNode: {
            [BLOCKS.EMBEDDED_ASSET]: nodeRendererAsset
          }
        })
      }
    })
  )
  return
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
        richTextToHtml(res)
        const contents = res.items.map((item) => ({
          id: item.sys.id,
          createdAt: item.sys.createdAt,
          updatedAt: item.sys.updatedAt,
          sys: item.sys,
          fields: item.fields
        }))
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
