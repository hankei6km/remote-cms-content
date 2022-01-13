import { jest } from '@jest/globals'
import mockAxiosDefault from 'jest-mock-axios'
import { ResRecord } from '../../../src/types/client.js'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

const { ClientSssapi: ClientSssapi } = await import(
  '../../../src/lib/clients/sssapi.js'
)

afterEach(() => {
  mockAxios.reset()
})

describe('client_sssapi', () => {
  it('should get bare content from SSSAPI app', async () => {
    const n = new Date().toUTCString()

    const c = new ClientSssapi({
      apiBaseURL: 'https://api.sssapi.app/',
      apiName: 'XXXXX',
      credential: ['secret']
    }).request()
    const g = c.fetch()
    const next1 = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'https://api.sssapi.app/XXXXX',
      {
        headers: { Authorization: 'token secret' },
        params: { limit: 100 }
      }
    )
    const mockData = [
      {
        id: 1,
        title: 'Title1',
        content: 'Conent1'
      },
      {
        id: 2,
        title: 'Title2',
        content: 'Conent2'
      }
    ]

    mockAxios.mockResponse({
      data: mockData
    })
    expect((await next1).value).toEqual({
      fetch: {
        count: 2,
        next: { kind: 'page', endCursor: undefined, hasNextPage: true }
      },
      content: mockData.map((v) => new ResRecord(v))
    })
    expect((await next1).done).toBeFalsy()

    const next2 = g.next()
    expect((await next2).done).toBeTruthy()
  })
  it('should get bare content from SSSAPI app without pageSize', async () => {
    const n = new Date().toUTCString()

    const c = new ClientSssapi({
      apiBaseURL: 'https://api.sssapi.app/',
      apiName: 'XXXXX',
      credential: ['secret']
    })
      .request()
      .pageSize(undefined)
    const g = c.fetch()
    const next1 = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'https://api.sssapi.app/XXXXX',
      {
        headers: { Authorization: 'token secret' },
        params: {}
      }
    )
    const mockData = [
      {
        id: 1,
        title: 'Title1',
        content: 'Conent1'
      },
      {
        id: 2,
        title: 'Title2',
        content: 'Conent2'
      }
    ]

    mockAxios.mockResponse({
      data: mockData
    })
    expect((await next1).value).toEqual({
      fetch: {
        count: 2,
        next: { kind: 'page', endCursor: undefined, hasNextPage: true }
      },
      content: mockData.map((v) => new ResRecord(v))
    })
    expect((await next1).done).toBeFalsy()

    const next2 = g.next()
    mockAxios.mockResponse({
      data: []
    })
    expect((await next2).value).toEqual({
      fetch: {
        count: 0,
        next: { kind: 'page', endCursor: undefined, hasNextPage: true }
      },
      content: []
    })
    expect((await next2).done).toBeFalsy()

    const next3 = g.next()
    expect((await next3).done).toBeTruthy()
  })
  it('should get bare content from SSSAPI app with filters', async () => {
    const c = new ClientSssapi({
      apiBaseURL: 'https://api.sssapi.app/',
      apiName: 'XXXXX',
      credential: ['secret']
    })
      .request()
      .filter([['eq', 'filter__id__gt', '2']])
      .filter([['eq', 'order_by', 'id']])
    const g = c.fetch()
    const next1 = g.next()
    expect(mockAxios.get).toHaveBeenLastCalledWith(
      'https://api.sssapi.app/XXXXX',
      {
        headers: { Authorization: 'token secret' },
        params: { limit: 100, filter__id__gt: '2', order_by: 'id' }
      }
    )
    const mockData = [
      {
        id: 1,
        title: 'Title1',
        content: 'Conent1'
      },
      {
        id: 2,
        title: 'Title2',
        content: 'Conent2'
      }
    ]
    mockAxios.mockResponse({
      data: mockData
    })
    await next1
  })
})

export {}
