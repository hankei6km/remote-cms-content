import { readFileSync } from 'fs'
import { GqlVars } from '../types/gql.js'
import toNumber from 'lodash.tonumber'

export function readQuery(
  fileName: string,
  validator?: (text: string) => Error | undefined
): string {
  try {
    const t = readFileSync(fileName).toString()
    if (typeof validator === 'function') {
      const err = validator(t)
      if (err) {
        throw new Error(`validation: err=${err}`)
      }
    }
    return t
  } catch (err: any) {
    throw new Error(`readQuery: fileName=${fileName} err=${err}`)
  }
}

export function decodeVars(vars: string[], forceString?: boolean): GqlVars {
  const ret: GqlVars = {}
  vars
    .map<[keyof GqlVars, GqlVars[keyof GqlVars]]>((v) => {
      const kv = v.split('=')
      const len = kv.length
      if (len === 1 && !forceString) {
        // boolean の true として扱う.
        return [kv[0], true]
      } else if (len > 1) {
        const v = kv.slice(1).join('=')
        if (forceString || len > 2) {
          // string
          return [kv[0], v]
        }
        let n = v !== '' ? toNumber(v) : NaN
        if (!Number.isNaN(n)) {
          return [kv[0], n]
        } else if (v === 'true') {
          return [kv[0], true]
        } else if (v === 'false') {
          return [kv[0], false]
        } else if (typeof v === 'string') {
          return [kv[0], v]
        }
      }
      throw new Error(`decodeVars: invalid token ${v}`)
    })
    .forEach(([k, v]) => (ret[k] = v))
  return ret
}

export function apolloErrToMessages(err: any): string {
  if (
    typeof err === 'object' &&
    typeof err.message === 'string' &&
    err.graphQLErrors
  ) {
    return [
      err.message,
      ...Object.entries(err)
        .filter(
          ([_k, v]: [string, any]) => v && Array.isArray(v.result?.errors)
        )
        .map(([k, v]: [string, any]) =>
          v.result.errors
            .map(({ message }: any) => `${k}: ${message}`)
            .join('\n')
        )
    ].join('\n')
  }
  return err
}

export function yargsArrayFromEnvVars(arg: any): any {
  // https://github.com/yargs/yargs/issues/821
  if (typeof arg === 'object' && !Array.isArray(arg)) {
    const arr: any[] = []
    for (const [key, value] of Object.entries(arg)) {
      const idx = Number.parseInt(key, 10)
      if (!Number.isNaN(idx)) {
        arr[idx] = value
      } else {
        throw new Error(`filter: index of filter is not number: ${key}`)
      }
    }
    return arr
  }
  return arg
}
