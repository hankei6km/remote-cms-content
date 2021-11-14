import axios from 'axios'
import {
  Client,
  ClientChain,
  ClientInstance,
  ClientOpts,
  FetchResult,
  OpValue,
  TransformContents
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

export const client: Client = function client({
  apiBaseURL,
  apiName: inApiName,
  credential
}: ClientOpts): ClientInstance {
  const request = () => {
    let apiName: string = inApiName || ''
    const filter: OpValue[] = []
    let skip: number | undefined = undefined
    let limit: number | undefined = undefined
    let transformer: TransformContents | undefined = undefined

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
      transform(t: TransformContents) {
        transformer = t
        return clientChain
      },
      async fetch(): Promise<FetchResult> {
        const res = await axios
          .post(
            `${apiBaseURL}${apiActionPath(
              credential[0],
              apiName,
              credential[1]
            )}`,
            JSON.stringify(
              apiActionBodyFind({
                Selector: apiActionBodySelector(apiName, filter)
              })
            ),
            {
              headers: { 'Content-Type': ' application/json' }
            }
          )
          .catch((err) => {
            throw new Error(
              `client_appsheet.fetch API request error: table = ${apiName}, status = ${err.response.status}:${err.response.statusText}`
            )
          })
        if (res.data === '') {
          throw new Error(
            `client_appsheet.find API request error: table = ${apiName}, empty data received`
          )
        }

        return { contents: transformer ? transformer(res.data) : res.data }
      }
    }
    return clientChain
  }
  return {
    kind: () => 'appsheet',
    request
  }
}
