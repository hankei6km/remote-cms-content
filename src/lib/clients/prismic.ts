import { Element } from 'hast'
import { PrismicLink } from 'apollo-link-prismic'
import * as prismicH from '@prismicio/helpers'

import {
  ClientKind,
  ClientOpts,
  RawRecord,
  ResRecord
} from '../../types/client.js'
import { ClientGqlBase } from '../../types/gql.js'
import { MapFld } from '../../types/map.js'
import { toHtml } from 'hast-util-to-html'

const htmlMapSierializer: prismicH.HTMLMapSerializer = {
  preformatted: (payload) => {
    const codeBlock: Element = {
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: [
            {
              type: 'text',
              value: payload.node.text
            }
          ]
        }
      ]
    }
    return toHtml(codeBlock)
  }
}

export class PrismicGqlRecord extends ResRecord {
  baseFlds() {
    // if (typeof this.record._meta === 'object') {
    if (typeof this.record._meta === 'object') {
      const meta: Record<string, unknown> = this.record._meta as any
      return {
        _RowNumber: undefined,
        id: meta.id,
        createdAt: meta.firstPublicationDate,
        updatedAt: meta.lastPublicationDate
      }
    }
    return {
      _RowNumber: undefined,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined
    }
  }
  isAsyncFld(map: MapFld): boolean {
    return map.fldType === 'html'
  }
  async getAsync(map: MapFld): Promise<unknown> {
    const v = this._getValue(map)
    if (map.fldType === 'html') {
      if (v && Array.isArray(v)) {
        return prismicH.asHTML(v as any, null, htmlMapSierializer)
      }
    }
    return v
  }
}

export class ClientPrismicGql extends ClientGqlBase {
  constructor(opts: ClientOpts) {
    // ref の指定は？
    // 必要になったら httplink で
    // - opts.credential[2]
    // - opts.apiName
    // のいずれかを指定か.
    const link = PrismicLink({
      uri: `https://${opts.credential[0]}.cdn.prismic.io/graphql`,
      accessToken: opts.credential[1] || ''
    })
    super(link, opts)
  }
  kind(): ClientKind {
    return 'prismic:gql'
  }
  resRecord(r: RawRecord): ResRecord {
    return new PrismicGqlRecord(r)
  }
}
