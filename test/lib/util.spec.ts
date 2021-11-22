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
const { readQuery, apolloErrToMessages } = await import('../../src/lib/util.js')

afterEach(() => {
  ;(mockFs as any)._reset()
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
