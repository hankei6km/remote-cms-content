import jsonata from 'jsonata'
import {
  fileNameFromURL,
  isImageDownload,
  loadMapConfig,
  mappingFlds,
  compileMapConfig,
  validId
} from '../../src/lib/map.js'
import { ResRecord } from '../../src/types/client.js'
import { MapConfig } from '../../src/types/map.js'

describe('compileMapConfig', () => {
  test('should return MapConfig', () => {
    expect(compileMapConfig({ flds: [] })).toEqual({ flds: [] })
    //const mapConfig: MapConfig = {
    const mapConfig = {
      passthruUnmapped: false,
      media: {
        image: {
          fileNameField: 'name',
          download: false,
          library: [{ src: 'https://', kind: 'imgix', download: false }]
        }
      },
      transform: 'Account.Order',
      flds: [
        {
          srcName: 'idFld',
          dstName: 'idfld',
          fldType: 'id'
        },
        {
          srcName: 'booleanFld',
          dstName: 'booleanFld',
          fldType: 'boolean'
        },
        {
          srcName: 'numberFld',
          dstName: 'numberFld',
          fldType: 'number'
        },
        {
          srcName: 'stringFld',
          dstName: 'stringFld',
          fldType: 'string'
        },
        {
          srcName: 'datetimeFld',
          dstName: 'datetimeFld',
          fldType: 'datetime'
        },
        {
          srcName: 'imageFld',
          dstName: 'imageFld',
          fldType: 'image',
          fileNameField: 'name',
          setSize: false
        },
        {
          srcName: 'enumFld',
          dstName: 'enumFld',
          fldType: 'enum',
          replace: [
            { pattern: 'p', replacement: 'r' },
            { pattern: /e/, replacement: 'r' }
          ]
        },
        {
          srcName: 'objectFld',
          dstName: 'objectFld',
          fldType: 'object'
        },
        {
          srcName: 'htmlFld',
          dstName: 'htmlFld',
          fldType: 'html',
          convert: 'markdown',
          toHtmlOpts: { frontMatter: false, splitParagraph: false },
          toMarkdownOpts: {
            embedImgAttrs: {
              baseURL: '/',
              embedTo: 'block',
              pickAttrs: ['class']
            }
          }
        }
      ]
    }
    expect(compileMapConfig(mapConfig)).toStrictEqual(mapConfig)
    expect(
      typeof compileMapConfig({
        transform: 'Account.Order',
        flds: []
      }).transformJsonata
    ).toEqual('object')
    expect(
      typeof compileMapConfig({
        flds: [
          {
            srcName: 'objectwithJsonataFld',
            dstName: 'objectwithJsonataFld',
            fldType: 'object',
            transform: '*[title="1234"].image'
          }
        ]
      }).flds[0].transformJsonata
    ).toEqual('object')
    expect(compileMapConfig({ passthruUnmapped: true, flds: [] })).toEqual({
      passthruUnmapped: true,
      flds: []
    })
  })
  test('should throw error when invalid data passed', () => {
    expect(() => compileMapConfig({})).toThrowError(/flds/)
    expect(() => compileMapConfig({ flds: [], dirty: true })).toThrowError(
      /additional/
    )
    expect(() =>
      compileMapConfig({
        flds: [
          {
            srcName: 'test',
            dstName: 'test',
            fldType: 'object',
            transformJsonata: '*[title="1234"].image'
          }
        ]
      })
    ).toThrowError(/additional/)
    expect(() =>
      compileMapConfig({
        flds: [
          {
            srcName: 'test',
            dstName: 'test',
            fldType: 'object',
            transform: '$$.{'
          }
        ]
      })
    ).toThrowError(
      'compileMapConfig: compile jsonata: srcName=test, transform=$$.{, message=Expected ":" before end of expression'
    )
  })
})

describe('loadMapConfig', () => {
  test('should load MapConfig from json file', async () => {
    expect(loadMapConfig('test/assets/mapconfig.json')).resolves.toEqual({
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
    })
  })
  test('should throw error when invalid type loaded', async () => {
    expect(
      loadMapConfig('test/assets/mapconfig_type_err.json')
    ).rejects.toThrowError(/flds/)
  })
  test('should throw error when invalid json loaded', async () => {
    expect(
      loadMapConfig('test/assets/mapconfig_invalid.json')
    ).rejects.toThrowError(/SyntaxError/)
  })
  test('should throw error when not exist json loaded', async () => {
    expect(
      loadMapConfig('test/assets/mapconfig_not_exist.json')
    ).rejects.toThrowError(/ENOENT/)
  })
})

