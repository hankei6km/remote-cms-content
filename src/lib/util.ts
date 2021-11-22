import { readFileSync } from 'fs'

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
