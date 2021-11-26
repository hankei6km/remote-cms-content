import { jest } from '@jest/globals'

jest.unstable_mockModule('fs', async () => {
  const readFileSyncFn = (fileName: string): string => {
    if (fileName === 'error.txt') {
      throw new Error('ENOENT')
    }
    return 'query test'
  }
  const mockReadFileSync = jest.fn(readFileSyncFn)
  const reset = () => {
    mockReadFileSync.mockReset().mockImplementation(readFileSyncFn)
  }
  reset()
  return {
    readFileSync: mockReadFileSync,
    _reset: reset,
    _getMocks: () => ({
      mockReadFileSync
    })
  }
})

const mockFs = await import('fs')
const { mockReadFileSync } = (mockFs as any)._getMocks()
const {
  decodeFilter,
  readQuery,
  decodeVars,
  apolloErrToMessages,
  yargsArrayFromEnvVars,
  isJsonataQuery
} = await import('../../src/lib/util.js')

afterEach(() => {
  ;(mockFs as any)._reset()
})

describe('decodeFilter', () => {
  it('should decode filter', () => {
    expect(
      decodeFilter(['fields.id=index', 'test=test1=test2=test3', 'test=test1='])
    ).toEqual([
      ['eq', 'fields.id', 'index'],
      ['eq', 'test', 'test1=test2=test3'],
      ['eq', 'test', 'test1=']
    ])
  })
})

describe('readQuery', () => {
  it('should read query from file', () => {
    expect(readQuery('test.txt')).toEqual('query test')
  })
  it('should throw ENOENT', () => {
    expect(() => readQuery('error.txt')).toThrowError(/readQuery/)
  })
  it('should throw validation error', () => {
    const mockValidator = jest.fn().mockReturnValue(new Error('TEST'))
    expect(() => readQuery('test.txt', mockValidator as any)).toThrowError(
      /validation.*TEST/
    )
    expect(mockValidator).toHaveBeenLastCalledWith('query test')
  })
})

describe('decodeVars', () => {
  it('should return boolean', () => {
    expect(decodeVars(['a', 'b=true', 'c=false'])).toEqual({
      a: true,
      b: true,
      c: false
    })
  })
  it('should return number', () => {
    expect(decodeVars(['a=0101', 'b=5.4', 'c=-5.4', 'd=0x123'])).toEqual({
      a: 101,
      b: 5.4,
      c: -5.4,
      d: 291
    })
  })
  it('should return string', () => {
    expect(
      decodeVars([
        'a=ABC',
        'b=',
        'c=abc=efg',
        'd=abc=efg=',
        'e=あいうえお',
        'f=3.1.4'
      ])
    ).toEqual({
      a: 'ABC',
      b: '',
      c: 'abc=efg',
      d: 'abc=efg=',
      e: 'あいうえお',
      f: '3.1.4'
    })
  })
  it('should return string with force option', () => {
    expect(
      decodeVars(
        ['a=true', 'b=false', 'c=0101', 'd=5.4', 'e=-5.4', 'f=0x123'],
        true
      )
    ).toEqual({
      a: 'true',
      b: 'false',
      c: '0101',
      d: '5.4',
      e: '-5.4',
      f: '0x123'
    })
  })
  it('should throw error', () => {
    expect(() => decodeVars(['abc'], true)).toThrowError(/invalid/)
  })
})

describe('apolloErrToMessages', () => {
  it('should return message from apollo errors', () => {
    const mockErr = {
      graphQLErrors: [],
      clientErrors: [],
      networkError: {
        name: 'ServerError',
        response: {
          size: 0,
          timeout: 0
        },
        statusCode: 400,
        result: {
          errors: [
            {
              message:
                'Query cannot be executed. The maximum allowed complexity for a query is 11000 but it was 50100. Simplify the query e.g. by setting lower limits for collections.',
              extensions: {
                contentful: {
                  code: 'TOO_COMPLEX_QUERY',
                  requestId: '8413041d-cd20-41fa-a0c4-a6dc9402b263',
                  details: { maximumCost: 11000, cost: 50100 }
                }
              }
            }
          ]
        }
      },
      message: 'Response not successful: Received status code 400'
    }
    expect(apolloErrToMessages(mockErr)).toEqual(
      'Response not successful: Received status code 400\nnetworkError: Query cannot be executed. The maximum allowed complexity for a query is 11000 but it was 50100. Simplify the query e.g. by setting lower limits for collections.'
    )
  })
  it('should return message from apollo errors(bodyText)', () => {
    const mockErr = {
      graphQLErrors: [],
      clientErrors: [],
      networkError: {
        name: 'ServerParseError',
        response: { size: 0, timeout: 0 },
        statusCode: 404,
        bodyText: 'Page not found.'
      },
      message: 'Unexpected token P in JSON at position 0'
    }
    expect(apolloErrToMessages(mockErr)).toEqual(
      'Unexpected token P in JSON at position 0\nnetworkError: 404 Page not found.'
    )
  })
  it('should return message from apollo errors(multiple kind)', () => {
    const mockErr = {
      graphQLErrors: {
        result: {
          errors: [
            {
              message: 'g1'
            }
          ]
        }
      },
      clientErrors: {
        result: {
          errors: [
            {
              message: 'c1'
            }
          ]
        }
      },
      networkError: {
        result: {
          errors: [
            {
              message: 'n1'
            },
            {
              message: 'n2'
            }
          ]
        }
      },
      message: 'msg'
    }
    expect(apolloErrToMessages(mockErr)).toEqual(
      'msg\ngraphQLErrors: g1\nclientErrors: c1\nnetworkError: n1\nnetworkError: n2'
    )
  })
  it('should return value when value is apollo errors', () => {
    const mockErr = new Error('error')
    expect(apolloErrToMessages(mockErr)).toEqual(mockErr)
  })
})

describe('yargsArrayFromEnvVars', () => {
  it('should return array', () => {
    expect(yargsArrayFromEnvVars({ 0: 'a', 1: 'b' })).toEqual(['a', 'b'])
  })
  it('should return value when value is not object', () => {
    expect(yargsArrayFromEnvVars('value')).toEqual('value')
  })
  it('should throw error when index is not number', () => {
    expect(() => yargsArrayFromEnvVars({ A: 'a', B: 'b' })).toThrowError(
      /is not number/
    )
  })
})

describe('isJsonataQueryRegExp', () => {
  it('should return true', () => {
    expect(isJsonataQuery('p1.p2')).toBeTruthy()
    expect(isJsonataQuery('p1[0]')).toBeTruthy()
    expect(isJsonataQuery('項目1.項目2')).toBeTruthy()
    expect(isJsonataQuery('$sum(items)')).toBeTruthy()
  })
  it('should return false', () => {
    expect(isJsonataQuery('p1')).toBeFalsy()
    expect(isJsonataQuery('postCollection')).toBeFalsy()
    expect(isJsonataQuery('項目')).toBeFalsy()
  })
})
