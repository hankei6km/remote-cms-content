import { jest } from '@jest/globals'
import mockAxiosDefault from 'jest-mock-axios'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

// await import('axios')
const { apiActionPath, client } = await import(
  '../../../src/lib/clients/appsheet.js'
)

afterEach(() => {
  mockAxios.reset()
})

describe('client_appsheet', () => {
  it('should get bare contents(rows) from AppSheet app', async () => {
    const n = new Date().toUTCString()

    const res = client({
      apiBaseURL: 'https://api.appsheet.com/api/v2/',
      apiName: 'tbl',
      credential: ['appId', 'secret']
    })
      .request()
      .fetch()
    expect(mockAxios.post).toHaveBeenLastCalledWith(
      `https://api.appsheet.com/api/v2/${apiActionPath(
        'appId',
        'tbl',
        'secret'
      )}`,
      '{"Action":"Find","Properties":{},"Rows":[]}',
      {
        headers: { 'Content-Type': ' application/json' }
      }
    )
    const mockData = [
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
    mockAxios.mockResponse({
      data: mockData
    })
    expect(await res).toEqual({ contents: mockData })
  })
})

export {}
