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
import { defaultPosition, MapConfig } from '../../src/types/map.js'

describe('compileMapConfig', () => {
  test('should return MapConfig', () => {
    expect(compileMapConfig({ flds: [] })).toEqual({
      flds: []
    })
    //const mapConfig: MapConfig = {
    const mapConfig = {
      disableBaseFlds: false,
      passthruUnmapped: false,
      selectFldsToFetch: false,
      fldsToFetch: [],
      media: {
        image: {
          fileNameField: 'name',
          download: false,
          library: [{ src: 'https://', kind: 'imgix', download: false }]
        }
      },
      transform: 'Account.Order',
      position: { disable: false, fldName: 'index', start: 0 },
      flds: [
        {
          query: 'idFld',
          dstName: 'idfld',
          fldType: 'id'
        },
        {
          query: 'booleanFld',
          dstName: 'booleanFld',
          fldType: 'boolean'
        },
        {
          query: 'numberFld',
          dstName: 'numberFld',
          fldType: 'number'
        },
        {
          query: 'stringFld',
          dstName: 'stringFld',
          fldType: 'string'
        },
        {
          query: 'datetimeFld',
          dstName: 'datetimeFld',
          fldType: 'datetime'
        },
        {
          query: 'imageFld',
          dstName: 'imageFld',
          fldType: 'image',
          fileNameField: 'name',
          setSize: false
        },
        {
          query: 'enumFld',
          dstName: 'enumFld',
          fldType: 'enum',
          replace: [
            { pattern: 'p', replacement: 'r' },
            { pattern: /e/, replacement: 'r' }
          ]
        },
        {
          query: 'objectFld',
          dstName: 'objectFld',
          fldType: 'object'
        },
        {
          query: 'htmlFld',
          dstName: 'htmlFld',
          fldType: 'html',
          convert: 'markdown',
          toHtmlOpts: { frontMatter: false, splitParagraph: false },
          toMarkdownOpts: {
            imageSalt: {
              command: 'embed',
              baseURL: '/',
              embed: {
                embedTo: 'block',
                pickAttrs: ['class']
              }
            }
          }
        },
        {
          fetchFld: 'fields.selFld',
          query: 'selFld',
          dstName: 'selFld',
          fldType: 'string'
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
    expect(compileMapConfig({ passthruUnmapped: true, flds: [] })).toEqual({
      passthruUnmapped: true,
      flds: []
    })
    expect(
      compileMapConfig({
        position: {
          fldName: 'index'
        },
        flds: []
      }).position
    ).toEqual({ fldName: 'index' })
    expect(
      compileMapConfig({
        position: {
          start: 10
        },
        flds: []
      }).position
    ).toEqual({ start: 10 })
    expect(
      typeof compileMapConfig({
        flds: [
          {
            query: '*[title="1234"].image',
            dstName: 'objectwithJsonataFld',
            fldType: 'object'
          }
        ]
      }).flds[0].transformJsonata
    ).toEqual('object')
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
            query: 'test',
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
            query: '$$.{',
            dstName: 'test',
            fldType: 'object'
          }
        ]
      })
    ).toThrowError(
      'compileMapFld: compile jsonata: query=$$.{, message=Expected ":" before end of expression'
    )
  })
})

describe('loadMapConfig', () => {
  const mapConfig = {
    flds: [
      {
        query: 'タイトル',
        dstName: 'title',
        fldType: 'string'
      },
      {
        query: '画像',
        dstName: 'image',
        fldType: 'image'
      }
    ]
  }
  test('should load MapConfig from json file', async () => {
    expect(await loadMapConfig('test/assets/mapconfig.json')).toEqual(mapConfig)
  })
  test('should load MapConfig from yaml file', async () => {
    expect(await loadMapConfig('test/assets/mapconfig.yaml')).toEqual(mapConfig)
  })
  test('should load MapConfig from yml file', async () => {
    expect(await loadMapConfig('test/assets/mapconfig.yml')).toEqual(mapConfig)
  })
  test('should throw error when invalid type loaded(json)', async () => {
    await expect(
      loadMapConfig('test/assets/mapconfig_type_err.json')
    ).rejects.toThrowError(/flds/)
  })
  test('should throw error when invalid type loaded(yaml)', async () => {
    await expect(
      loadMapConfig('test/assets/mapconfig_type_err.yaml')
    ).rejects.toThrowError(/flds/)
  })
  test('should throw error when invalid json loaded', async () => {
    await expect(
      loadMapConfig('test/assets/mapconfig_invalid.json')
    ).rejects.toThrowError(/SyntaxError/)
  })
  test('should throw error when invalid yaml loaded', async () => {
    await expect(
      loadMapConfig('test/assets/mapconfig_invalid.yaml')
    ).rejects.toThrowError(/YAMLException/)
  })
  test('should throw error when not exist json loaded', async () => {
    await expect(
      loadMapConfig('test/assets/mapconfig_not_exist.json')
    ).rejects.toThrowError(/ENOENT/)
  })
  test('should throw error when not exist yaml loaded', async () => {
    await expect(
      loadMapConfig('test/assets/mapconfig_not_exist.yaml')
    ).rejects.toThrowError(/ENOENT/)
  })
})

