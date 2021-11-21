import axios, { AxiosRequestConfig } from 'axios'
import {
  ClientBase,
  ClientKind,
  FetchParams,
  FetchResult,
  OpValue
} from '../../types/client.js'

export function validateQueryFilterValue(s: string) {
  // '[' をエスケースする方法が不明だったので
  // 式に影響がありそうな文字があればエラーとする.
  // q はマルチバイト文字を URL エンコードしろとあったので
  // 試しに二重にエンコードしてみたが効果はなさそう.
  if (s.includes('[') || s.includes(']')) {
    throw new Error(
      `validateSelctorValue: can't handle "()[]"'" AppSheet client: value: ${s}`
    )
  }
}

export function queryFilters(filter: OpValue[]): string {
  return filter
    .filter(([o]) => o === 'eq')
    .map(([_o, k, v]) => {
      validateQueryFilterValue(k)
      validateQueryFilterValue(v)
      return `${k}[equals]${v}`
    })
    .join('[and]')
}

export class ClientMicroCMS extends ClientBase {
  kind(): ClientKind {
    return 'microcms'
  }
  async _fetch({ skip, pageSize }: FetchParams): Promise<FetchResult> {
    const headers: AxiosRequestConfig['headers'] = {}
    headers[this._opts.credential[0]] = this._opts.credential[1]
    const params: Record<string, any> = {}
    const filterString = queryFilters(this._filter)
    if (filterString) {
      params['filters'] = filterString
    }
    if (skip > 0) {
      params['offset'] = skip
    }
    if (pageSize !== undefined) {
      params['limit'] = pageSize
    }
    const res = await axios
      .get(`${this._opts.apiBaseURL}${this._apiName || ''}`, {
        headers,
        params
      })
      .catch((err) => {
        throw new Error(
          `client_microcms.fetch API request error: api = ${this._apiName}, status = ${err.response.status}:${err.response.statusText}`
        )
      })
    if (res.data === '') {
      throw new Error(
        `client_microcms.find API request error: api = ${this._apiName}, empty data received`
      )
    }

    const content = this._execTransform(res.data.contents).map(
      (v: Record<string, unknown>) => this.resRecord(v)
    )
    return {
      fetch: {
        total: res.data.totalCount,
        count: res.data.contents.length
      },
      content
    }
  }
}
