import { jest } from '@jest/globals'

jest.unstable_mockModule('contentful', async () => {
  const mockCreateClient = jest.fn()
  const mockGetEntries = jest.fn()
  let res: any = {}
  const reset = () => {
    res = {
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
      ]
    }
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
const { queryEquality, client } = await import(
  '../../../src/lib/clients/contentful.js'
)

afterEach(async () => {
  ;(mockCtf as any)._reset()
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
  it('should get rendered contents from Contentful space', async () => {
    const n = new Date().toUTCString()

    const res = client({
      apiBaseURL: '',
      apiName: 'contentmodel',
      credential: ['spcaeId', 'cda_token']
    })
      .request()
      .fetch()
    expect(mockCreateClient).toHaveBeenLastCalledWith({
      space: 'spcaeId',
      accessToken: 'cda_token'
    })
    expect(await res).toEqual({
      contents: [
        {
          id: 'id1',
          createdAt: '2021-11-10T07:47:13.673Z',
          updatedAt: '2021-11-10T10:29:51.095Z',
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
          },
          'fields.id': 'fld1',
          'fields.title': 'title1',
          'fields.richt': '<p>Hello world!</p>'
        },
        {
          id: 'id2',
          createdAt: '2021-11-10T07:47:13.673Z',
          updatedAt: '2021-11-10T10:29:51.095Z',
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
          },
          'fields.id': 'fld2',
          'fields.title': 'title2',
          'fields.richt':
            '<p>Hello world!</p><p><img alt="image1" src="https://images.ctfassets.net/image1.jpg" width="600" height="400"></p><p><img alt="image2{   width=&#x22;400&#x22;   height=&#x22;300&#x22; }" src="https://images.ctfassets.net/image2.jpg" width="600" height="400"></p><pre><code>console.log(123)</code></pre>'
        }
      ]
    })
    expect(mockGetEntries).toHaveBeenLastCalledWith({
      content_type: 'contentmodel'
    })
  })
  it('should get rendered contents from Contentful space with filter', async () => {
    const n = new Date().toUTCString()

    const res = await client({
      apiBaseURL: '',
      apiName: 'contentmodel',
      credential: ['spcaeId', 'cda_token']
    })
      .request()
      .filter([['eq', 'fields.k1', 'v1']])
      .filter([['eq', 'fields.k2', 'v2']])
      .fetch()
    expect(mockCreateClient).toHaveBeenLastCalledWith({
      space: 'spcaeId',
      accessToken: 'cda_token'
    })
    expect(mockGetEntries).toHaveBeenLastCalledWith({
      content_type: 'contentmodel',
      'fields.k1': 'v1',
      'fields.k2': 'v2'
    })
  })
})

export {}
