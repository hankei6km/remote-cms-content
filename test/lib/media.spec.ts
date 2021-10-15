import mockAxios from 'jest-mock-axios'
import {
  imageInfoFromSrc,
  saveImageFile
} from '../../src/lib/media.js'

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

describe('imageInfoFromSrc', () => {
  it('should get imageInfo', async () => {
    expect(
      await imageInfoFromSrc('http://localhost:3000/path/to/image.jpg', false)
    ).toEqual({
      url: 'http://localhost:3000/path/to/image.jpg',
      size: {},
      meta: {}
    })
  })
  it('should get imageInfo from image object', async () => {
    expect(
      await imageInfoFromSrc(
        {
          url: 'http://localhost:3000/path/to/image.jpg',
          width: 200,
          height: 100
        },
        false
      )
    ).toEqual({
      url: 'http://localhost:3000/path/to/image.jpg',
      size: {
        width: 200,
        height: 100
      },
      meta: {}
    })
  })
})

describe('saveImageFile', () => {
  it('should get image from remote and save to local file', async () => {
    const res = saveImageFile(
      {
        url: 'https://www.appsheet.com/template/gettablefileurl?appName=appName&tableName=tbl&fileName=アプリ_Image%2Fimage.jpg',
        size: {},
        meta: {}
      },
      '/static/path/to',
      '/static',
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
      url: '/path/to/image.jpg'
    })
    const { mockCreateWriteStream } = require('fs')._getMocks()
    expect(mockCreateWriteStream).toHaveBeenLastCalledWith(
      '/static/path/to/image.jpg'
    )
    const { mockSizeOf } = require('image-size')._getMocks()
    expect(mockSizeOf).toHaveBeenLastCalledWith('/static/path/to/image.jpg')
  })
  it('should get image with out iamge info', async () => {
    const res = saveImageFile(
      {
        url: 'https://www.appsheet.com/template/gettablefileurl?appName=appName&tableName=tbl&fileName=アプリ_Image%2Fimage.jpg',
        size: {},
        meta: {}
      },
      'static/path/to/static',
      'static',
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
  it('should get image with image object', async () => {
    const res = saveImageFile(
      {
        url: 'http://localhost:3000/path/to/image.jpg',
        size: {
          width: 200,
          height: 100
        },
        meta: {}
      },
      '/static/path/to',
      '/static',
      'image.jpg',
      false
    )
    expect(mockAxios.request).toHaveBeenLastCalledWith({
      method: 'get',
      url: 'http://localhost:3000/path/to/image.jpg',
      responseType: 'stream'
    })
    mockAxios.mockResponse({
      data: 'image data'
    })
    await expect(res).resolves.toEqual({
      size: {
        width: 200,
        height: 100
      },
      meta: {},
      url: '/path/to/image.jpg'
    })
  })
  it('should get image without static root', async () => {
    const res = saveImageFile(
      {
        url: 'http://localhost:3000/path/to/image.jpg',
        size: {
          width: 200,
          height: 100
        },
        meta: {}
      },
      '/path/to',
      '',
      'image.jpg',
      false
    )
    expect(mockAxios.request).toHaveBeenLastCalledWith({
      method: 'get',
      url: 'http://localhost:3000/path/to/image.jpg',
      responseType: 'stream'
    })
    mockAxios.mockResponse({
      data: 'image data'
    })
    await expect(res).resolves.toEqual({
      size: {
        width: 200,
        height: 100
      },
      meta: {},
      url: '/path/to/image.jpg'
    })
  })
  it('should throw error by 404', async () => {
    const res = saveImageFile(
      {
        url: 'http://localhost:3000/image.jpg',
        size: {},
        meta: {}
      },
      '/path/to/static',
      '',
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
