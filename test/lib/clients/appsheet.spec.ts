import mockAxios from 'jest-mock-axios'
import { apiActionPath, client } from '../../../src/lib/clients/appsheet.js'

afterEach(() => {
  mockAxios.reset()
})

describe('client_appsheet', () => {
  it('should get bare rows from AppSheet app', async () => {
    const n = new Date().toUTCString()

    const res = client({
      apiBaseURL: 'https://api.appsheet.com/api/v2/',
      apiName: 'tbl',
      credential: ['appId', 'secret']
    }).request().fetch()
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
    expect(await res).toEqual({rows:mockData})
  })
})
