import { jest } from '@jest/globals'
import { ApolloLink, HttpLink } from '@apollo/client'
import { ClientKind, RawRecord } from '../../src/types/client.js' // type の export は import() で扱えない?(d.ts だから?)

const { readQuery: _readQuery, ...utils } = await import(
  '../../src/lib/util.js'
)
jest.unstable_mockModule('../../src/lib/util.js', async () => {
  return {
    readQuery: (v: string) => v, // ファイル読み込みではなく、文字列をそのまま返す.
    ...utils
  }
})
const { ResRecord } = await import('../../src/types/client.js') // mock は object を import する順番に左右される.
const { ClientGqlBase } = await import('../../src/types/gql.js')

const testLink = new ApolloLink((operation, forward) => {
  console.log(operation.query)
  return forward(operation)
})

const mockFetchLink = (mockData: Record<string, any>): [any, ApolloLink] => {
  // const mockFetch = jest.fn().mockResolvedValue({
  //   status: 200,
  //   text: jest.fn().mockResolvedValue(JSON.stringify(data) as never)
  // } as never)
  const data = JSON.parse(JSON.stringify(mockData.data))
  const items = data.testCollection.items
  const mockFetch = jest.fn(async (_u: string, p: any) => {
    const v = JSON.parse(p.body).variables
    const end = v.pageSize === undefined ? undefined : v.skip + v.pageSize
    data.testCollection.items = items.slice(v.skip, end)
    return new Promise((resolve) => {
      process.nextTick(() =>
        resolve({
          status: 200,
          text: jest.fn().mockResolvedValue(JSON.stringify({ data }) as never)
        } as never)
      )
    })
  })
  return [
    mockFetch,
    new HttpLink({
      uri: '',
      fetch: mockFetch as unknown as any
    })
  ]
}

class ClienteGqlTest extends ClientGqlBase {
  kind(): ClientKind {
    return 'contentful:gql'
  }
  arrayPath() {
    return ['items']
  }
  extractArrayItem(o: object): RawRecord[] {
    // ここが実行される時点で arrayPath は array であることが検証されている.
    return (o as any)['items'] as RawRecord[]
  }
  _extractTotal(o: object): number {
    // 呼び出し元のメソッドで number であることが検証される.
    return (o as any).total
  }
}

describe('ClientGql', () => {
  const query = [
    `
      query GetItems($skip: Int, $pageSize: Int, $var1: Int) {
        testCollection(skip: $skip, limt: $pageSize, var1: $var1) {
          items {
            title
            content
          }
          total
        }
      }
      `
  ]
  const genItems = (n: number) => {
    return new Array(n).fill({}).map((_v, i) => ({
      title: `title${i}`,
      content: `text${i}`
    }))
  }
  it('should fetch all content', async () => {
    const mockData = {
      data: {
        testCollection: {
          items: genItems(2),
          total: 2
        }
      },
      errors: {}
    }
    const [mockFetch, mockLink] = mockFetchLink(mockData)
    const client = new ClienteGqlTest(mockLink, {
      apiBaseURL: '',
      credential: []
    })
      .request()
      .transform((content) => content.testCollection)
      .query(query)
    const g = client.fetch()

    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 2, count: 2 },
        content: mockData.data.testCollection.items.map((v) => new ResRecord(v))
      },
      done: false
    })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.query).toMatch(/testCollection/)
    expect(body.variables).toEqual({ skip: 0 })

    expect(await g.next()).toEqual({
      value: undefined,
      done: true
    })
  })
  it('should fetch with variables', async () => {
    const mockData = {
      data: {
        testCollection: {
          items: genItems(2),
          total: 2
        }
      },
      errors: {}
    }
    const [mockFetch, mockLink] = mockFetchLink(mockData)
    const client = new ClienteGqlTest(mockLink, {
      apiBaseURL: '',
      credential: []
    })
      .request()
      .transform((content) => content.testCollection)
      .vars(['var1=123'])
      .query(query)
    await client.fetch().next()
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.variables).toEqual({ skip: 0, var1: 123 })
  })
  it('should fetch all content with paginate', async () => {
    const mockData = {
      data: {
        testCollection: {
          items: genItems(25),
          total: 25
        }
      },
      errors: {}
    }
    const [mockFetch, mockLink] = mockFetchLink(mockData)
    const client = new ClienteGqlTest(mockLink, {
      apiBaseURL: '',
      credential: []
    })
      .request()
      .pageSize(10)
      .transform((content) => content.testCollection)
      .query(query)
    const g = client.fetch()

    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 25, count: 10 },
        content: mockData.data.testCollection.items
          .slice(0, 10)
          .map((v) => new ResRecord(v))
      },
      done: false
    })
    let body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.query).toMatch(/testCollection/)
    expect(body.variables).toEqual({ skip: 0, pageSize: 10 })

    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 25, count: 10 },
        content: mockData.data.testCollection.items
          .slice(10, 20)
          .map((v) => new ResRecord(v))
      },
      done: false
    })
    body = JSON.parse((mockFetch.mock.calls[1][1] as any).body)
    expect(body.query).toMatch(/testCollection/)
    expect(body.variables).toEqual({ skip: 10, pageSize: 10 })

    expect(await g.next()).toEqual({
      value: {
        fetch: { total: 25, count: 5 },
        content: mockData.data.testCollection.items
          .slice(20, 25)
          .map((v) => new ResRecord(v))
      },
      done: false
    })
    body = JSON.parse((mockFetch.mock.calls[2][1] as any).body)
    expect(body.query).toMatch(/testCollection/)
    expect(body.variables).toEqual({ skip: 20, pageSize: 10 })

    expect(await g.next()).toEqual({
      value: undefined,
      done: true
    })
  })
})