describe('fileNameFromURL', () => {
  it('should get fileName from path of src', () => {
    expect(
      fileNameFromURL(
        'http://localhost:3000/path/to/image.jpg',
        { flds: [] },
        { srcName: '', dstName: '', fldType: 'image' }
      )
    ).toEqual('image.jpg')
  })
  it('should get fileName from filed of src.searchParams', () => {
    expect(
      fileNameFromURL(
        'http://localhost:3000/path/to/?fileName=image.jpg',
        { media: { image: { fileNameField: 'fileName' } }, flds: [] },
        { srcName: '', dstName: '', fldType: 'image' }
      )
    ).toEqual('image.jpg')
  })
  it('should get fileName from filed of src.searchParams(fileNameField by MapFldsImage)', () => {
    expect(
      fileNameFromURL(
        'http://localhost:3000/path/to/?fileName=image.jpg',
        { flds: [] },
        {
          srcName: '',
          dstName: '',
          fldType: 'image',
          fileNameField: 'fileName'
        }
      )
    ).toEqual('image.jpg')
  })
  it('should throw error when invalid url passed', () => {
    expect(() =>
      fileNameFromURL(
        '/path/to/image.jpg',

        { flds: [] },
        { srcName: '', dstName: '', fldType: 'image' }
      )
    ).toThrow(
      'fileNameFromURL: src=/path/to/image.jpg,filedName=: TypeError [ERR_INVALID_URL]: Invalid URL: /path/to/image.jpg'
    )
    expect(() =>
      fileNameFromURL(
        '/path/to/image.jpg',
        { media: { image: { fileNameField: 'fileName' } }, flds: [] },
        { srcName: '', dstName: '', fldType: 'image' }
      )
    ).toThrow(
      'fileNameFromURL: src=/path/to/image.jpg,filedName=fileName: TypeError [ERR_INVALID_URL]: Invalid URL: /path/to/image.jpg'
    )
  })
  it('should throw error when path is blank', () => {
    expect(() =>
      fileNameFromURL(
        'http://localhost:3000',

        { flds: [] },
        { srcName: '', dstName: '', fldType: 'image' }
      )
    ).toThrow(
      'fileNameFromURL: src=http://localhost:3000,filedName=: image filename is blank'
    )
  })
  it('should throw error when field is not match', () => {
    expect(() =>
      fileNameFromURL(
        'http://localhost:3000/path/to/?fileName=image.jpg',
        { media: { image: { fileNameField: 'image' } }, flds: [] },
        { srcName: '', dstName: '', fldType: 'image' }
      )
    ).toThrow(
      'fileNameFromURL: src=http://localhost:3000/path/to/?fileName=image.jpg,filedName=image: image filename is blank'
    )
  })
})

describe('isImageDownload', () => {
  test('should return true', () => {
    expect(
      isImageDownload(
        { media: { image: { download: true } }, flds: [] },
        { url: 'http://localhost:3000/image.jpg', size: {}, meta: {} }
      )
    ).toBeTruthy()
    expect(
      isImageDownload(
        {
          media: {
            image: {
              library: [
                { src: 'http://localhost:3000/', kind: 'imgix', download: true }
              ]
            }
          },
          flds: []
        },
        { url: 'http://localhost:3000/image.jpg', size: {}, meta: {} }
      )
    ).toBeTruthy()
    expect(
      isImageDownload(
        {
          media: {
            image: {
              download: false,
              library: [
                { src: 'http://localhost:3000/', kind: 'imgix', download: true }
              ]
            }
          },
          flds: []
        },
        { url: 'http://localhost:3000/image.jpg', size: {}, meta: {} }
      )
    ).toBeTruthy()
  })
  test('should return false', () => {
    expect(
      isImageDownload(
        { flds: [] },
        { url: 'http://localhost:3000/image.jpg', size: {}, meta: {} }
      )
    ).not.toBeTruthy()
    expect(
      isImageDownload(
        {
          media: {
            image: {
              library: [{ src: 'http://localhost:3000/', kind: 'imgix' }]
            }
          },
          flds: []
        },
        { url: 'http://localhost:3000/image.jpg', size: {}, meta: {} }
      )
    ).not.toBeTruthy()
    expect(
      isImageDownload(
        {
          media: {
            image: {
              download: true,
              library: [
                {
                  src: 'http://localhost:3000/',
                  kind: 'imgix',
                  download: false
                }
              ]
            }
          },
          flds: []
        },
        { url: 'http://localhost:3000/image.jpg', size: {}, meta: {} }
      )
    ).not.toBeTruthy()
  })
})

