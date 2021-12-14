import { jest } from '@jest/globals'
import { join } from 'path'
import fsPromises from 'fs/promises'
import { ImageInfo } from '../../src/types/media.js'
import { MappedFlds, MapConfig } from '../../src/types/map.js'
import { trimStaticRoot, imageInfoFromSrc } from '../../src/lib/media.js'
import mockAxiosDefault from 'jest-mock-axios'
import { ClientKind, ClientOpts } from '../../src/types/client.js'
import { initLog } from '../../src/lib/log.js'
import { mockStreams } from '../util.js'
const mockAxios: typeof mockAxiosDefault = (mockAxiosDefault as any).default

jest.unstable_mockModule('axios', async () => {
  return {
    default: mockAxios
  }
})

const { readQuery: _readQuery, ...utils } = await import(
  '../../src/lib/util.js'
)
jest.unstable_mockModule('../../src/lib/util.js', async () => {
  return {
    readQuery: (v: string) => v, // ファイル読み込みではなく、文字列をそのまま返す.
    ...utils
  }
})

// https://github.com/facebook/jest/issues/11438 の対策
// client.spec.ts 以外では client を直接使わない.
// 1 つの worker を共有する複数の spec の import 先で動的 import を使うとエラーになる.
// その対策.
jest.unstable_mockModule('../../src/lib/client.js', async () => {
  return {
    client: async (_kind: ClientKind, opts: ClientOpts) =>
      new (await import('../../src/lib/clients/appsheet.js')).ClientAppSheet(
        opts
      )
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

jest.unstable_mockModule('../../src/lib/media.js', () => {
  let mockImageInfoFromSrc = jest.fn()
  let mockSaveImageFile = jest.fn()
  const reset = (rows: MappedFlds[]) => {
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
const { client } = await import('../../src/lib/client.js')
const { ClientTest } = await import('./clientTest.js')
const { compileMapConfig } = await import('../../src/lib/map.js')
const { saveContentFile, transformContent, saveRemoteContent } = await import(
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
        content: 'markdown',
        list: undefined
      },
      '/path',
      { fldName: 'position', value: 0 }
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
      { fldName: 'position', value: 0 }
    )
    expect(String(await res)).toMatch(/dummy error/)
  })
})

describe('transformContent()', () => {
  it('should transform the content', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      transform: 'recs',
      flds: []
    })
    const t = transformContent(mapConfig)
    expect(t({ recs: [{ a: 1 }, { a: 2 }] })).toEqual([{ a: 1 }, { a: 2 }])
  })
  it('should transform the content with arrayPath', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      transform: 'recs',
      flds: []
    })
    const t = transformContent(mapConfig)
    expect(
      t({ recs: { p1: { p2: [{ a: 1 }, { a: 2 }] } } }, ['p1', 'p2'])
    ).toEqual({ p1: { p2: [{ a: 1 }, { a: 2 }] } }) // p1.p2 が array であることが検証されている.
  })
  it('should throw error when transform error', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      transform: 'items.{items:recs}',
      flds: []
    })
    const t = transformContent(mapConfig)
    expect(() => t({ items: '' })).toThrowError(/Key in object/)
  })
  it('should throw error when the transformed root value is not array', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      transform: 'recs',
      flds: []
    })
    const t = transformContent(mapConfig)
    expect(() =>
      t({ recs: { p1: { p2: [{ a: 1 }, { a: 2 }] } } })
    ).toThrowError(/is not array/)
  })
  it('should throw error when array path is not exist', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      transform: 'recs',
      flds: []
    })
    const t = transformContent(mapConfig)
    expect(() =>
      t({ recs: { p1: { p2: [{ a: 1 }, { a: 2 }] } } }, ['p1', 'p3'])
    ).toThrowError(/is not exist/)
    expect(() => t({ recs: [{ a: 1 }, { a: 2 }] }, ['p1', 'p3'])).toThrowError(
      // root が array の場合.
      /is not exist/
    )
  })
})

