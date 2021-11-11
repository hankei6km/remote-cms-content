import { jest } from '@jest/globals'

// > ENOENT: no such file or directory, open 'zlib'
// になる対応.
// contentful を import すると発生するが原理は不明.
jest.unstable_mockModule('contentful', async () => {
  return {
    default: jest.fn()
  }
})

const { client } = await import('../../src/lib/client.js')

describe('client', () => {
  it('should return appsheet client instanse', () => {
    const c = client('appsheet', {
      apiBaseURL: 'http://localhost:3000',
      credential: ['id', 'secret']
    })
    expect(c.kind()).toEqual('appsheet')
  })
  it('should return contentful client instanse', () => {
    const c = client('contentful', {
      apiBaseURL: '',
      credential: ['spaceId', 'cda_token']
    })
    expect(c.kind()).toEqual('contentful')
  })
  it('should return microcms client instanse', () => {
    const c = client('microcms', {
      apiBaseURL: 'http://localhost:3000',
      credential: ['X-MICROCMS-API-KEY', 'secret']
    })
    expect(c.kind()).toEqual('appsheet')
  })
  it('should throw error when pass unkown kid', () => {
    expect(() =>
      client('UNKWON' as any, {
        apiBaseURL: 'http://localhost:3000',
        credential: ['id', 'secret']
      })
    ).toThrowError('client: unknown kind UNKWON')
  })
})

export {}
