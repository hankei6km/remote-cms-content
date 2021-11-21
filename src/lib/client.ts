import { ClientAppSheet } from './clients/appsheet.js'
import { ClientCtf, ClientCtfGql } from './clients/contentful.js'
import { ClientMicroCMS } from './clients/microcms.js'
import { ClientBase, ClientKind, ClientOpts } from '../types/client.js'

export function client(kind: ClientKind, opts: ClientOpts): ClientBase {
  if (kind === 'appsheet') {
    return new ClientAppSheet(opts)
  } else if (kind === 'contentful') {
    return new ClientCtf(opts)
  } else if (kind === 'contentful:gql') {
    return new ClientCtfGql(opts)
  } else if (kind === 'microcms') {
    return new ClientMicroCMS(opts)
  }
  throw new Error(`client: unknown kind ${kind}`)
}