describe('saveRemoteContent()', () => {
  it('should get remote content and save as local files', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      media: { image: { fileNameField: 'fileName', download: true } },
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image', setSize: true },
        { srcName: 'content', dstName: 'content', fldType: 'string' }
      ]
    })
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
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
    expect(mockWriteFile.mock.calls[0][1]).toContain('position: 1')
    expect(mockWriteFile.mock.calls[0][1]).toContain('markdown1')
    expect(mockWriteFile.mock.calls[1][0]).toEqual('/path/content/idstring2.md')
    expect(mockWriteFile.mock.calls[1][1]).toContain('title: Title2')
    expect(mockWriteFile.mock.calls[1][1]).toContain('url: /images/test2.png')
    expect(mockWriteFile.mock.calls[0][1]).toContain('width: 200')
    expect(mockWriteFile.mock.calls[0][1]).toContain('height: 100')
    expect(mockWriteFile.mock.calls[1][1]).toContain('position: 2')
    expect(mockWriteFile.mock.calls[1][1]).toContain('markdown2')
  })
  const paginateSaveOption = {
    apiName: 'tbl',
    dstContentDir: '/path/content',
    dstImagesDir: '/path/static/images',
    staticRoot: '/path/static',
    skip: 5,
    limit: 90,
    pageSize: 30,
    maxRepeat: 10,
    filter: [],
    query: [],
    vars: [],
    varsStr: []
  }
  it('should get remote content and save as local files with paginate', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      flds: []
    })
    const res = saveRemoteContent({
      // paginate させるために、他とは違う方法で client を生成している.
      client: new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100),
      mapConfig,
      ...paginateSaveOption
    })
    await expect(res).resolves.toEqual(null)
    for (let idx = 0; idx < 90; idx++) {
      expect(mockWriteFile.mock.calls[idx][0]).toEqual(
        `/path/content/id${idx + 5}.md`
      )
      expect(mockWriteFile.mock.calls[idx][1]).toContain(`position: ${idx + 1}`)
    }
  })
  it('should use configured position', async () => {
    const start = 3
    const mapConfig: MapConfig = compileMapConfig({
      position: {
        start
      },
      flds: []
    })
    const res = saveRemoteContent({
      // paginate させるために、他とは違う方法で client を生成している.
      client: new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100),
      mapConfig,
      ...paginateSaveOption
    })
    await expect(res).resolves.toEqual(null)
    for (let idx = 0; idx < 90; idx++) {
      expect(mockWriteFile.mock.calls[idx][0]).toEqual(
        `/path/content/id${idx + 5}.md`
      )
      expect(mockWriteFile.mock.calls[idx][1]).toContain(
        `position: ${idx + start}`
      )
    }
  })
  it('should use configured position(fldName)', async () => {
    const start = 3
    const mapConfig: MapConfig = compileMapConfig({
      position: {
        fldName: 'index',
        start
      },
      flds: []
    })
    const res = saveRemoteContent({
      // paginate させるために、他とは違う方法で client を生成している.
      client: new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100),
      mapConfig,
      ...paginateSaveOption
    })
    await expect(res).resolves.toEqual(null)
    for (let idx = 0; idx < 90; idx++) {
      expect(mockWriteFile.mock.calls[idx][0]).toEqual(
        `/path/content/id${idx + 5}.md`
      )
      expect(mockWriteFile.mock.calls[idx][1]).toContain(
        `index: ${idx + start}`
      )
    }
  })
  it('should disable position', async () => {
    const start = 3
    const mapConfig: MapConfig = compileMapConfig({
      position: {
        disable: true,
        start
      },
      flds: []
    })
    const res = saveRemoteContent({
      // paginate させるために、他とは違う方法で client を生成している.
      client: new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100),
      mapConfig,
      ...paginateSaveOption
    })
    await expect(res).resolves.toEqual(null)
    for (let idx = 0; idx < 90; idx++) {
      expect(mockWriteFile.mock.calls[idx][0]).toEqual(
        `/path/content/id${idx + 5}.md`
      )
      expect(mockWriteFile.mock.calls[idx][1]).not.toContain(`position`)
    }
  })
  it('should use positionStart option', async () => {
    const start = 3
    const mapConfig: MapConfig = compileMapConfig({
      position: {
        start: 5 // これは使われない.
      },
      flds: []
    })
    const res = saveRemoteContent({
      // paginate させるために、他とは違う方法で client を生成している.
      client: new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(100),
      mapConfig,
      ...paginateSaveOption,
      positioStart: start
    })
    await expect(res).resolves.toEqual(null)
    for (let idx = 0; idx < 90; idx++) {
      expect(mockWriteFile.mock.calls[idx][0]).toEqual(
        `/path/content/id${idx + 5}.md`
      )
      expect(mockWriteFile.mock.calls[idx][1]).toContain(
        `position: ${idx + start}`
      )
    }
  })
  it('should break loop by max-repeat', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      flds: []
    })
    // paginate させるために、他とは違う方法で client を生成している.
    const client = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(
      100
    )
    const res = saveRemoteContent({
      client,
      mapConfig,
      ...paginateSaveOption,
      maxRepeat: 2
    })
    await expect(res).resolves.toEqual(null)
    expect(client._fetch).toHaveBeenCalledTimes(2) // max-repeat で制限されている
    expect(mockWriteFile).toHaveBeenCalledTimes(60)
    for (let idx = 0; idx < 60; idx++) {
      expect(mockWriteFile.mock.calls[idx][0]).toEqual(
        `/path/content/id${idx + 5}.md`
      )
      expect(mockWriteFile.mock.calls[idx][1]).toContain(`position: ${idx + 1}`)
    }
  })
  it('should cancel max-repeat', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      flds: []
    })
    // paginate させるために、他とは違う方法で client を生成している.
    const client = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(
      100
    )
    const res = saveRemoteContent({
      client,
      mapConfig,
      ...paginateSaveOption,
      pageSize: 5,
      maxRepeat: 0
    })
    await expect(res).resolves.toEqual(null)
    expect(client._fetch).toHaveBeenCalledTimes(18) // max-repate に制限されていない
    expect(mockWriteFile).toHaveBeenCalledTimes(90)
    for (let idx = 0; idx < 90; idx++) {
      expect(mockWriteFile.mock.calls[idx][0]).toEqual(
        `/path/content/id${idx + 5}.md`
      )
      expect(mockWriteFile.mock.calls[idx][1]).toContain(`position: ${idx + 1}`)
    }
  })
  it('should get remote content and save as local files with transform content', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      media: { image: { fileNameField: 'fileName', download: true } },
      transform: 'recs',
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image', setSize: true },
        { srcName: 'content', dstName: 'content', fldType: 'string' }
      ]
    })
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
    })
    mockAxios.mockResponse({
      data: [
        {
          recs: [
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
        },
        {
          recs: [
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
    expect(mockWriteFile.mock.calls[0][1]).toContain('position: 1')
    expect(mockWriteFile.mock.calls[0][1]).toContain('markdown1')
    expect(mockWriteFile.mock.calls[1][0]).toEqual('/path/content/idstring2.md')
    expect(mockWriteFile.mock.calls[1][1]).toContain('title: Title2')
    expect(mockWriteFile.mock.calls[1][1]).toContain('url: /images/test2.png')
    expect(mockWriteFile.mock.calls[0][1]).toContain('width: 200')
    expect(mockWriteFile.mock.calls[0][1]).toContain('height: 100')
    expect(mockWriteFile.mock.calls[1][1]).toContain('position: 2')
    expect(mockWriteFile.mock.calls[1][1]).toContain('markdown2')
  })
  it('should get remote content and save as local files without setSize options', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      media: {
        image: { fileNameField: 'fileName', download: true }
      },
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image' }
      ]
    })
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
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
  it('should call filter method', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      media: {},
      flds: []
    })
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(0)
    const res = saveRemoteContent({
      client: c,
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '',
      skip: 0,
      maxRepeat: 10,
      filter: [['eq', 'fields.id', 'index']],
      query: [],
      vars: [],
      varsStr: []
    })
    await expect(res).resolves.toEqual(null)
    expect(c.filter).toHaveBeenCalledWith([['eq', 'fields.id', 'index']])
  })
  it('should call query method', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      media: {},
      flds: []
    })
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(0)
    const res = saveRemoteContent({
      client: c,
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: ['test1.gql', 'test2.gql'],
      vars: [],
      varsStr: []
    })
    await expect(res).resolves.toEqual(null)
    expect(c.query).toHaveBeenCalledWith(['test1.gql', 'test2.gql'])
  })
  it('should call vars method', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      media: {},
      flds: []
    })
    const c = new ClientTest({ apiBaseURL: '', credential: [] }).genRecord(0)
    const res = saveRemoteContent({
      client: c,
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: ['abc=123'],
      varsStr: ['ABC=123']
    })
    await expect(res).resolves.toEqual(null)
    expect(c.vars).toHaveBeenCalledWith(['abc=123'])
  })
  it('should get remote content and save as local files without downloading images', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image' }
      ]
    })
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
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
  it('should print info from saveRemoteContent', async () => {
    const info = { o: '', e: '' }
    initLog(...mockStreams(info))
    const mapConfig: MapConfig = compileMapConfig({
      flds: [
        { srcName: 'タイトル', dstName: 'title', fldType: 'string' },
        { srcName: '画像', dstName: 'image', fldType: 'image' }
      ]
    })
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/path/content',
      dstImagesDir: '/path/static/images',
      staticRoot: '',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
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
    expect(info.o).toMatchSnapshot()
    expect(info.e).toEqual('')
  })
  it('should return error when compile transform has failed', async () => {
    const mapConfig: MapConfig = compileMapConfig({
      transform: 'recs',
      flds: []
    })
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig,
      dstContentDir: '/error',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
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
    expect(String(await res)).toMatch(/not array/)
  })
  it('should return error when fetch has failed', async () => {
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig: { flds: [] },
      dstContentDir: '/error',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
    })
    mockAxios.mockError({
      response: { status: 404, statusText: 'dummy error' }
    })
    expect(String(await res)).toMatch(/dummy error/)
  })
  it('should return error when save file has failed', async () => {
    const res = saveRemoteContent({
      client: await client('appsheet', {
        apiBaseURL: 'https://api.appsheet.com/api/v2/',
        apiName: 'tbl',
        credential: ['appId', 'secret']
      }),
      apiName: 'tbl',
      mapConfig: { flds: [] },
      dstContentDir: '/error',
      dstImagesDir: '/path/static/images',
      staticRoot: '/path/static',
      skip: 0,
      maxRepeat: 10,
      filter: [],
      query: [],
      vars: [],
      varsStr: []
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
