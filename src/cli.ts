import { Writable } from 'stream'
import { client } from './lib/client.js'
import { saveRemoteContent } from './lib/content.js'
import { loadMapConfig } from './lib/map.js'
import { ClientKind, OpValue } from './types/client.js'

type SaveOpts = {
  apiName: string
  dstContentDir: string
  dstImagesDir: string
  staticRoot: string
  skip: number
  limit?: number
  pageSize?: number
  filter: string[]
}

type Opts = {
  command: string
  stdout: Writable
  stderr: Writable
  clientKind: ClientKind
  apiBaseURL: string
  credential: string[]
  mapConfig: string
  saveOpts: SaveOpts
}

export function decodeFilter(filter: string[]): OpValue[] {
  return filter
    .map((f) => {
      const t = f.split('=', 2)
      if (t.length === 2) {
        return ['=', ...t]
      }
      return []
    })
    .filter(([o]) => o === '=')
    .map(([_o, k, v]) => ['eq', k, v])
}

export const cli = async ({
  command,
  stdout,
  stderr,
  clientKind,
  apiBaseURL,
  credential,
  mapConfig,
  saveOpts
}: Opts): Promise<number> => {
  let cliErr: Error | null = null
  try {
    switch (command) {
      case 'save':
        const filter: OpValue[] = decodeFilter(saveOpts.filter)
        cliErr = await saveRemoteContent({
          client: client(clientKind, {
            apiBaseURL,
            credential: [...credential]
          }),
          mapConfig: await loadMapConfig(mapConfig),
          ...saveOpts,
          filter
        })
        break
    }
  } catch (err: any) {
    cliErr = err
  }
  if (cliErr) {
    stderr.write(cliErr.toString())
    stderr.write('\n')
    return 1
  }
  return 0
}
