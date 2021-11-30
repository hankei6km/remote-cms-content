import { Writable } from 'stream'
import { client } from './lib/client.js'
import { saveRemoteContent } from './lib/content.js'
import { initLog, printErr } from './lib/log.js'
import { loadMapConfig } from './lib/map.js'
import { decodeFilter } from './lib/util.js'
import { ClientKind, OpValue } from './types/client.js'

type SaveOpts = {
  apiName: string
  dstContentDir: string
  dstImagesDir: string
  staticRoot: string
  skip: number
  limit?: number
  pageSize?: number
  positioStart?: number
  maxRepeat: number
  filter: string[]
  query: string[]
  vars: string[]
  varsStr: string[]
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
  initLog(stdout, stderr)
  try {
    switch (command) {
      case 'save':
        const filter: OpValue[] = decodeFilter(saveOpts.filter)
        cliErr = await saveRemoteContent({
          client: await client(clientKind, {
            apiBaseURL,
            apiName: saveOpts.apiName,
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
    printErr(cliErr.toString())
    return 1
  }
  return 0
}