describe('fileNameFromURL', () => {
  it('should get fileName from path of src', () => {
    expect(
      fileNameFromURL(
        'http://localhost:3000/path/to/image.jpg',
        { flds: [] },
        { query: '', dstName: '', fldType: 'image' }
      )
    ).toEqual('image.jpg')
  })
  it('should get fileName from filed of src.searchParams', () => {
    expect(
      fileNameFromURL(
        'http://localhost:3000/path/to/?fileName=image.jpg',
        { media: { image: { fileNameField: 'fileName' } }, flds: [] },
        { query: '', dstName: '', fldType: 'image' }
      )
    ).toEqual('image.jpg')
  })
  it('should get fileName from filed of src.searchParams(fileNameField by MapFldsImage)', () => {
    expect(
      fileNameFromURL(
        'http://localhost:3000/path/to/?fileName=image.jpg',
        { flds: [] },
        {
          query: '',
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
        { query: '', dstName: '', fldType: 'image' }
      )
    ).toThrow(
      'fileNameFromURL: src=/path/to/image.jpg,filedName=: TypeError [ERR_INVALID_URL]: Invalid URL: /path/to/image.jpg'
    )
    expect(() =>
      fileNameFromURL(
        '/path/to/image.jpg',
        { media: { image: { fileNameField: 'fileName' } }, flds: [] },
        { query: '', dstName: '', fldType: 'image' }
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
        { query: '', dstName: '', fldType: 'image' }
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
        { query: '', dstName: '', fldType: 'image' }
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
          本文: '<p>test html1</p><p>test html2</p>',
          'null テスト': null
        }),
        compileMapConfig({
          flds: [
            {
              query: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              query: '有効',
              dstName: 'enabled',
              fldType: 'boolean'
            },
            {
              query: '回数',
              dstName: 'count',
              fldType: 'number'
            },
            {
              query: 'タイムスタンプ',
              dstName: 'timestamp',
              fldType: 'datetime'
            },
            {
              query: '画像',
              dstName: 'image',
              fldType: 'image'
            },
            {
              query: '画像obj',
              dstName: 'imageObj',
              fldType: 'image'
            },
            {
              query: '色',
              dstName: 'color',
              fldType: 'enum',
              replace: []
            },
            {
              query: '背景色',
              dstName: 'bgColor',
              fldType: 'enum',
              replace: [
                { pattern: '赤', replacement: 'red' },
                { pattern: '青', replacement: 'blue' }
              ]
            },
            {
              query: 'オブジェクト',
              dstName: 'obj',
              fldType: 'object'
            },
            {
              query: '配列',
              dstName: 'arr',
              fldType: 'object'
            },
            {
              query: '本文',
              dstName: 'content',
              fldType: 'html',
              convert: 'markdown'
            },
            {
              query: 'null テスト',
              dstName: 'nullTest',
              fldType: 'boolean'
            }
          ]
        })
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
      // nullTest は has() で弾かれる
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
        compileMapConfig({
          flds: [
            {
              query: 'タイトル',
              dstName: 'title1',
              fldType: 'string'
            },
            {
              query: 'タイトル',
              dstName: 'title2',
              fldType: 'string'
            }
          ]
        })
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
  test('should disable base flds', async () => {
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
        compileMapConfig({
          disableBaseFlds: true,
          flds: [
            {
              query: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            }
          ]
        })
      )
    ).toEqual({
      id: 'idstring',
      title: 'Title'
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
        compileMapConfig({
          flds: [
            {
              query: '*[title="1234"].image',
              dstName: 'image',
              fldType: 'image'
            },
            {
              query: 'content.html',
              dstName: 'content',
              fldType: 'html',
              convert: 'markdown'
            }
          ]
        })
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
        compileMapConfig({
          flds: [
            {
              query: '名前',
              dstName: 'filename',
              fldType: 'string'
            }
          ]
        })
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
        compileMapConfig({
          flds: [
            {
              query: '名前',
              dstName: 'filename',
              fldType: 'string'
            }
          ]
        })
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
        compileMapConfig({
          flds: [
            {
              query: '名前',
              dstName: 'filename',
              fldType: 'id'
            }
          ]
        })
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
        compileMapConfig({
          flds: [
            {
              query: '有効',
              dstName: 'enabled',
              fldType: 'boolean'
            }
          ]
        })
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
        compileMapConfig({
          flds: [
            {
              query: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        })
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
        compileMapConfig({
          flds: [
            {
              query: '本文',
              dstName: 'content',
              fldType: 'html'
            }
          ]
        })
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
        compileMapConfig({
          flds: [
            {
              query: '$${name:title}',
              dstName: 'list',
              fldType: 'object'
            }
          ]
        })
      )
    ).rejects.toThrowError(
      /^ResRecord.execTransform: query=\$\${name:title} message=Key/
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
        compileMapConfig({
          flds: [
            {
              query: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              query: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        })
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
        compileMapConfig({
          passthruUnmapped: true,
          flds: [
            {
              query: 'タイトル',
              dstName: 'title',
              fldType: 'string'
            },
            {
              query: '回数',
              dstName: 'count',
              fldType: 'number'
            }
          ]
        })
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
