import { jest } from '@jest/globals'
import mockAxiosDefault from 'jest-mock-axios'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

const { client } = await import('../../../src/lib/clients/microcms')

afterEach(() => {
  mockAxios.reset()
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
        headers: { 'X-API-KEY': 'secret' }
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
