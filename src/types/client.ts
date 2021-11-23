import { readQuery, decodeVars } from '../lib/util.js'
import { GqlVars } from './gql.js'
import { MapFld } from './map.js'

export const ClientKindValues = [
  'appsheet',
  'contentful',
  'contentful:gql',
  'microcms'
] as const
export type ClientKind = typeof ClientKindValues[number]

export type RawRecord = Record<string, unknown>

// type GetFldSyncType = Exclude<MapFld, MapFldsImage | MapFldsHtml>
// type GetFldAsyncType = Exclude<MapFld, GetFldSyncType>
export class ResRecord {
  record: Record<string, unknown> = {}
  _RowNumber: unknown
  id: unknown
  createdAt: unknown
  updatedAt: unknown
  src: Record<string, unknown> = {}
  constructor(record: Record<string, unknown>) {
    const { _RowNumber, id, createdAt, updatedAt, ...r } = record
    this.record = record
    this.src = r
    this._RowNumber = _RowNumber
    this.id = id
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }
  has(map: MapFld): boolean {
    if (this.record.hasOwnProperty(map.srcName)) {
      const v = this.record[map.srcName]
      if (v !== null) {
        return true
      }
    }
    return false
  }
  baseFlds() {
    return {
      _RowNumber: this._RowNumber,
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
  rawEntries(): [string, unknown][] {
    return Object.entries(this.src) // ここでは get* メソッドを通さない.
  }
  isAsyncFld(map: MapFld): boolean {
    // return map.fldType === 'html' || map.fldType === 'image'
    return false
  }
  execTransform(m: MapFld, value: unknown): any {
    const valueType = typeof value
    if (
      (valueType === 'number' ||
        valueType === 'string' ||
        valueType === 'object') &&
      m.transformJsonata
    ) {
      try {
        return m.transformJsonata.evaluate(value)
      } catch (err: any) {
        throw new Error(
          `transformFldValue: transform=${m.transform} message=${
            err.message
          } value=${JSON.stringify(value)}`
        )
      }
    }
    return value
  }
  getSync(map: MapFld): unknown {
    return this.execTransform(map, this.record[map.srcName])
  }
  async getAsync(map: MapFld): Promise<unknown> {
    return this.execTransform(map, this.record[map.srcName])
  }
}

export type FetchParams = {
  skip: number
  pageSize?: number
  query: string[]
}

export type FetchResult = {
  fetch: {
    // fetch したレコード件数(transform 後の content のレコードではない)
    count: number
    total: number
  }
  content: ResRecord[]
}

export const OpKindValues = ['eq'] as const
export type OpKind = typeof OpKindValues[number]
export type OpValue = [OpKind, string, any]

export type TransformContent = (
  content: any,
  arrayPath?: string[]
) => RawRecord[]

export type ClientChain = {
  api: (name: string) => ClientChain
  filter: (o: OpValue[]) => ClientChain
  limit: (n: number | undefined) => ClientChain
  skip: (n: number) => ClientChain
  pageSize(n: number | undefined): ClientChain
  transform: (t: TransformContent) => ClientChain
  query: (q: string[]) => ClientChain
  vars: (v: string[], forceString?: boolean) => ClientChain
  fetch: () => AsyncGenerator<FetchResult, void, void>
}

export type ClientOpts = {
  apiBaseURL: string
  apiName?: string
  credential: string[]
}

export abstract class ClientBase {
  _opts: ClientOpts
  _apiName: string = ''
  _filter: OpValue[] = []
  _skip: number = 0
  _limit: number | undefined = undefined
  _pageSize: number | undefined = undefined
  _query: string[] = []
  _vars: GqlVars = {}
  _transformer: TransformContent | undefined = undefined

  _setupErr: Error | undefined

  _recCnt: number = 0

  _arrayPath: string[] | undefined

  constructor(opts: ClientOpts) {
    this._opts = opts
    this._apiName = opts.apiName || ''
  }

  api(name: string): ClientChain {
    this._apiName = name
    return this
  }
  filter(o: OpValue[]): ClientChain {
    this._filter.push(...o)
    return this
  }
  limit(n: number | undefined): ClientChain {
    this._limit = n
    return this
  }
  skip(n: number): ClientChain {
    this._skip = n
    return this
  }
  pageSize(n: number | undefined): ClientChain {
    this._pageSize = n
    return this
  }
  query(q: string[]): ClientChain {
    try {
      this._query = q.map((v) => readQuery(v))
    } catch (err: any) {
      this._setupErr = new Error(`ClientBase.query: ${err}`)
    }
    return this
  }
  vars(v: string[], forceString?: boolean): ClientChain {
    try {
      Object.assign(this._vars, decodeVars(v, forceString))
    } catch (err: any) {
      this._setupErr = new Error(`ClientBase.vars: ${err}`)
    }
    return this
  }
  transform(t: TransformContent): ClientChain {
    this._transformer = t
    return this
  }
  protected resRecord(r: RawRecord): ResRecord {
    return new ResRecord(r)
  }
  protected _execTransform(content: any): RawRecord[] {
    if (this._transformer) {
      return this._transformer(content, this._arrayPath)
    }
    return content
  }
  abstract _fetch(p: FetchParams): Promise<FetchResult>
  async *fetch(): AsyncGenerator<FetchResult, void, void> {
    let skip = this._skip
    let pageSize = this._pageSize
    let limit = this._limit
    const query = this._query
    let count = 0

    if (this._setupErr) {
      throw new Error(`ClientBase: ${this._setupErr}`)
    }

    let res: FetchResult = { fetch: { count: 0, total: 0 }, content: [] }
    let complete = false
    while (!complete) {
      if (pageSize !== undefined && limit !== undefined) {
        // pageSize が指定されていた場合、最後の fetch 時のサイズを調整する.
        const s = limit - count
        if (pageSize > s) {
          pageSize = s
        }
      }

      res = await this._fetch({ skip, pageSize, query })

      count = count + res.fetch.count
      if (limit !== undefined) {
        const s = count - limit
        if (s >= 0) {
          complete = true
          if (s > 0) {
            // limit を超えてた場合は調整する.
            res.content = res.content.slice(0, res.content.length - s)
            res.fetch.count = res.fetch.count - s
          }
        }
      }
      skip = skip + res.fetch.count
      if (skip >= res.fetch.total) {
        // total は変動する. 最初のものを保持して使う?
        complete = true
      }
      yield res
    }
  }
  // clientChain: ClientChain = {
  //   api: this.api.bind(this),
  //   filter: this.filter.bind(this),
  //   limit: this.limit.bind(this),
  //   skip: this.skip.bind(this),
  //   transform: this.transform.bind(this),
  //   fetch: this.fetch.bind(this)
  // }

  abstract kind(): ClientKind // なくてもいいかな.
  request(): ClientChain {
    return this
  }
}

export type Client = (opst: ClientOpts) => ClientBase
