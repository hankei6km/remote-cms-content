import { client } from '../../src/lib/client.js'

describe('client', () => {
  it('should return appsheet client instanse', () => {
    const c = client('appsheet', {
      apiBaseURL: 'http://localhost:3000',
      credential: ['id', 'secret']
    })
    expect(c.kind()).toEqual('appsheet')
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
