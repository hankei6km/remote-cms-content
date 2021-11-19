import { jest } from '@jest/globals'
import { ResRecord } from '../../src/types/client.js'
import { ClientTest } from './clientTest.js'

// > ENOENT: no such file or directory, open 'zlib'
// になる対応.
// contentful を import すると発生するが原理は不明.
jest.unstable_mockModule('contentful', async () => {
  return {
    default: jest.fn()
  }
})

const { client } = await import('../../src/lib/client.js')

describe('ClientBase', () => {
  it('should fetch all content', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100)
    const g = c.fetch()
    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 100, count: 100 },
        content: c._record.map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 0, pageSize: undefined })
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
        fetch: { total: 100, count: 30 },
        content: c._record.slice(0, 30).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 0, pageSize: 30 })
    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 100, count: 30 },
        content: c._record.slice(30, 60).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 30, pageSize: 30 })
    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 100, count: 30 },
        content: c._record.slice(60, 90).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 60, pageSize: 30 })
    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 100, count: 10 },
        content: c._record.slice(90, 100).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 90, pageSize: 30 }) // limit を指定していない.
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
        fetch: { total: 100, count: 11 },
        content: c._record.slice(5, 16).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 5, pageSize: undefined })
    expect(c._fetch).toHaveBeenCalledTimes(1)
  })
  it('should fetch part of content with paginate', async () => {
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100)
    const g = c.skip(5).pageSize(30).limit(75).fetch()
    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 100, count: 30 },
        content: c._record.slice(5, 35).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 5, pageSize: 30 })
    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 100, count: 30 },
        content: c._record.slice(35, 65).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 35, pageSize: 30 })
    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 100, count: 15 },
        content: c._record.slice(65, 80).map((v) => new ResRecord(v))
      },
      done: false
    })
    expect(c._fetch).toHaveBeenLastCalledWith({ skip: 65, pageSize: 15 })
    expect(await g.next()).toEqual({
      value: undefined,
      done: true
    })
    expect(c._fetch).toHaveBeenCalledTimes(3)
  })
})

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
    expect(c.kind()).toEqual('microcms')
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
