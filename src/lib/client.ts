import { ClientBase, ClientKind, ClientOpts } from '../types/client.js'

export async function client(
  kind: ClientKind,
  opts: ClientOpts
): Promise<ClientBase> {
  if (kind === 'appsheet') {
    const { ClientAppSheet } = await import('./clients/appsheet.js')
    return new ClientAppSheet(opts)
  } else if (kind === 'contentful') {
    const { ClientCtf } = await import('./clients/contentful.js')
    return new ClientCtf(opts)
  } else if (kind === 'contentful:gql') {
    const { ClientCtfGql } = await import('./clients/contentful.js')
    return new ClientCtfGql(opts)
  } else if (kind === 'microcms') {
    const { ClientMicroCMS } = await import('./clients/microcms.js')
    return new ClientMicroCMS(opts)
  }
  throw new Error(`client: unknown kind ${kind}`)
}
