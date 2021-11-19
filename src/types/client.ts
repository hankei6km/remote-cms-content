import { MapFld } from './map.js'

export const ClientKindValues = ['appsheet', 'contentful', 'microcms'] as const
export type ClientKind = typeof ClientKindValues[number]

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
    return this.record.hasOwnProperty(map.srcName)
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
  getSync(map: MapFld): unknown {
    return this.record[map.srcName]
  }
  async getAsync(map: MapFld): Promise<unknown> {
    return this.record[map.srcName]
  }
}

export type FetchResult = {
  content: ResRecord[]
}

export const OpKindValues = ['eq'] as const
export type OpKind = typeof OpKindValues[number]
export type OpValue = [OpKind, string, any]

export type TransformContent = (
  content: Record<string, unknown>[]
) => Record<string, unknown>[]

export type ClientChain = {
  api: (name: string) => ClientChain
  filter: (o: OpValue[]) => ClientChain
  limit: (n: number) => ClientChain
  skip: (n: number) => ClientChain
  pageSize(n: number): ClientChain
  transform: (t: TransformContent) => ClientChain
  fetch: () => Promise<FetchResult>
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
  _skip: number | undefined = undefined
  _limit: number | undefined = undefined
  _pageSize: number | undefined = undefined
  _transformer: TransformContent | undefined = undefined

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
  limit(n: number): ClientChain {
    this._limit = n
    return this
  }
  skip(n: number): ClientChain {
    this._skip = n
    return this
  }
  pageSize(n: number): ClientChain {
    this._pageSize = n
    return this
  }
  transform(t: TransformContent): ClientChain {
    this._transformer = t
    return this
  }
  abstract fetch(): Promise<FetchResult>
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
