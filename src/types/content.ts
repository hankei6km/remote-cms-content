import { ClientInstance, OpValue } from './client.js'
import { MapConfig } from './map.js'

export type SaveRemoteContentsOptions = {
  client: ClientInstance
  apiName: string
  mapConfig: MapConfig
  dstContentsDir: string
  dstImagesDir: string
  staticRoot: string
  filter: OpValue[]
}
