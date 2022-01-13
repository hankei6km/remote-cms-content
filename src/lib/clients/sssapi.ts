import axios, { AxiosRequestConfig } from 'axios'
import {
  ClientBase,
  ClientKind,
  FetchParams,
  FetchResult,
  OpValue
} from '../../types/client.js'

export function queryEquality(filter: OpValue[]): Record<string, any> {
  const ret: Record<string, any> = {}
  filter
    .filter(([o]) => o === 'eq')
    .forEach(([_o, k, v]) => {
      ret[k] = v
    })
  return ret
}

export class ClientSssapi extends ClientBase {
  protected _pageSize: number | undefined = 100
  kind(): ClientKind {
    return 'sssapi'
  }
  protected _fldsBaseName: string[] = ['id']
  async _fetch({ skip, pageSize }: FetchParams): Promise<FetchResult> {
    const headers: AxiosRequestConfig['headers'] = {}
    headers['Authorization'] = `token ${this._opts.credential[0]}`
    const params: Record<string, any> = {
      ...queryEquality(this._filter)
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
          `client_sssapi.fetch API request error: api = ${this._apiName}, status = ${err.response.status}:${err.response.statusText}`
        )
      })
    if (res.data === '') {
      throw new Error(
        `client_sssapi.find API request error: api = ${this._apiName}, empty data received`
      )
    }

    const content = this._execTransform(res.data).map(
      (v: Record<string, unknown>) => this.resRecord(v)
    )
    return {
      fetch: {
        count: res.data.length,
        // SSSAPI は total が不明.
        next: {
          kind: 'page',
          hasNextPage: true,
          endCursor: undefined
        }
      },
      content
    }
  }
}
