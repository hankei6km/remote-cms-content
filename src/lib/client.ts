import { client as clientAppSheet } from './clients/appsheet.js'
import { ClientInstance, ClientKind, ClientOpts } from '../types/client.js'

export function client(kind: ClientKind, opts: ClientOpts): ClientInstance {
  if (kind === 'appsheet') {
    return clientAppSheet(opts)
  }
  throw new Error(`client: unknown kind ${kind}`)
}
