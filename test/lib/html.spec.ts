import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import stringify from 'rehype-stringify'
import {
  firstParagraphAsCodeDockTransformer,
  htmlToMarkdown
} from '../../src/lib/html.js'

describe('firstParagraphAsCodeDockTransformer()', () => {
  const f = async (html: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      unified()
        .use(rehypeParse, { fragment: true })
        .use(firstParagraphAsCodeDockTransformer)
        .use(stringify)
        .freeze()
        .process(html, (err, file) => {
          if (err) {
            reject(err)
          }
          resolve(String(file))
        })
    })
  }
  it('should convert paragraph like frontmatter to codedock', async () => {
    expect(await f('<p>test1</p>')).toEqual('<p>test1</p>')
    expect(await f('<p>tes2</p><p>tes3</p>')).toEqual('<p>tes2</p><p>tes3</p>')
    expect(await f('<p>---<br>foo:bar<br>---<br></p><p>tes4</p>')).toEqual(
      '<pre><code>===md\n---\n\nfoo:bar\n\n---\n</code></pre><p>tes4</p>'
    )
    expect(await f('<p>---<br>foo:bar<br>---<br>tes4</p>')).toEqual(
      '<pre><code>===md\n---\n\nfoo:bar\n\n---\n</code></pre><p>tes4</p>'
    )
    expect(await f('<p>---<br>foo:bar<br>---<br><br><br>tes4</p>')).toEqual(
      '<pre><code>===md\n---\n\nfoo:bar\n\n---\n</code></pre><p>tes4</p>'
    )
    expect(
      await f(
        '<p>---<br>foo:&lt;/code&gt;&lt;/pre&gt;<br>---<br></p><p>tes4</p>'
      )
    ).toEqual(
      '<pre><code>===md\n---\n\nfoo:&#x3C;/code>&#x3C;/pre>\n\n---\n</code></pre><p>tes4</p>'
    )
  })
  it('should not convert paragraph(not first)', async () => {
    expect(
      await f('<p>first</p><p>---<br>foo:bar<br>---<br></p><p>tes</p>')
    ).toEqual('<p>first</p><p>---<br>foo:bar<br>---<br></p><p>tes</p>')
  })
  it('should not convert paragraph(included element node)', async () => {
    expect(
      await f(
        '<p>---<br>foo:bar<br><img src="/path/to/img.jpg">---<br></p><p>tes</p>'
      )
    ).toEqual(
      '<p>---<br>foo:bar<br><img src="/path/to/img.jpg">---<br></p><p>tes</p>'
    )
  })
  it('should not convert paragraph(not closed)', async () => {
    expect(await f('<p>---<br>foo:bar<br><br></p><p>tes</p>')).toEqual(
      '<p>---<br>foo:bar<br><br></p><p>tes</p>'
    )
  })
})

describe('htmlToMarkdown()', () => {
  it('should convert html to markdown', async () => {
    expect(await htmlToMarkdown('<p>test1</p>', {})).toEqual('test1\n')
    expect(
      await htmlToMarkdown(
        '<h1>head1</h1><p>test1</p><h2>head2</h2><p>test2</p>',
        {}
      )
    ).toEqual('# head1\n\ntest1\n\n## head2\n\ntest2\n')
  })
  it('should convert html embed codedock to markdown', async () => {
    expect(await htmlToMarkdown('<p>test1</p>', {})).toEqual('test1\n')
    expect(
      await htmlToMarkdown(
        '<h1>head1</h1><p>test1</p><pre><code>===md\n[foo](/bar)</code></pre>',
        {}
      )
    ).toEqual('# head1\n\ntest1\n\n[foo](/bar)\n')
  })
  it('should embed attrs of img to alt', async () => {
    expect(
      await htmlToMarkdown(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200"></p><h2>head2</h2><p>test2</p>',
        {
          embedImgAttrs: { baseURL: 'https://localhost:3000/path/to/image.jpg' }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image{width="300" height="200"}](https://localhost:3000/path/to/image.jpg)\n\n## head2\n\ntest2\n'
    )
  })
  it('should embed attrs of img to block', async () => {
    expect(
      await htmlToMarkdown(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200"></p><h2>head2</h2><p>test2</p>',
        {
          embedImgAttrs: {
            baseURL: 'https://localhost:3000/path/to/image.jpg',
            embedTo: 'block'
          }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image](https://localhost:3000/path/to/image.jpg){width="300" height="200"}\n\n## head2\n\ntest2\n'
    )
  })
  it('should embed custom attrs', async () => {
    expect(
      await htmlToMarkdown(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200" data-salt-thumb></p><h2>head2</h2><p>test2</p>',
        {
          embedImgAttrs: {
            baseURL: 'https://localhost:3000/path/to/image.jpg',
            embedTo: 'block',
            pickAttrs: ['width', 'height', 'dataSaltThumb']
          }
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image](https://localhost:3000/path/to/image.jpg){width="300" height="200" data-salt-thumb=""}\n\n## head2\n\ntest2\n'
    )
  })
  it('should accept opts array', async () => {
    expect(
      await htmlToMarkdown(
        '<h1>head1</h1><p>test1</p><p><img src="https://localhost:3000/path/to/image.jpg" alt="image" width="300" height="200"></p><h2>head2</h2><p>test2</p><p><img src="https://localhost:3001/path/to/image.jpg" alt="image" width="300" height="200"></p>',
        {
          embedImgAttrs: [
            {
              baseURL: 'https://localhost:3000/path/to/image.jpg',
              embedTo: 'block'
            },
            {
              baseURL: 'https://localhost:3001/path/to/image.jpg',
              embedTo: 'block',
              pickAttrs: ['width']
            }
          ]
        }
      )
    ).toEqual(
      '# head1\n\ntest1\n\n![image](https://localhost:3000/path/to/image.jpg){width="300" height="200"}\n\n## head2\n\ntest2\n\n![image](https://localhost:3001/path/to/image.jpg){width="300"}\n'
    )
  })
})
