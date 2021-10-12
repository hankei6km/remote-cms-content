import axios from 'axios'
import {
  Client,
  ClientChain,
  ClientInstance,
  ClientOpts,
  FetchResult
} from '../../types/client.js'

export type APIActionBody = {
  Action: 'Find'
  Properties: any
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

export function apiActionBodyFind(
  props?: Record<string, string>
): APIActionBody {
  return {
    Action: 'Find',
    Properties: props || {},
    Rows: []
  }
}

export const client: Client = function client({
  apiBaseURL,
  apiName,
  credential
}: ClientOpts): ClientInstance {
  const request = () => {
    let skip: number | undefined = undefined
    let limit: number | undefined = undefined

    const clientChain: ClientChain = {
      limit(n: number) {
        limit = n
        return clientChain
      },
      skip(n: number) {
        skip = n
        return clientChain
      },
      async fetch(): Promise<FetchResult> {
        const res = await axios
          .post(
            `${apiBaseURL}${apiActionPath(
              credential[0],
              apiName || '',
              credential[1]
            )}`,
            JSON.stringify(apiActionBodyFind({})), // TODO: props の扱い.
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

        return { rows: res.data }
      }
    }
    return clientChain
  }
  return { request }
}
