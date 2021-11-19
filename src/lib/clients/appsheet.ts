import axios from 'axios'
import {
  Client,
  ClientBase,
  ClientChain,
  ClientKind,
  ClientOpts,
  FetchParams,
  FetchResult,
  OpValue,
  ResRecord,
  TransformContent
} from '../../types/client.js'

export type APIActionBody = {
  Action: 'Find'
  Properties: Record<string, any>
  Rows: any[]
}

export function apiActionPath(
  appId: string,
  table: string,
  accessKey: string
): string {
  const q = new URLSearchParams()
  q.append('ApplicationAccessKey', accessKey)
  // https://api.appsheet.com/api/v2/ と連結することを想定.
  return `apps/${encodeURIComponent(appId)}/tables/${encodeURIComponent(
    table
  )}/Action?${q.toString()}`
}

export function validateSelctorValue(s: string) {
  // '"' をエスケースする方法が不明だったので(\\ではダメぽい)、
  // 式に影響がありそうな文字があればエラーとする.
  if (
    s.includes('(') ||
    s.includes(')') ||
    s.includes('[') ||
    s.includes(']') ||
    s.includes('"') ||
    s.includes("'")
  ) {
    throw new Error(
      `validateSelctorValue: can't handle "()[]"'" AppSheet client: value: ${s}`
    )
  }
}

export function apiActionBodySelector(
  apiName: string,
  filter: OpValue[]
): string {
  if (filter.length > 0) {
    const t = filter
      .filter(([o]) => o === 'eq')
      .map(([_o, k, v]) => {
        validateSelctorValue(k)
        validateSelctorValue(v)
        return `[${k}]="${v}"`
      })
    const s = t.length > 1 ? `And(${t.join(',')})` : t[0]
    return `Filter("${apiName}",${s})`
  }
  return ''
}

export function apiActionBodyFind(
  props: Record<string, any> = {}
): APIActionBody {
  const ret: APIActionBody = {
    Action: 'Find' as const,
    Properties: {},
    Rows: []
  }
  Object.entries(props).forEach(([k, v]) => {
    if (v) {
      ret.Properties[k] = v
    }
  })
  return ret
}

export class ClientAppSheet extends ClientBase {
  kind(): ClientKind {
    return 'appsheet'
  }
  async _fetch(_p: FetchParams): Promise<FetchResult> {
    const res = await axios
      .post(
        `${this._opts.apiBaseURL}${apiActionPath(
          this._opts.credential[0],
          this._apiName,
          this._opts.credential[1]
        )}`,
        JSON.stringify(
          apiActionBodyFind({
            Selector: apiActionBodySelector(this._apiName, this._filter)
          })
        ),
        {
          headers: { 'Content-Type': ' application/json' }
        }
      )
      .catch((err) => {
        throw new Error(
          `client_appsheet.fetch API request error: table = ${this._apiName}, status = ${err.response.status}:${err.response.statusText}`
        )
      })
    if (res.data === '') {
      throw new Error(
        `client_appsheet.find API request error: table = ${this._apiName}, empty data received`
      )
    }

    const content = (
      this._transformer ? this._transformer(res.data) : res.data
    ).map((v: Record<string, unknown>) => new ResRecord(v))
    return {
      fetch: {
        total: res.data.length,
        count: res.data.length
      },
      content
    }
  }
}
