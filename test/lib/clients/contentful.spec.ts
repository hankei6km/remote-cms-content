import { jest } from '@jest/globals'

const mockData = {
  sys: {},
  items: [
    {
      sys: {
        id: 'id1',
        createdAt: '2021-11-10T07:47:13.673Z',
        updatedAt: '2021-11-10T10:29:51.095Z'
      },
      fields: {
        id: 'fld1',
        title: 'title1',
        richt: {
          nodeType: 'document',
          content: [
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'Hello world!',
                  marks: []
                }
              ]
            }
          ]
        }
      }
    },
    {
      sys: {
        id: 'id2',
        createdAt: '2021-11-10T07:47:13.673Z',
        updatedAt: '2021-11-10T10:29:51.095Z'
      },
      fields: {
        id: 'fld2',
        title: 'title2',
        richt: {
          nodeType: 'document',
          content: [
            {
              nodeType: 'paragraph',
              content: [
                {
                  nodeType: 'text',
                  value: 'Hello world!',
                  marks: []
                }
              ]
            },
            {
              nodeType: 'embedded-asset-block',
              content: [],
              data: {
                target: {
                  fields: {
                    title: 'image1',
                    description: 'image1 description',
                    file: {
                      url: '//images.ctfassets.net/image1.jpg',
                      details: {
                        size: 100,
                        image: {
                          width: 600,
                          height: 400
                        }
                      },
                      fileName: 'image1.jpg',
                      contentType: 'image/jpeg'
                    }
                  }
                }
              }
            },
            {
              nodeType: 'embedded-asset-block',
              content: [],
              data: {
                target: {
                  fields: {
                    title: 'image2',
                    description:
                      'image2 description\n{\n  width="400"\n  height="300"\n}',
                    file: {
                      url: '//images.ctfassets.net/image2.jpg',
                      details: {
                        size: 100,
                        image: {
                          width: 600,
                          height: 400
                        }
                      },
                      fileName: 'image1.jpg',
                      contentType: 'image/jpeg'
                    }
                  }
                }
              }
            },
            {
              nodeType: 'embedded-entry-block',
              content: [],
              data: {
                target: {
                  metadata: {
                    tags: []
                  },
                  sys: {
                    type: 'Entry',
                    contentType: {
                      sys: {
                        type: 'Link',
                        linkType: 'ContentType',
                        id: 'fragmentCodeblock'
                      }
                    },
                    locale: 'ja'
                  },
                  fields: {
                    content: 'console.log(123)'
                  }
                }
              }
            }
          ]
        }
      }
    }
  ],
  total: 2
}

jest.unstable_mockModule('contentful', async () => {
  const mockCreateClient = jest.fn()
  const mockGetEntries = jest.fn()
  let res: any = {}
  const reset = () => {
    res = mockData
  }
  reset()
  return {
    default: {
      createClient: mockCreateClient.mockReturnValue({
        getEntries: mockGetEntries.mockImplementation(async () => {
          return res
        })
      })
    },
    _reset: reset,
    _data: (d: any) => {
      res = d
    },
    _getMocks: () => ({
      mockCreateClient,
      mockGetEntries
    })
  }
})

const mockCtf = await import('contentful')
const { mockCreateClient, mockGetEntries } = (mockCtf as any)._getMocks()
const { queryEquality, CtfRecord, ClientCtf } = await import(
  '../../../src/lib/clients/contentful.js'
)

afterEach(async () => {
  ;(mockCtf as any)._reset()
})

