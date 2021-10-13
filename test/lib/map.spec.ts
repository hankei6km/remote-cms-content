import { mappingCols, validId } from '../../src/lib/map.js'

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

describe('mappingCols', () => {
  test('should map cols', () => {
    const n = new Date().toUTCString()
    expect(
      mappingCols(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          タイトル: 'Title',
          回数: 21,
          タイムスタンプ: n,
          画像: 'アプリ_Images/test.png',
          色: '赤',
          背景色: '青'
        },
        {
          cols: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              colType: 'string'
            },
            {
              srcName: '回数',
              dstName: 'count',
              colType: 'number'
            },
            {
              srcName: 'タイムスタンプ',
              dstName: 'timestamp',
              colType: 'datetime'
            },
            {
              srcName: '画像',
              dstName: 'image',
              colType: 'image'
            },
            {
              srcName: '色',
              dstName: 'color',
              colType: 'enum',
              replace: []
            },
            {
              srcName: '背景色',
              dstName: 'bgColor',
              colType: 'enum',
              replace: [
                { pattern: '赤', replacement: 'red' },
                { pattern: '青', replacement: 'blue' }
              ]
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
      count: 21,
      timestamp: new Date(n),
      image: 'アプリ_Images/test.png',
      color: '赤',
      bgColor: 'blue'
    })
  })
  test('should throw invalid id error ', () => {
    const n = new Date().toUTCString()
    expect(() =>
      mappingCols(
        {
          _RowNumber: 1,
          id: 'id.string',
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        },
        {
          cols: [
            {
              srcName: '名前',
              dstName: 'filename',
              colType: 'string'
            }
          ]
        }
      )
    ).toThrow(`mappingCols: invalid id: value = id.string, params = id, id, id`)
    expect(() =>
      mappingCols(
        {
          _RowNumber: 1,
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        },
        {
          cols: [
            {
              srcName: '名前',
              dstName: 'filename',
              colType: 'string'
            }
          ]
        }
      )
    ).toThrow(`mappingCols: invalid id: value = undefined, params = id, id, id`)
    expect(() =>
      mappingCols(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          名前: 'file.md'
        },
        {
          cols: [
            {
              srcName: '名前',
              dstName: 'filename',
              colType: 'id'
            }
          ]
        }
      )
    ).toThrow(
      `mappingCols: invalid id: value = file.md, params = 名前, filename, id`
    )
  })
  test('should throw invalid type error ', () => {
    const n = new Date().toUTCString()
    expect(() =>
      mappingCols(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          回数: '21'
        },
        {
          cols: [
            {
              srcName: '回数',
              dstName: 'count',
              colType: 'number'
            }
          ]
        }
      )
    ).toThrow(
      `mappingCols: invalid type: actually type = string, params = 回数, count, number`
    )
  })
  test('should skip no exist cols', () => {
    const n = new Date().toUTCString()
    expect(
      mappingCols(
        {
          _RowNumber: 1,
          id: 'idstring',
          createdAt: n,
          updatedAt: n,
          回数: 21
        },
        {
          cols: [
            {
              srcName: 'タイトル',
              dstName: 'title',
              colType: 'string'
            },
            {
              srcName: '回数',
              dstName: 'count',
              colType: 'number'
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
})
