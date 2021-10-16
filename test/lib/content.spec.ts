import { jest } from '@jest/globals'
import { join } from 'path'
import fsPromises from 'fs/promises'
import { ImageInfo } from '../../src/types/media.js'
import { BaseFlds, MapConfig } from '../../src/types/map.js'
import { trimStaticRoot, imageInfoFromSrc } from '../../src/lib/media'
import mockAxiosDefault from 'jest-mock-axios'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

jest.unstable_mockModule('fs/promises', async () => {
  const mockWriteFileFn = async (pathName: any) => {
    if (pathName.match(/error/)) {
      throw new Error('dummy error')
    }
    return null
  }
  let mockWriteFile = jest.fn()
  const reset = () => {
    mockWriteFile.mockReset().mockImplementation(mockWriteFileFn)
  }
  reset()
  return {
    writeFile: mockWriteFile,
    readFile: fsPromises.readFile, // map.ts で使っている
    _reset: reset,
    _getMocks: () => ({
      mockWriteFile
    })
  }
})

jest.unstable_mockModule('../../src/lib/media', () => {
  let mockImageInfoFromSrc = jest.fn()
  let mockSaveImageFile = jest.fn()
  const reset = (rows: BaseFlds[]) => {
    mockImageInfoFromSrc
      .mockReset()
      .mockImplementation((src: any, setSize: any) =>
        imageInfoFromSrc(src, setSize)
      )
    mockSaveImageFile
      .mockReset()
      .mockImplementation(
        async (
          src: any,
          imagesDir: any,
          staticRoot: any,
          imageFileName: any,
          setSize: any
        ): Promise<ImageInfo> => {
          return new Promise((resolve) => {
            process.nextTick(() =>
              resolve({
                url: trimStaticRoot(join(imagesDir, imageFileName), staticRoot),
                size: setSize ? { width: 200, height: 100 } : {},
                meta: {}
              })
            )
          })
        }
      )
  }
  reset([])
  return {
    imageInfoFromSrc: mockImageInfoFromSrc,
    saveImageFile: mockSaveImageFile,
    _reset: reset,
    _getMocks: () => ({
      mockSaveImageFile
    })
  }
})

const mockMedia = await import('../../src/lib/media')
const { mockSaveImageFile } = (mockMedia as any)._getMocks()
const mockFsPromise = await import('fs/promises')
const { mockWriteFile } = (mockFsPromise as any)._getMocks()
const { client } =await import( '../../src/lib/client.js')
const { saveContentFile, saveRemoteContents } = await import(
  '../../src/lib/content.js'
)

afterEach(() => {
  mockAxios.reset()
  ;(mockFsPromise as any)._reset()
  ;(mockMedia as any)._reset()
})

describe('saveContentFile()', () => {
  it('should save text that is included frontmatter to a file', async () => {
    const res = saveContentFile(
      {
        _RowNumber: 1,
        id: 'idstring',
        createdAt: new Date('2021-09-17T16:50:56.000Z'),
        updatedAt: new Date('2021-09-17T17:50:56.000Z'),
        title: 'Title',
        content: 'markdown'
      },
      '/path',
      0
    )
    await expect(res).resolves.toEqual(null)
    expect(mockWriteFile).toHaveBeenLastCalledWith(
      '/path/idstring.md',
      `---
_RowNumber: 1
id: idstring
createdAt: 2021-09-17T16:50:56.000Z
updatedAt: 2021-09-17T17:50:56.000Z
title: Title
position: 0
---
markdown
`
    )
  })
  it('should return error', async () => {
    const n = new Date().toUTCString()
    const res = saveContentFile(
      {
        _RowNumber: 1,
        id: 'idstring',
        createdAt: new Date(n),
        updatedAt: new Date(n),
        title: 'Title',
        count: 21,
        timestamp: new Date(n),
        image: 'アプリ_Images/test.png'
      },
      '/path/error',
      0
    )
    expect(String(await res)).toMatch(/dummy error/)
  })
})

