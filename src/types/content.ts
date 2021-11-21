import { ClientBase, OpValue } from './client.js'
import { MapConfig } from './map.js'

export type SaveRemoteContentOptions = {
  client: ClientBase
  apiName: string
  mapConfig: MapConfig
  dstContentDir: string
  dstImagesDir: string
  staticRoot: string
  skip: number
  limit?: number
  pageSize?: number
  filter: OpValue[]
  query: string[]
}
