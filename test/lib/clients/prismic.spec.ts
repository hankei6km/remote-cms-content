import { jest } from '@jest/globals'

jest.unstable_mockModule('apollo-link-prismic', async () => {
  const mockPrismicLink = jest.fn()
  const reset = () => {
    mockPrismicLink.mockReset()
  }
  reset()
  return {
    PrismicLink: mockPrismicLink,
    _reset: reset,
    _getMocks: () => ({
      mockPrismicLink
    })
  }
})

const mockApolloLinkPrismic = await import('apollo-link-prismic')
const { mockPrismicLink } = (mockApolloLinkPrismic as any)._getMocks()
const { PrismicGqlRecord, ClientPrismicGql } = await import(
  '../../../src/lib/clients/prismic.js'
)

afterEach(async () => {
  ;(mockApolloLinkPrismic as any)._reset()
})

describe('PrismicGqlRecord', () => {
  const n1 = new Date().toUTCString()
  const n2 = new Date().toUTCString()
  it('should return baseFlds from _meta', () => {
    expect(
      new PrismicGqlRecord({
        _meta: {
          id: 'id1',
          firstPublicationDate: n1,
          lastPublicationDate: n2
        }
      }).baseFlds()
    ).toEqual({
      id: 'id1',
      createdAt: n1,
      updatedAt: n2
    })
  })
  it('should return true from isAsyncFld()', () => {
    expect(
      new PrismicGqlRecord({ content: '' }).isAsyncFld({
        srcName: 'content',
        dstName: 'content',
        fldType: 'html'
      })
    ).toBeTruthy()
  })
  it('should return false from isAsyncFld()', () => {
    expect(
      new PrismicGqlRecord({ content: '' }).isAsyncFld({
        srcName: 'content',
        dstName: 'content',
        fldType: 'string'
      })
    ).toBeFalsy()
  })
  it('should return HTML from RichText field', async () => {
    expect(
      await new PrismicGqlRecord({
        content: [
          {
            type: 'paragraph',
            text: 'test1',
            spans: []
          },
          {
            type: 'heading2',
            text: 'h-2',
            spans: []
          },
          {
            type: 'preformatted',
            text: '- test1\n- test2\n- test3\n\n<div class="flex">',
            spans: []
          },
          {
            type: 'paragraph',
            text: 'test2',
            spans: []
          }
        ]
      }).getAsync({
        srcName: 'content',
        dstName: 'content',
        fldType: 'html'
      })
    ).toEqual(
      '<p>test1</p><h2>h-2</h2><pre><code>- test1\n- test2\n- test3\n\n&#x3C;div class="flex"></code></pre><p>test2</p>'
    )
  })
})

describe('ClientPrismicGql', () => {
  it('should call PrisimicLink', () => {
    new ClientPrismicGql({
      apiBaseURL: '',
      credential: ['repository-name', 'pat']
    })
    expect(mockPrismicLink).toBeCalledWith({
      uri: 'https://repository-name.cdn.prismic.io/graphql',
      accessToken: 'pat'
    })
  })
})
