import axios, { AxiosRequestConfig } from 'axios'
import {
  Client,
  ClientChain,
  ClientInstance,
  ClientOpts,
  FetchResult
} from '../../types/client.js'

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
    let skip: number | undefined = undefined
    let limit: number | undefined = undefined

    const clientChain: ClientChain = {
      api(name: string) {
        apiName = name
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
      async fetch(): Promise<FetchResult> {
        const headers: AxiosRequestConfig['headers'] = {}
        headers[credential[0]] = credential[1]
        const res = await axios
          .get(`${apiBaseURL}${apiName || ''}`, {
            headers
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
        return { contents: res.data.contents }
      }
    }
    return clientChain
  }
  return {
    kind: () => 'appsheet',
    request
  }
}
