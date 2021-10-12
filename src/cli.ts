import fs from 'fs/promises'
import { Writable } from 'stream'
import { client } from './lib/client.js'
import { saveRemoteContents } from './lib/content.js'
import { ClientKind } from './types/client.js'

type SaveOpts = {
  apiName: string
  dstContentsDir: string
  dstImagesDir: string
  staticRoot: string
  imageInfo: boolean
}

type Opts = {
  command: string
  stdout: Writable
  stderr: Writable
  clientKind: ClientKind
  apiBaseURL: string
  appId: string
  mapConfig: string
  accessKey: string
  saveOpts: SaveOpts
}
const cli = async ({
  command,
  stdout,
  stderr,
  clientKind,
  apiBaseURL,
  appId,
  mapConfig,
  accessKey,
  saveOpts
}: Opts): Promise<number> => {
  let cliErr: Error | null = null
  try {
    switch (command) {
      case 'save':
        cliErr = await saveRemoteContents({
          client: client(clientKind,{ apiBaseURL, credential: [appId, accessKey] }),
          mapConfig: JSON.parse((await fs.readFile(mapConfig)).toString()),
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

export default cli
