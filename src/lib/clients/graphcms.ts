import fetch from 'cross-fetch'
// SyntaxError: Named export 'HttpLink' not found. The requested module '@apollo/client' is a CommonJS module, which may not support all module.exports as named exports.
// CommonJS modules can always be imported via the default export, for example using:
// import pkg from '@apollo/client';
// const { HttpLink: HttpLink } = pkg;
// なぜかこのエラーになるので対応.
// types/gql.ts でも同じようなことになっている.
import pkgApolloClient from '@apollo/client'
const { HttpLink: HttpLink } = pkgApolloClient
import { ClientKind, ClientOpts } from '../../types/client.js'
import { ClientGqlBase } from '../../types/gql.js'

export class ClientGcmsGql extends ClientGqlBase {
  constructor(opts: ClientOpts) {
    if (!opts.apiName) {
      throw new Error(
        'graphcms:gql constructor: environment(apiName) is not specified'
      )
    }
    const link = new HttpLink({
      uri: `${opts.apiBaseURL}${opts.credential[0]}/${opts.apiName}`,
      fetch,
      headers: {
        Authorization: `Bearer ${opts.credential[1]}`
      }
    })
    super(link, opts)
  }
  kind(): ClientKind {
    return 'graphcms:gql'
  }
}
