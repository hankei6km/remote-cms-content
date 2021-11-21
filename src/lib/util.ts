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
