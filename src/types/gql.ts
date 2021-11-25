// なぜかこのエラーになる.
// このモジュールも @apollo/client も native ESM だと思うのだが、なぜ?
//
// SyntaxError: Named export 'gql' not found. The requested module '@apollo/client' is a CommonJS module, which may not support all module.exports as named exports.
// CommonJS modules can always be imported via the default export, for example using:
//
// import pkg from '@apollo/client';
// const { ApolloClient, InMemoryCache, gql } = pkg;
//
// 素直に上記の対応をやると ApolloClient の型(d.ts)の読み込みがうまくいかない。
// ApolloClient は型と class が必要なので import と const で名前を変えて読み込む.
import pkgApolloClient, {
  ApolloClient as ApolloClientAsType,
  ApolloLink,
  NormalizedCacheObject
} from '@apollo/client'
const { ApolloClient, InMemoryCache, gql } = pkgApolloClient

import { apolloErrToMessages } from '../lib/util.js'
import {
  ClientBase,
  ClientChain,
  ClientOpts,
  FetchParams,
  FetchResult,
  RawRecord,
  TransformContent
} from '../types/client.js'
//ApolloProvider,

// command の flag で渡された variables を収めておくオブジェクト.
// いまのところはスカラーぽいものだけ.
export type GqlVars = Record<string, boolean | number | string>

export function gqlClient() {
  return new ApolloClient({
    cache: new InMemoryCache()
  })
}

export abstract class ClientGqlBase extends ClientBase {
  private _gqlClient!: ApolloClientAsType<NormalizedCacheObject>
  private _link!: ApolloLink
  constructor(link: ApolloLink, opts: ClientOpts) {
    // link が外部に露出しているのはどうなの?
    super(opts)
    this._arrayPath = this.arrayPath()
    this._link = link
  }
  arrayPath() {
    return ['items']
  }
  extractArrayItem(o: ReturnType<TransformContent>): RawRecord[] {
    // ここが実行される時点で arrayPath は array であることが検証されている.
    return (o as any)['items'] as RawRecord[]
  }
  extractTotal(o: ReturnType<TransformContent>): number {
    // ここが実行される時点で o は RawRecord[] でないことが検証されている.
    const ret = (o as any).total
    if (typeof ret !== 'number') {
      throw new Error('ClientGqlBase: total field not found')
    }
    return ret
  }
  request(): ClientChain {
    this._gqlClient = new ApolloClient({
      link: this._link,
      cache: new InMemoryCache()
    })
    return this
  }
  async _fetch({ skip, pageSize, query }: FetchParams): Promise<FetchResult> {
    return new Promise((resolve, reject) => {
      this._gqlClient
        .query({
          query: gql(query.join('\n')),
          variables: {
            skip,
            pageSize,
            ...this._vars
          }
        })
        .then((res) => {
          const data = res.data
          const t = this._execTransform(data)
          const content = this.extractArrayItem(t)
          const total = this.extractTotal(t)
          resolve({
            fetch: {
              total,
              count: content.length
            },
            content: content.map((v) => this.resRecord(v))
          })
        })
        .catch((err) => {
          reject(new Error(`ClientGqlBase._fetch: ${apolloErrToMessages(err)}`))
        })
    })
  }
}

export {}
