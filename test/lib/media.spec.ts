import mockAxios from 'jest-mock-axios'
import { fileNameFromURL, saveImageFile } from '../../src/lib/media.js'

jest.mock('fs', () => {
  const mockWrite = jest.fn()
  const mockCreateWriteStream = jest.fn()
  const reset = () => {
    mockWrite.mockReset()
    mockCreateWriteStream.mockReset().mockImplementation(() => {
      let handler: any = () => {}
      return {
        write: mockWrite,
        on: (e: any, h: any) => {
          if (e === 'close') {
            handler = h
            process.nextTick(h) // TODO: jest-mock-axios の pipe の挙動調べる.
          }
        },
        close: () => handler()
      }
    })
  }

  reset()
  return {
    createWriteStream: mockCreateWriteStream,
    _reset: reset,
    _getMocks: () => ({
      mockWrite,
      mockCreateWriteStream
    })
  }
})

jest.mock('image-size', () => {
  const mockSizeOfFn = async (pathName: string) => {
    if (pathName.match(/error/)) {
      throw new Error('dummy error')
    }
    return { width: 200, height: 100 }
  }
  let mockSizeOf = jest.fn()
  const reset = () => {
    mockSizeOf.mockReset().mockImplementation(mockSizeOfFn)
  }
  reset()
  return {
    // https://remarkablemark.org/blog/2018/06/28/jest-mock-default-named-export/
    __esModule: true,
    default: mockSizeOf,
    sizeOf: mockSizeOf,
    _reset: reset,
    _getMocks: () => ({
      mockSizeOf
    })
  }
})

afterEach(() => {
  mockAxios.reset()
  require('fs')._reset()
  require('image-size')._reset()
})

describe('fileNameFromURL', () => {
  it('should get fileName from path of src', () => {
    expect(
      fileNameFromURL('http://localhost:3000/path/to/image.jpg', '')
    ).toEqual('image.jpg')
  })
  it('should get fileName from filed of src.searchParams', () => {
    expect(
      fileNameFromURL(
        'http://localhost:3000/path/to/?fileName=image.jpg',
        'fileName'
      )
    ).toEqual('image.jpg')
  })
  it('should throw error when invalid url passed', () => {
    expect(() => fileNameFromURL('/path/to/image.jpg', '')).toThrow(
      'fileNameFromURL: src=/path/to/image.jpg,filedName=: TypeError [ERR_INVALID_URL]: Invalid URL: /path/to/image.jpg'
    )
    expect(() => fileNameFromURL('/path/to/image.jpg', 'fileName')).toThrow(
      'fileNameFromURL: src=/path/to/image.jpg,filedName=fileName: TypeError [ERR_INVALID_URL]: Invalid URL: /path/to/image.jpg'
    )
  })
  it('should throw error when path is blank', () => {
    expect(() => fileNameFromURL('http://localhost:3000', '')).toThrow(
      'fileNameFromURL: src=http://localhost:3000,filedName=: image filename is blank'
    )
  })
  it('should throw error when field is not match', () => {
    expect(() =>
      fileNameFromURL(
        'http://localhost:3000/path/to/?fileName=image.jpg',
        'image'
      )
    ).toThrow(
      'fileNameFromURL: src=http://localhost:3000/path/to/?fileName=image.jpg,filedName=image: image filename is blank'
    )
  })
})
describe('saveImage', () => {
  it('should get image from remote and save to local file', async () => {
    const res = saveImageFile(
      'https://www.appsheet.com/template/gettablefileurl?appName=appName&tableName=tbl&fileName=アプリ_Image%2Fimage.jpg',
      '/path/to/static',
      'image.jpg',
      true
    )
    expect(mockAxios.request).toHaveBeenLastCalledWith({
      method: 'get',
      url: 'https://www.appsheet.com/template/gettablefileurl?appName=appName&tableName=tbl&fileName=アプリ_Image%2Fimage.jpg',
      responseType: 'stream'
    })
    mockAxios.mockResponse({
      data: 'image data'
    })
    await expect(res).resolves.toEqual({
      size: { width: 200, height: 100 },
      meta: {},
      url: '/path/to/static/image.jpg'
    })
    const { mockCreateWriteStream } = require('fs')._getMocks()
    expect(mockCreateWriteStream).toHaveBeenLastCalledWith(
      '/path/to/static/image.jpg'
    )
  })
  it('should get image with out iamge info', async () => {
    const res = saveImageFile(
      'https://www.appsheet.com/template/gettablefileurl?appName=appName&tableName=tbl&fileName=アプリ_Image%2Fimage.jpg',
      '/path/to/static',
      'image.jpg',
      false
    )
    expect(mockAxios.request).toHaveBeenLastCalledWith({
      method: 'get',
      url: 'https://www.appsheet.com/template/gettablefileurl?appName=appName&tableName=tbl&fileName=アプリ_Image%2Fimage.jpg',
      responseType: 'stream'
    })
    mockAxios.mockResponse({
      data: 'image data'
    })
    await expect(res).resolves.toEqual({
      size: {},
      meta: {},
      url: '/path/to/static/image.jpg'
    })
  })
  it('should throw error by 404', async () => {
    const res = saveImageFile(
      'http://localhost:3000/image.jpg',
      '/path/to/static',
      'image.jpg',
      true
    )
    expect(mockAxios.request).toHaveBeenCalledTimes(1)
    mockAxios.mockError({ response: { status: 404, statusText: '' } })
    await expect(res).rejects.toThrow(
      'content.saveImage error: src = http://localhost:3000/image.jpg, status = 404:'
    )
  })
})
