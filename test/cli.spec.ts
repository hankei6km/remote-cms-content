import { PassThrough } from 'stream'
import cli from '../src/cli.js'
import { SaveRemoteContentsOptions } from '../src/types/content.js'

jest.mock('../src/lib/content', () => {
  const mockSaveRemoteContents = jest.fn()
  const reset = () => {
    mockSaveRemoteContents.mockReset().mockResolvedValue(null)
    mockSaveRemoteContents
      .mockReset()
      .mockImplementation(
        async ({ dstContentsDir }: SaveRemoteContentsOptions) => {
          if (dstContentsDir.match(/error/)) {
            return new Error('dummy error')
          }
          return null
        }
      )
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

afterEach(() => {
  require('../src/lib/content')._reset()
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
      clientKind:'appsheet',
      apiBaseURL: 'http://localhost:3000',
      appId: 'appid',
      mapConfig: 'test/assets/mapconfig.json',
      accessKey: 'secret',
      saveOpts: {
        apiName: 'tbl',
        dstContentsDir: '/contents/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        imageInfo: true
      }
    })
    expect(await res).toEqual(0)
    const { mockSaveRemoteContents } = require('../src/lib/content')._getMocks()
    expect(mockSaveRemoteContents.mock.calls[0]).toEqual([
      {
        client: expect.any(Object),
        apiName: 'tbl',
        mapConfig: {
          cols: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              colType: 'string'
            },
            {
              srcName: '画像',
              dstName: 'image',
              colType: 'image'
            }
          ]
        },
        dstContentsDir: '/contents/tbl',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        imageInfo: true
      }
    ])
    expect(outData).toEqual('')
    expect(errData).toEqual('')
  })
  it('should return stderr with exitcode=1 from save coomand', async () => {
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
      clientKind:'appsheet',
      apiBaseURL: 'http://localhost:3000',
      appId: 'appid',
      mapConfig: 'test/assets/mapconfig.json',
      accessKey: 'secret',
      saveOpts: {
        apiName: 'tbl',
        dstContentsDir: '/error',
        dstImagesDir: '/static/tbl',
        staticRoot: '/static',
        imageInfo: true
      }
    })
    expect(await res).toEqual(1)
    expect(outData).toEqual('')
    expect(errData).toEqual('Error: dummy error\n')
  })
})
