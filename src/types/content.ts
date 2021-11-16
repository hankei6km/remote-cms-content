import { ClientInstance, OpValue } from './client.js'
import { MapConfig } from './map.js'

export type SaveRemoteContentOptions = {
  client: ClientInstance
  apiName: string
  mapConfig: MapConfig
  dstContentDir: string
  dstImagesDir: string
  staticRoot: string
  filter: OpValue[]
}
