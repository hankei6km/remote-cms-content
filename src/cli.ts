import { Writable } from 'stream'
import { client } from './lib/client.js'
import { saveRemoteContents } from './lib/content.js'
import { loadMapConfig } from './lib/map.js'
import { ClientKind } from './types/client.js'

type SaveOpts = {
  apiName: string
  dstContentsDir: string
  dstImagesDir: string
  staticRoot: string
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
  try {
    switch (command) {
      case 'save':
        cliErr = await saveRemoteContents({
          client: client(clientKind, {
            apiBaseURL,
            credential: [...credential]
          }),
          mapConfig: await loadMapConfig(mapConfig),
          ...saveOpts
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
