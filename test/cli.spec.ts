import { PassThrough } from 'stream'
import { jest } from '@jest/globals'
// import { cli } from '../src/cli.js'
import { SaveRemoteContentOptions } from '../src/types/content.js'
import { ClientKind, ClientOpts } from '../src/types/client.js'

// https://github.com/facebook/jest/issues/11438 の対策
// client.spec.ts 以外では client を直接使わない.
// 1 つの worker を共有する複数の spec の import 先で動的 import を使うとエラーになる.
// その対策.
jest.unstable_mockModule('../src/lib/client.js', async () => {
  return {
    client: async (_kind: ClientKind, opts: ClientOpts) =>
      new (await import('../src/lib/clients/appsheet.js')).ClientAppSheet(opts)
  }
})

jest.unstable_mockModule('../src/lib/content.js', async () => {
  const mockSaveRemoteContent = jest.fn()
  const reset = () => {
    // mockSaveRemoteContent.mockReset().mockResolvedValue(null)
    mockSaveRemoteContent.mockReset().mockImplementation(async (...args) => {
      const { dstContentDir } = args[0] as SaveRemoteContentOptions
      if (dstContentDir.match(/error/)) {
        return new Error('dummy error')
      }
      return null
    })
  }
  reset()
  return {
    saveRemoteContent: mockSaveRemoteContent,
    _reset: reset,
    _getMocks: () => ({
      mockSaveRemoteContent: mockSaveRemoteContent
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
        dstContentDir: '/content/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        skip: 0,
        maxRepeat: 10,
        filter: [],
        query: [],
        vars: [],
        varsStr: []
      }
    })
    expect(await res).toEqual(0)
    //const { mockSaveRemoteContent } = require('../src/lib/content')._getMocks()
    const { mockSaveRemoteContent } = (mockContent as any)._getMocks()
    expect(mockSaveRemoteContent.mock.calls[0]).toEqual([
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
        dstContentDir: '/content/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        skip: 0,
        maxRepeat: 10,
        filter: [],
        query: [],
        vars: [],
        varsStr: []
      }
    ])
    expect(outData).toEqual('')
    expect(errData).toEqual('')
  })
  it('should return stdout with exitcode=0 from save command with postionStart', async () => {
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
        dstContentDir: '/content/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        skip: 0,
        maxRepeat: 10,
        filter: [],
        positioStart: 3,
        query: [],
        vars: [],
        varsStr: []
      }
    })
    expect(await res).toEqual(0)
    //const { mockSaveRemoteContent } = require('../src/lib/content')._getMocks()
    const { mockSaveRemoteContent } = (mockContent as any)._getMocks()
    expect(mockSaveRemoteContent.mock.calls[0]).toEqual([
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
        dstContentDir: '/content/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        skip: 0,
        positioStart: 3,
        maxRepeat: 10,
        filter: [],
        query: [],
        vars: [],
        varsStr: []
      }
    ])
    expect(outData).toEqual('')
    expect(errData).toEqual('')
  })
  it('should return stdout with exitcode=0 from save command with filter', async () => {
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
        dstContentDir: '/content/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        skip: 0,
        maxRepeat: 10,
        filter: ['k=v'],
        query: [],
        vars: [],
        varsStr: []
      }
    })
    expect(await res).toEqual(0)
    //const { mockSaveRemoteContent } = require('../src/lib/content')._getMocks()
    const { mockSaveRemoteContent } = (mockContent as any)._getMocks()
    expect(mockSaveRemoteContent.mock.calls[0]).toEqual([
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
        dstContentDir: '/content/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        skip: 0,
        maxRepeat: 10,
        filter: [['eq', 'k', 'v']],
        query: [],
        vars: [],
        varsStr: []
      }
    ])
    expect(outData).toEqual('')
    expect(errData).toEqual('')
  })
  it('should return stderr with exitcode=1 from save coomand', async () => {
    const someModule = await import('../src/lib/content')
    // const { mockSaveRemoteContent } = (someModule as any)._getMocks()
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
        dstContentDir: '/error',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        skip: 0,
        maxRepeat: 10,
        filter: [],
        query: [],
        vars: [],
        varsStr: []
      }
    })
    expect(await res).toEqual(1)
    expect(outData).toEqual('')
    expect(errData).toEqual('Error: dummy error\n')
  })
})

export {}
