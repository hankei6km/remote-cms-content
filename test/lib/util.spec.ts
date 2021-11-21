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
const { readQuery } = await import('../../src/lib/util.js')

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
