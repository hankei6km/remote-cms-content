import { jest } from '@jest/globals'

jest.unstable_mockModule('@apollo/client', async () => {
  const mockHttpLink = jest.fn()
  const reset = () => {
    mockHttpLink.mockReset()
  }
  reset()
  return {
    default: {
      // なぜか CJS  で import される症状の暫定対応.
      HttpLink: mockHttpLink
    },
    _reset: reset,
    _getMocks: () => ({
      mockHttpLink
    })
  }
})

const mockApolloClient = await import('@apollo/client')
const { mockHttpLink } = (mockApolloClient as any)._getMocks()
const { ClientGcmsGql } = await import('../../../src/lib/clients/graphcms.js')

afterEach(async () => {
  ;(mockApolloClient as any)._reset()
})

describe('client_grapghcms:gql', () => {
  it('should setup HttpLink', async () => {
    new ClientGcmsGql({
      apiBaseURL: 'https://[region].graphcms.com/v2/',
      credential: ['projectId', 'pat'],
      apiName: 'master'
    })
    const p = mockHttpLink.mock.calls[0][0]
    expect(p.uri).toEqual('https://[region].graphcms.com/v2/projectId/master')
    expect(p.headers).toEqual({ Authorization: 'Bearer pat' })
  })
  it('should throw error when environment(apiName) is blank', async () => {
    expect(
      () =>
        new ClientGcmsGql({
          apiBaseURL: 'https://[region].graphcms.com/v2/',
          credential: ['projectId', 'pat'],
          apiName: ''
        })
    ).toThrowError(/environment/)
  })
})

export {}
