import axios, { AxiosRequestConfig } from 'axios'
import {
  Client,
  ClientChain,
  ClientInstance,
  ClientOpts,
  FetchResult,
  OpValue,
  ResRecord,
  TransformContent
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

export const client: Client = function client({
  apiBaseURL,
  apiName: inApiName,
  credential
}: ClientOpts): ClientInstance {
  if (credential[0] !== 'X-API-KEY' && credential[0] !== 'X-MICROCMS-API-KEY') {
    throw new Error(`client: the headers key is invalid: ${credential[0]}`)
  }
  const request = () => {
    let apiName: string | undefined = inApiName
    const filter: OpValue[] = []
    let skip: number | undefined = undefined
    let limit: number | undefined = undefined
    let transformer: TransformContent | undefined = undefined

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
      transform(t: TransformContent) {
        transformer = t
        return clientChain
      },
      async fetch(): Promise<FetchResult> {
        const headers: AxiosRequestConfig['headers'] = {}
        headers[credential[0]] = credential[1]
        const params: Record<string, any> = {}
        const filterString = queryFilters(filter)
        if (filterString) {
          params['filters'] = filterString
        }
        const res = await axios
          .get(`${apiBaseURL}${apiName || ''}`, {
            headers,
            params
          })
          .catch((err) => {
            throw new Error(
              `client_microcms.fetch API request error: api = ${apiName}, status = ${err.response.status}:${err.response.statusText}`
            )
          })
        if (res.data === '') {
          throw new Error(
            `client_microcms.find API request error: api = ${apiName}, empty data received`
          )
        }

        const content = (
          transformer ? transformer(res.data.contents) : res.data.contents
        ).map((v: Record<string, unknown>) => new ResRecord(v))
        return {
          content
        }
      }
    }
    return clientChain
  }
  return {
    kind: () => 'appsheet',
    request
  }
}
