import { PassThrough } from 'stream'
import { jest } from '@jest/globals'
// import { cli } from '../src/cli.js'
import { SaveRemoteContentsOptions } from '../src/types/content.js'

// > ENOENT: no such file or directory, open 'zlib'
// になる対応.
// contentful を import すると発生するが原理は不明.
jest.unstable_mockModule('contentful', async () => {
  return {
    default: jest.fn()
  }
})

jest.unstable_mockModule('../src/lib/content.js', async () => {
  const mockSaveRemoteContents = jest.fn()
  const reset = () => {
    // mockSaveRemoteContents.mockReset().mockResolvedValue(null)
    mockSaveRemoteContents.mockReset().mockImplementation(async (...args) => {
      const { dstContentsDir } = args[0] as SaveRemoteContentsOptions
      if (dstContentsDir.match(/error/)) {
        return new Error('dummy error')
      }
      return null
    })
  }
  reset()
  return {
    saveRemoteContents: mockSaveRemoteContents,
    _reset: reset,
    _getMocks: () => ({
      mockSaveRemoteContents
    })
  }
})

const mockContent = await import('../src/lib/content.js')
const { cli } = await import('../src/cli.js')

afterEach(async () => {
  ;(mockContent as any)._reset()
})

describe('cli()', () => {
  it('should return stdout with exitcode=0 from save command', async () => {
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    let outData = ''
    stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    stderr.on('data', (d) => (errData = errData + d))

    const res = cli({
      command: 'save',
      stdout,
      stderr,
      clientKind: 'appsheet',
      apiBaseURL: 'http://localhost:3000',
      credential: ['appid', 'secret'],
      mapConfig: 'test/assets/mapconfig.json',
      saveOpts: {
        apiName: 'tbl',
        dstContentsDir: '/contents/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static'
      }
    })
    expect(await res).toEqual(0)
    //const { mockSaveRemoteContents } = require('../src/lib/content')._getMocks()
    const { mockSaveRemoteContents } = (mockContent as any)._getMocks()
    expect(mockSaveRemoteContents.mock.calls[0]).toEqual([
      {
        client: expect.any(Object),
        apiName: 'tbl',
        mapConfig: {
          flds: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              srcName: '画像',
              dstName: 'image',
              fldType: 'image'
            }
          ]
        },
        dstContentsDir: '/contents/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static'
      }
    ])
    expect(outData).toEqual('')
    expect(errData).toEqual('')
  })
  it('should return stderr with exitcode=1 from save coomand', async () => {
    const someModule = await import('../src/lib/content')
    // const { mockSaveRemoteContents } = (someModule as any)._getMocks()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    let outData = ''
    stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    stderr.on('data', (d) => (errData = errData + d))

    const res = cli({
      command: 'save',
      stdout,
      stderr,
      clientKind: 'appsheet',
      apiBaseURL: 'http://localhost:3000',
      credential: ['appid', 'secret'],
      mapConfig: 'test/assets/mapconfig.json',
      saveOpts: {
        apiName: 'tbl',
        dstContentsDir: '/error',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static'
      }
    })
    expect(await res).toEqual(1)
    expect(outData).toEqual('')
    expect(errData).toEqual('Error: dummy error\n')
  })
})

export {}