describe('CtfRecord', () => {
  it('should return true from has', () => {
    expect(
      new CtfRecord({ text: 'test1' }).has({
        srcName: 'text',
        dstName: '',
        fldType: 'string'
      })
    ).toBeTruthy()
    expect(
      new CtfRecord({ fields: { text: 'test1' } }).has({
        srcName: 'fields.text',
        dstName: '',
        fldType: 'string'
      })
    ).toBeTruthy()
  })
  it('should return false from has', () => {
    expect(
      new CtfRecord({ text: 'test1' }).has({
        srcName: 'abc',
        dstName: '',
        fldType: 'string'
      })
    ).toBeFalsy()
    expect(
      new CtfRecord({ text: 'test1' }).has({
        srcName: 'fields.text',
        dstName: '',
        fldType: 'string'
      })
    ).toBeFalsy()
    expect(
      new CtfRecord({ fields: { text: 'test1' } }).has({
        srcName: 'fields.abc',
        dstName: '',
        fldType: 'string'
      })
    ).toBeFalsy()
  })
  it('should return true from isAsyncFld', () => {
    expect(
      new CtfRecord({}).isAsyncFld({
        srcName: '',
        dstName: '',
        fldType: 'html'
      })
    ).toBeTruthy()
  })
  it('should return false from isAsyncFld', () => {
    expect(
      new CtfRecord({}).isAsyncFld({
        srcName: '',
        dstName: '',
        fldType: 'string'
      })
    ).toBeFalsy()
  })
  it('should get the value of field', () => {
    expect(
      new CtfRecord({ text: 'test1' }).getSync({
        srcName: 'text',
        dstName: '',
        fldType: 'string'
      })
    ).toEqual('test1')
  })
  it('should get the value of field that is contained "fields"', () => {
    expect(
      new CtfRecord({ fields: { text: 'test1' } }).getSync({
        srcName: 'fields.text',
        dstName: '',
        fldType: 'string'
      })
    ).toEqual('test1')
  })
  it('should return undefined', () => {
    expect(
      new CtfRecord({ text: 'test1' }).getSync({
        srcName: 'fields.abc',
        dstName: '',
        fldType: 'string'
      })
    ).toEqual(undefined)
    expect(
      new CtfRecord({ fields: { text: 'test1' } }).getSync({
        srcName: 'fields.abc',
        dstName: '',
        fldType: 'string'
      })
    ).toEqual(undefined)
    expect(
      new CtfRecord({ text: 'test1' }).getSync({
        srcName: 'fields.text',
        dstName: '',
        fldType: 'string'
      })
    ).toEqual(undefined)
  })
  it('should return HTML', async () => {
    expect(
      new CtfRecord({
        fields: { content: mockData.items[0].fields.richt }
      }).getAsync({
        srcName: 'fields.content',
        dstName: '',
        fldType: 'html'
      })
    ).resolves.toEqual('<p>Hello world!</p>')
    expect(
      new CtfRecord({
        fields: { content: mockData.items[1].fields.richt }
      }).getAsync({
        srcName: 'fields.content',
        dstName: '',
        fldType: 'html'
      })
    ).resolves.toEqual(
      '<p>Hello world!</p><p><img alt="image1" src="https://images.ctfassets.net/image1.jpg" width="600" height="400"></p><p><img alt="image2{   width=&#x22;400&#x22;   height=&#x22;300&#x22; }" src="https://images.ctfassets.net/image2.jpg" width="600" height="400"></p><pre><code>console.log(123)</code></pre>'
    )
  })
})

describe('getEntries', () => {
  it('should return filter expression', () => {
    expect(queryEquality([['eq', 'k1', 'v1']])).toEqual({ k1: 'v1' })
    expect(
      queryEquality([
        ['eq', 'k1', 'v1'],
        ['eq', 'k2', 'v2']
      ])
    ).toEqual({ k1: 'v1', k2: 'v2' })
  })
  it('should return empty object', () => {
    expect(queryEquality([])).toEqual({})
  })
})

describe('client_contentful', () => {
  it('should get rendered content from Contentful space', async () => {
    const c = new ClientCtf({
      apiBaseURL: '',
      apiName: 'contentmodel',
      credential: ['spcaeId', 'cda_token']
    }).request()
    const g = c.fetch()
    const next = g.next()
    expect(mockCreateClient).toHaveBeenLastCalledWith({
      space: 'spcaeId',
      accessToken: 'cda_token'
    })
    expect((await next).value).toEqual({
      fetch: { total: 2, count: 2 },
      content: mockData.items.map((v) => new CtfRecord({ ...v.sys, ...v }))
    })
    expect(mockGetEntries).toHaveBeenLastCalledWith({
      content_type: 'contentmodel',
      skip: 0,
      limit: undefined,
      pageSize: undefined
    })
  })
  it('should get rendered content from Contentful space with filter', async () => {
    const c = new ClientCtf({
      apiBaseURL: '',
      apiName: 'contentmodel',
      credential: ['spcaeId', 'cda_token']
    })
      .request()
      .filter([['eq', 'fields.k1', 'v1']])
      .filter([['eq', 'fields.k2', 'v2']])
    const g = c.fetch()
    await g.next()
    expect(mockCreateClient).toHaveBeenLastCalledWith({
      space: 'spcaeId',
      accessToken: 'cda_token'
    })
    expect(mockGetEntries).toHaveBeenLastCalledWith({
      content_type: 'contentmodel',
      skip: 0,
      limit: undefined,
      pageSize: undefined,
      'fields.k1': 'v1',
      'fields.k2': 'v2'
    })
  })
  it('should get rendered content from Contentful space with paginate', async () => {
    const c = new ClientCtf({
      apiBaseURL: '',
      apiName: 'contentmodel',
      credential: ['spcaeId', 'cda_token']
    })
      .request()
      .skip(5)
      .pageSize(50)
    const g = c.fetch()
    await g.next()
    expect(mockCreateClient).toHaveBeenLastCalledWith({
      space: 'spcaeId',
      accessToken: 'cda_token'
    })
    expect(mockGetEntries).toHaveBeenLastCalledWith({
      content_type: 'contentmodel',
      skip: 5,
      limit: 50
    })
  })
})

export {}
