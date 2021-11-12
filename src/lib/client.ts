import { client as clientAppSheet } from './clients/appsheet.js'
import { client as clientContentful } from './clients/contentful.js'
import { client as clientMicroCMS } from './clients/microcms.js'
import { ClientInstance, ClientKind, ClientOpts } from '../types/client.js'

export function client(kind: ClientKind, opts: ClientOpts): ClientInstance {
  if (kind === 'appsheet') {
    return clientAppSheet(opts)
  } else if (kind === 'contentful') {
    return clientContentful(opts)
  } else if (kind === 'microcms') {
    return clientMicroCMS(opts)
  }
  throw new Error(`client: unknown kind ${kind}`)
}
