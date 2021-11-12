import { jest } from '@jest/globals'
import mockAxiosDefault from 'jest-mock-axios'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

const { validateQueryFilterValue, queryFilters, client } = await import(
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
  it('should get bare contents from microCMS app', async () => {
    const n = new Date().toUTCString()

    const res = client({
      apiBaseURL: 'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/',
      apiName: 'tbl',
      credential: ['X-API-KEY', 'secret']
    })
      .request()
      .fetch()
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
      ]
    }
    mockAxios.mockResponse({
      data: mockData
    })
    expect(await res).toEqual({ contents: mockData.contents })
  })
  it('should get bare contents from microCMS app with filter', async () => {
    const n = new Date().toUTCString()

    const res = client({
      apiBaseURL: 'http://localhost:3000/test-nuxt-0x.microcms.io/api/v1/',
      apiName: 'tbl',
      credential: ['X-API-KEY', 'secret']
    })
      .request()
      .filter([['eq', 'k1', 'v1']])
      .filter([['eq', 'k2', 'v2']])
      .fetch()
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
      ]
    }
    mockAxios.mockResponse({
      data: mockData
    })
    expect(await res).toEqual({ contents: mockData.contents })
  })
})

export {}