describe('saveRemoteContents()', () => {
  it('should get remote content and save as local files', async () => {
    const mapConfig: MapConfig = {
      media: { image: { fileNameField: 'fileName', download: true } },
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image', setSize: true },
        { srcName: 'content', dstName: 'content', fldType: 'string' }
      ]
    }
    const res = saveRemoteContents({
      client: client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentsDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static'
    })
    mockAxios.mockResponse({
      data: [
        {
          _RowNumber: 1,
          id: 'idstring1',
          createdAt: new Date('2021-09-17T16:50:56.000Z'),
          updatedAt: new Date('2021-09-17T17:50:56.000Z'),
          タイトル: 'Title1',
          画像: 'http://localhost:3000/path/to/?fileName=test1.png',
          content: 'markdown1'
        },
        {
          _RowNumber: 2,
          id: 'idstring2',
          createdAt: new Date('2022-09-27T16:50:56.000Z'),
          updatedAt: new Date('2022-09-27T17:50:56.000Z'),
          タイトル: 'Title2',
          画像: 'http://localhost:3000/path/to/?fileName=test2.png',
          content: 'markdown2'
        }
      ]
    })
    await expect(res).resolves.toEqual(null)
    expect(mockSaveImageFile.mock.calls[0]).toEqual([
      {
        url: 'http://localhost:3000/path/to/?fileName=test1.png',
        size: {},
        meta: {}
      },
      '/path/static/images',
      '/path/static',
      'test1.png',
      true
    ])
    expect(mockSaveImageFile.mock.calls[1]).toEqual([
      {
        url: 'http://localhost:3000/path/to/?fileName=test2.png',
        size: {},
        meta: {}
      },
      '/path/static/images',
      '/path/static',
      'test2.png',
      true
    ])
    expect(mockWriteFile.mock.calls[0][0]).toEqual('/path/content/idstring1.md')
    expect(mockWriteFile.mock.calls[0][1]).toContain('title: Title1')
    expect(mockWriteFile.mock.calls[0][1]).toContain('url: /images/test1.png')
    expect(mockWriteFile.mock.calls[0][1]).toContain('width: 200')
    expect(mockWriteFile.mock.calls[0][1]).toContain('height: 100')
    expect(mockWriteFile.mock.calls[0][1]).toContain('position: 0')
    expect(mockWriteFile.mock.calls[0][1]).toContain('markdown1')
    expect(mockWriteFile.mock.calls[1][0]).toEqual('/path/content/idstring2.md')
    expect(mockWriteFile.mock.calls[1][1]).toContain('title: Title2')
    expect(mockWriteFile.mock.calls[1][1]).toContain('url: /images/test2.png')
    expect(mockWriteFile.mock.calls[0][1]).toContain('width: 200')
    expect(mockWriteFile.mock.calls[0][1]).toContain('height: 100')
    expect(mockWriteFile.mock.calls[1][1]).toContain('position: 1')
    expect(mockWriteFile.mock.calls[1][1]).toContain('markdown2')
  })
  it('should get remote content and save as local files without setSize options', async () => {
    const mapConfig: MapConfig = {
      media: {
        image: { fileNameField: 'fileName', download: true }
      },
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image' }
      ]
    }
    const res = saveRemoteContents({
      client: client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentsDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: ''
    })
    mockAxios.mockResponse({
      data: [
        {
          _RowNumber: 1,
          id: 'idstring1',
          createdAt: new Date('2021-09-17T16:50:56.000Z'),
          updatedAt: new Date('2021-09-17T17:50:56.000Z'),
          タイトル: 'Title1',
          画像: 'http://localhost:3000/path/to/?fileName=test1.png',
          content: 'markdown1'
        }
      ]
    })
    await expect(res).resolves.toEqual(null)
    expect(mockWriteFile.mock.calls[0][1]).toContain(
      'url: /path/static/images/test1.png'
    )
    expect(mockWriteFile.mock.calls[0][1]).not.toContain('width: 200')
    expect(mockWriteFile.mock.calls[0][1]).not.toContain('height: 100')
  })
  it('should get remote content and save as local files without downloading images', async () => {
    const mapConfig: MapConfig = {
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image' }
      ]
    }
    const res = saveRemoteContents({
      client: client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentsDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: ''
    })
    mockAxios.mockResponse({
      data: [
        {
          _RowNumber: 1,
          id: 'idstring1',
          createdAt: new Date('2021-09-17T16:50:56.000Z'),
          updatedAt: new Date('2021-09-17T17:50:56.000Z'),
          タイトル: 'Title1',
          画像: 'http://localhost:3000/path/to/?fileName=test1.png',
          content: 'markdown1'
        }
      ]
    })
    await expect(res).resolves.toEqual(null)
    expect(mockSaveImageFile).toBeCalledTimes(0)
    expect(mockWriteFile.mock.calls[0][1]).toContain(
      `url: 'http://localhost:3000/path/to/?fileName=test1.png'`
    )
  })
  it('should return error when fetch has failed', async () => {
    const res = saveRemoteContents({
      client: client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig: { flds: [] },
      dstContentsDir: '/error',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static'
    })
    mockAxios.mockError({
      response: { status: 404, statusText: 'dummy error' }
    })
    expect(String(await res)).toMatch(/dummy error/)
  })
  it('should return error when save file has failed', async () => {
    const res = saveRemoteContents({
      client: client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig: { flds: [] },
      dstContentsDir: '/error',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static'
    })
    mockAxios.mockResponse({
      data: [
        {
          _RowNumber: 1,
          id: 'idstring1',
          createdAt: new Date('2021-09-17T16:50:56.000Z'),
          updatedAt: new Date('2021-09-17T17:50:56.000Z')
        }
      ]
    })
    expect(String(await res)).toMatch(/dummy error/)
  })
})
