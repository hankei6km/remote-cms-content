import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  gql,
  NormalizedCacheObject
} from '@apollo/client'
import { apolloErrToMessages } from '../lib/util.js'
import {
  ClientBase,
  ClientChain,
  ClientOpts,
  FetchParams,
  FetchResult,
  RawRecord
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
  _gqlClient!: ApolloClient<NormalizedCacheObject>
  _link!: ApolloLink
  constructor(link: ApolloLink, opts: ClientOpts) {
    // link が外部に露出しているのはどうなの?
    super(opts)
    this._arrayPath = this.arrayPath()
    this._link = link
  }
  abstract arrayPath(): string[]
  abstract extractArrayItem(o: object): RawRecord[]
  abstract _extractTotal(o: object): number
  extractTotal(o: object): number {
    const ret = this._extractTotal(o)
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
          reject(
            new Error(
              `ClientGqlBase._fetch: ${apolloErrToMessages(err)} ${err}`
            )
          )
        })
    })
  }
}
