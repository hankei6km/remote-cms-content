import { jest } from '@jest/globals'
import mockAxiosDefault from 'jest-mock-axios'
import { ResRecord } from '../../../src/types/client.js'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

const { validateQueryFilterValue, queryFilters, ClientMicroCMS } = await import(
  '../../../src/lib/clients/microcms.js'
)

afterEach(() => {
  mockAxios.reset()
})

describe('validateQueryFilterValue', () => {
  it('should throw error', () => {
    expect(() => validateQueryFilterValue('abc[123')).toThrowError()
    expect(() => validateQueryFilterValue('abc]123')).toThrowError()
  })
  it('should not throw error', () => {
    expect(() => validateQueryFilterValue('abc123')).not.toThrowError()
  })
})

describe('queryFilters', () => {
  it('should return filter expression', () => {
    expect(queryFilters([['eq', 'k1', 'v1']])).toEqual('k1[equals]v1')
    expect(
      queryFilters([
        ['eq', 'k1', 'v1'],
        ['eq', 'k2', 'v2']
      ])
    ).toEqual('k1[equals]v1[and]k2[equals]v2')
  })
  it('should return blank', () => {
    expect(queryFilters([])).toEqual('')
  })
})

describe('client_appsheet', () => {
  it('should get bare content from microCMS app', async () => {
    const n = new Date().toUTCString()

    const c = new ClientMicroCMS({
      apiBaseURL: 'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/',
      apiName: 'tbl',
      credential: ['X-API-KEY', 'secret']
    }).request()
    const g = c.fetch()
    const next = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/tbl',
      {
        headers: { 'X-API-KEY': 'secret' },
        params: {}
      }
    )
    const mockData = {
      contents: [
        {
          _RowNumber: 1,
          id: 'idstring1',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title1'
        },
        {
          _RowNumber: 2,
          id: 'idstring2',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title2'
        }
      ],
      totalCount: 2
    }
    mockAxios.mockResponse({
      data: mockData
    })
    expect((await next).value).toEqual({
      fetch: { next: { kind: 'total', total: 2 }, count: 2 },
      content: mockData.contents.map((v) => new ResRecord(v))
    })
    expect((await g.next()).done).toBeTruthy()
  })
  it('should get bare content from microCMS app with filter', async () => {
    const n = new Date().toUTCString()

    const c = new ClientMicroCMS({
      apiBaseURL: 'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/',
      apiName: 'tbl',
      credential: ['X-API-KEY', 'secret']
    })
      .request()
      .filter([['eq', 'k1', 'v1']])
      .filter([['eq', 'k2', 'v2']])
    const g = c.fetch()
    const next = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/tbl',
      {
        headers: { 'X-API-KEY': 'secret' },
        params: { filters: 'k1[equals]v1[and]k2[equals]v2' }
      }
    )
    const mockData = {
      contents: [
        {
          _RowNumber: 1,
          id: 'idstring1',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title1'
        },
        {
          _RowNumber: 2,
          id: 'idstring2',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title2'
        }
      ],
      totalCount: 2
    }
    mockAxios.mockResponse({
      data: mockData
    })
    expect((await next).value).toEqual({
      fetch: { next: { kind: 'total', total: 2 }, count: 2 },
      content: mockData.contents.map((v) => new ResRecord(v))
    })
    expect((await g.next()).done).toBeTruthy()
  })
  it('should get bare content from microCMS app with paginate', async () => {
    const n = new Date().toUTCString()

    const c = new ClientMicroCMS({
      apiBaseURL: 'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/',
      apiName: 'tbl',
      credential: ['X-API-KEY', 'secret']
    })
      .request()
      .skip(5)
      .pageSize(50)
    const g = c.fetch()
    const next = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/tbl',
      {
        headers: { 'X-API-KEY': 'secret' },
        params: { offset: 5, limit: 50 }
      }
    )
    const mockData = {
      contents: [
        {
          _RowNumber: 1,
          id: 'idstring1',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title1'
        },
        {
          _RowNumber: 2,
          id: 'idstring2',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title2'
        }
      ],
      totalCount: 2
    }
    mockAxios.mockResponse({
      data: mockData
    })
    expect((await next).value).toEqual({
      fetch: { next: { kind: 'total', total: 2 }, count: 2 },
      content: mockData.contents.map((v) => new ResRecord(v))
    })
    expect((await g.next()).done).toBeTruthy()
  })
  it('should get bare content from microCMS app with selection fields', async () => {
    const n = new Date().toUTCString()

    const c = new ClientMicroCMS({
      apiBaseURL: 'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/',
      apiName: 'tbl',
      credential: ['X-API-KEY', 'secret']
    })
      .request()
      .flds(['title'])
    const g = c.fetch()
    const next = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/tbl',
      {
        headers: { 'X-API-KEY': 'secret' },
        params: { fields: ['id', 'createdAt', 'updatedAt', 'title'].join(',') }
      }
    )
    const mockData = {
      contents: [
        {
          id: 'idstring1',
          createdAt: n,
          updatedAt: n,
          title: 'title1'
        },
        {
          id: 'idstring2',
          createdAt: n,
          updatedAt: n,
          title: 'title1'
        }
      ],
      totalCount: 2
    }
    mockAxios.mockResponse({
      data: mockData
    })
    await next
    // fields の実際のレスポンスは検証できないので省略.
  })
  it('should get bare content from microCMS app with query vars', async () => {
    const n = new Date().toUTCString()

    const c = new ClientMicroCMS({
      apiBaseURL: 'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/',
      apiName: 'tbl',
      credential: ['X-API-KEY', 'secret']
    })
      .request()
      .vars([
        'orders=-updatedAt',
        'filters=createdAt[greater_than]2021-11',
        'offset=100' // offset は許可されていない.
      ])
    const g = c.fetch()
    const next = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/tbl',
      {
        headers: { 'X-API-KEY': 'secret' },
        params: {
          orders: '-updatedAt',
          filters: 'createdAt[greater_than]2021-11'
          // offset は許可されていない.
        }
      }
    )
    const mockData = {
      contents: [
        {
          id: 'idstring1',
          createdAt: n,
          updatedAt: n,
          title: 'title1'
        },
        {
          id: 'idstring2',
          createdAt: n,
          updatedAt: n,
          title: 'title1'
        }
      ],
      totalCount: 2
    }
    mockAxios.mockResponse({
      data: mockData
    })
    await next
    // query の実際のレスポンスは検証できないので省略.
  })
})

export {}