describe('validId', () => {
  test('should return true', () => {
    expect(validId(123)).toBeTruthy()
    expect(validId('id')).toBeTruthy()
    expect(validId('ID')).toBeTruthy()
    expect(validId('123abcABC')).toBeTruthy()
    expect(validId('123-abc_ABC')).toBeTruthy()
    expect(
      validId(
        '-_0123456789abcdefghijklmnopqrstuvwxyZABCDEFGHIJKLMNOPQRSTUVWXYZ'
      )
    ).toBeTruthy()
  })
  test('should return false', () => {
    expect(validId('')).not.toBeTruthy()
    expect(validId('post.md')).not.toBeTruthy()
    expect(validId('path/../../../../../to/post')).not.toBeTruthy()
  })
})

describe('mappingFlds', () => {
  test('should map flds', async () => {
    const n = new Date().toUTCString()
    expect(
      await mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title',
          有効: false,
          回数: 21,
          タイムスタンプ: n,
          画像: 'アプリ_Images/test.png',
          画像obj: {
            url: 'http://localhost:3000/path/to/image.jpg',
            width: 200,
            height: 100
          },
          色: '赤',
          背景色: '青',
          オブジェクト: { key: 'value' },
          配列: [10, 20, 30],
          本文: '<p>test html1</p><p>test html2</p>'
        }),
        {
          flds: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              srcName: '有効',
              dstName: 'enabled',
              fldType: 'boolean'
            },
            {
              srcName: '回数',
              dstName: 'count',
              fldType: 'number'
            },
            {
              srcName: 'タイムスタンプ',
              dstName: 'timestamp',
              fldType: 'datetime'
            },
            {
              srcName: '画像',
              dstName: 'image',
              fldType: 'image'
            },
            {
              srcName: '画像obj',
              dstName: 'imageObj',
              fldType: 'image'
            },
            {
              srcName: '色',
              dstName: 'color',
              fldType: 'enum',
              replace: []
            },
            {
              srcName: '背景色',
              dstName: 'bgColor',
              fldType: 'enum',
              replace: [
                { pattern: '赤', replacement: 'red' },
                { pattern: '青', replacement: 'blue' }
              ]
            },
            {
              srcName: 'オブジェクト',
              dstName: 'obj',
              fldType: 'object'
            },
            {
              srcName: '配列',
              dstName: 'arr',
              fldType: 'object'
            },
            {
              srcName: '本文',
              dstName: 'content',
              fldType: 'html',
              convert: 'markdown'
            }
          ]
        }
      )
    ).toEqual({
      _RowNumber: 1,
      id: 'idstring',
      createdAt: new Date(n),
      updatedAt: new Date(n),
      title: 'Title',
      enabled: false,
      count: 21,
      timestamp: new Date(n),
      image: 'アプリ_Images/test.png',
      imageObj: {
        url: 'http://localhost:3000/path/to/image.jpg',
        width: 200,
        height: 100
      },
      color: '赤',
      bgColor: 'blue',
      obj: { key: 'value' },
      arr: [10, 20, 30],
      content: 'test html1\n\ntest html2\n'
    })
  })
  test('should map flds multiple', async () => {
    const n = new Date().toUTCString()
    expect(
      await mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title'
        }),
        {
          flds: [
            {
              srcName: 'タイトル',
              dstName: 'title1',
              fldType: 'string'
            },
            {
              srcName: 'タイトル',
              dstName: 'title2',
              fldType: 'string'
            }
          ]
        }
      )
    ).toEqual({
      _RowNumber: 1,
      id: 'idstring',
      createdAt: new Date(n),
      updatedAt: new Date(n),
      title1: 'Title',
      title2: 'Title'
    })
  })
  test('should select value from object by jsonata', async () => {
    const n = new Date().toUTCString()
    expect(
      await mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          images: [
            {
              title: '1234',
              image: {
                url: 'http://localhost:3000/path/to/image-1234.jpg',
                width: 200,
                height: 100
              }
            },
            {
              title: 'abcd',
              image: {
                url: 'http://localhost:3000/path/to/image_abcd.jpg',
                width: 100,
                height: 200
              }
            },
            {
              title: '4567',
              image: {
                url: 'http://localhost:3000/path/to/image-4567.jpg',
                width: 300,
                height: 200
              }
            }
          ],
          content: {
            title: 'test',
            html: '<p>test html1</p><p>test html2</p>'
          }
        }),
        {
          flds: [
            {
              srcName: 'images',
              dstName: 'image',
              fldType: 'image',
              transformJsonata: jsonata('*[title="1234"].image')
            },
            {
              srcName: 'content',
              dstName: 'content',
              fldType: 'html',
              transformJsonata: jsonata('html'),
              convert: 'markdown'
            }
          ]
        }
      )
    ).toEqual({
      _RowNumber: 1,
      id: 'idstring',
      createdAt: new Date(n),
      updatedAt: new Date(n),
      image: {
        url: 'http://localhost:3000/path/to/image-1234.jpg',
        width: 200,
        height: 100
      },
      content: 'test html1\n\ntest html2\n'
    })
  })
  test('should throw invalid id error ', async () => {
    const n = new Date().toUTCString()
    await expect(
      mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'id.string',
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        }),
        {
          flds: [
            {
              srcName: '名前',
              dstName: 'filename',
              fldType: 'string'
            }
          ]
        }
      )
    ).rejects.toThrowError(
      `mappingFlds: invalid id: value = id.string, params = id, id, id`
    )
    await expect(
      mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        }),
        {
          flds: [
            {
              srcName: '名前',
              dstName: 'filename',
              fldType: 'string'
            }
          ]
        }
      )
    ).rejects.toThrowError(
      `mappingFlds: invalid id: value = undefined, params = id, id, id`
    )
    await expect(
      mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        }),
        {
          flds: [
            {
              srcName: '名前',
              dstName: 'filename',
              fldType: 'id'
            }
          ]
        }
      )
    ).rejects.toThrowError(
      `mappingFlds: invalid id: value = file.md, params = 名前, filename, id`
    )
  })
  test('should throw invalid type error ', async () => {
    const n = new Date().toUTCString()
    await expect(
      mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          有効: ''
        }),
        {
          flds: [
            {
              srcName: '有効',
              dstName: 'enabled',
              fldType: 'boolean'
            }
          ]
        }
      )
    ).rejects.toThrowError(
      `mappingFlds: invalid type: actually type = string, params = 有効, enabled, boolean`
    )
    await expect(
      mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          回数: '21'
        }),
        {
          flds: [
            {
              srcName: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        }
      )
    ).rejects.toThrowError(
      `mappingFlds: invalid type: actually type = string, params = 回数, count, number`
    )
    await expect(
      mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          本文: 21
        }),
        {
          flds: [
            {
              srcName: '本文',
              dstName: 'content',
              fldType: 'html'
            }
          ]
        }
      )
    ).rejects.toThrowError(
      `mappingFlds: invalid type: actually type = number, params = 本文, content, html`
    )
  })
  test('should throw invalid jsonata error ', async () => {
    const n = new Date().toUTCString()
    await expect(
      mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          list: [
            {
              id: 'id1',
              title: 'test1'
            },
            {
              id: 'id2',
              title: 'test2'
            }
          ]
        }),
        {
          flds: [
            {
              srcName: 'list',
              dstName: 'list',
              fldType: 'object',
              transform: '$${name:title}',
              transformJsonata: jsonata('$${name:title}')
            }
          ]
        }
      )
    ).rejects.toThrowError(
      /^transformFldValue: transform=\$\${name:title} message=Key/
    )
  })
  test('should skip no exist flds', async () => {
    const n = new Date().toUTCString()
    expect(
      await mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          title: 'title1',
          回数: 21
        }),
        {
          flds: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              srcName: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        }
      )
    ).toEqual({
      _RowNumber: 1,
      id: 'idstring',
      createdAt: new Date(n),
      updatedAt: new Date(n),
      count: 21
    })
  })
  test('should pass through unmapped flds', async () => {
    const n = new Date().toUTCString()
    expect(
      await mappingFlds(
        new ResRecord({
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          title: 'title1',
          回数: 21,
          category: [
            {
              title: 'Cat1',
              id: 'cat1'
            },
            {
              title: 'Cat2',
              id: 'cat2'
            }
          ]
        }),
        {
          passthruUnmapped: true,
          flds: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              srcName: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        }
      )
    ).toEqual({
      _RowNumber: 1,
      id: 'idstring',
      createdAt: new Date(n),
      updatedAt: new Date(n),
      title: 'title1',
      count: 21,
      category: [
        {
          title: 'Cat1',
          id: 'cat1'
        },
        {
          title: 'Cat2',
          id: 'cat2'
        }
      ]
    })
  })
})

export {}
