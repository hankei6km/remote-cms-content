import { jest } from '@jest/globals'
import { ResRecord } from '../../src/types/client.js'

// > ENOENT: no such file or directory, open 'zlib'
// になる対応.
// contentful を import すると発生するが原理は不明.
jest.unstable_mockModule('contentful', async () => {
  return {
    default: jest.fn()
  }
})

const { readQuery: _readQuery, ...utils } = await import(
  '../../src/lib/util.js'
)
jest.unstable_mockModule('../../src/lib/util.js', async () => {
  return {
    readQuery: (v: string) => (v === 'error' ? new Error('query error') : v), // ファイル読み込みではなく、文字列をそのまま返す.
    ...utils
  }
})

const { client } = await import('../../src/lib/client.js')
const { ClientTest } = await import('./clientTest.js')

describe('ClientBase', () => {
  it('should fetch all content', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100)
    const g = c.fetch()
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 100 },
        content: c._record.map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 0,
      pageSize: undefined,
      query: []
    })
    expect(await g.next()).toEqual({
      value: undefined,
      done: true
    })
    expect(c._fetch).toHaveBeenCalledTimes(1)
  })
  it('should fetch all content with paginate', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100)
    const g = c.pageSize(30).fetch()
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 30 },
        content: c._record.slice(0, 30).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 0,
      pageSize: 30,
      query: []
    })
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 30 },
        content: c._record.slice(30, 60).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 30,
      pageSize: 30,
      query: []
    })
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 30 },
        content: c._record.slice(60, 90).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 60,
      pageSize: 30,
      query: []
    })
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 10 },
        content: c._record.slice(90, 100).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 90,
      pageSize: 30,
      query: []
    }) // limit を指定していない.
    expect(await g.next()).toEqual({
      value: undefined,
      done: true
    })
    expect(c._fetch).toHaveBeenCalledTimes(4)
  })
  it('should fetch part of content', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100)
    const g = c.skip(5).limit(11).fetch()
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 11 },
        content: c._record.slice(5, 16).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 5,
      pageSize: undefined,
      query: []
    })
    expect(c._fetch).toHaveBeenCalledTimes(1)
  })
  it('should fetch part of content with paginate', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100)
    const g = c.skip(5).pageSize(30).limit(75).fetch()
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 30 },
        content: c._record.slice(5, 35).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 5,
      pageSize: 30,
      query: []
    })
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 30 },
        content: c._record.slice(35, 65).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 35,
      pageSize: 30,
      query: []
    })
    expect(await g.next()).toEqual({
      value: {
        fetch: { next: { kind: 'total', total: 100 }, count: 15 },
        content: c._record.slice(65, 80).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({
      skip: 65,
      pageSize: 15,
      query: []
    })
    expect(await g.next()).toEqual({
      value: undefined,
      done: true
    })
    expect(c._fetch).toHaveBeenCalledTimes(3)
  })
  it('should throw error when error occured in chain(query)', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).query([
      'error'
    ])
    const g = c.fetch()
    await expect(g.next()).rejects.toThrowError(/query/)
  })
  it('should throw error when error occured in chain(vars)', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).vars(
      ['error'],
      true
    )
    const g = c.fetch()
    await expect(g.next()).rejects.toThrowError(/vars/)
  })
})

// https://github.com/facebook/jest/issues/11438
// 実際の client を使うのはここでのみ.
// 1 つの worker を共有する複数の spec の import 先で動的 import を使うとエラーになる.
// その対策.
describe('client', () => {
  it('should return appsheet client instanse', async () => {
    const c = await client('appsheet', {
      apiBaseURL: 'http://localhost:3000',
      credential: ['id', 'secret']
    })
    expect(c.kind()).toEqual('appsheet')
  })
  it('should return contentful client instanse', async () => {
    const c = await client('contentful', {
      apiBaseURL: '',
      credential: ['spaceId', 'cda_token']
    })
    expect(c.kind()).toEqual('contentful')
  })
  it('should return contentful:gql client instanse', async () => {
    const c = await client('contentful:gql', {
      apiBaseURL: 'https://graphql.contentful.com/content/v1/spaces/',
      credential: ['spaceId', 'cda_token']
    })
    expect(c.kind()).toEqual('contentful:gql')
  })
  it('should return microcms client instanse', async () => {
    const c = await client('microcms', {
      apiBaseURL: 'http://localhost:3000',
      credential: ['X-MICROCMS-API-KEY', 'secret']
    })
    expect(c.kind()).toEqual('microcms')
  })
  it('should throw error when pass unkown kid', async () => {
    await expect(() =>
      client('UNKWON' as any, {
        apiBaseURL: 'http://localhost:3000',
        credential: ['id', 'secret']
      })
    ).rejects.toThrowError('client: unknown kind UNKWON')
  })
})

export {}
