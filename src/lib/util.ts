import { readFileSync } from 'fs'
import toNumber from 'lodash.tonumber'
import { OpValue, QuerylVars } from '../types/client.js'

export function decodeFilter(filter: string[]): OpValue[] {
  return filter
    .map((f) => {
      const t = f.split('=')
      if (t.length > 1) {
        return ['=', t[0], t.slice(1).join('=')]
      }
      return []
    })
    .filter(([o]) => o === '=')
    .map(([_o, k, v]) => ['eq', k, v])
}

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

export function decodeVars(vars: string[], forceString?: boolean): QuerylVars {
  const ret: QuerylVars = {}
  vars
    .map<[keyof QuerylVars, QuerylVars[keyof QuerylVars]]>((v) => {
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
        .map(([k, v]: [string, any]) => {
          if (v) {
            if (Array.isArray(v.result?.errors)) {
              return v.result.errors
                .map(({ message }: any) => `${k}: ${message}`)
                .join('\n')
            } else if (v.bodyText) {
              return `${k}: ${v.statusCode} ${v.bodyText}`
            }
          }
          return ''
        })
        .filter((v) => v !== '')
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

const isJsonataQueryRegExp = /[\.\[\]\^(){}*%#@$=!<>&?:~|]/
export function isJsonataQuery(s: string): boolean {
  return s.match(isJsonataQueryRegExp) !== null
}
