import { unified, Transformer } from 'unified'
import rehypeParse from 'rehype-parse'
import rehype2Remark, { Options } from 'rehype-remark'
import rehypeSanitize from 'rehype-sanitize'
// import { Handle } from 'hast-util-to-mdast';
import stringify from 'remark-stringify'
import { Node, Element } from 'hast'
// import visit from 'unist-util-visit';
import splitParagraph from 'rehype-split-paragraph'
import { codeDockHandler } from './codedock.js'

export function extractFrontMatter(
  p: Element
): [matter: string, matterRange: number] {
  let matter = ''
  let matterRange = 0
  if (p.children[0].type === 'text' && p.children[0].value === '---') {
    matter = ''
    const clen = p.children.length
    let closed = false
    for (let idx = 1; idx < clen; idx++) {
      const c = p.children[idx]
      if (c.type === 'text') {
        if (c.value === '---') {
          closed = true
          matterRange = idx
          break
        }
        matter = `${matter}${c.value}\n`
      } else if (c.type !== 'element' || c.tagName !== 'br') {
        matter = ''
        break
      }
    }
    if (!closed) {
      matter = ''
    }
    if (matter) {
      for (let idx = matterRange + 1; idx < clen; idx++) {
        const c = p.children[idx]
        if (c.type === 'element' && c.tagName === 'br') {
          matterRange = idx
        } else {
          break
        }
      }
    }
  }
  return [matter, matterRange]
}

const fenceToFrontMatterRegExp = /^---\n(.+)\n---\n*.*$/s
export function firstParagraphAsCodeDockTransformer(): Transformer {
  return function transformer(tree: Node): void {
    const elm = tree as Element
    if (tree.type === 'root' && Array.isArray(elm.children)) {
      if (
        elm.children[0].type === 'element' &&
        elm.children[0].tagName === 'p'
      ) {
        const cElm = elm.children[0] as Element
        const [matter, matterRange] = extractFrontMatter(cElm)
        if (matter) {
          const matterElm: Element = {
            type: 'element',
            tagName: 'pre',
            children: [
              {
                type: 'element',
                tagName: 'code',
                children: [
                  {
                    type: 'text',
                    // value: text
                    // ---\nfoo:bar\n--- だと qrcode 変換でつかっている
                    // mdast-util-from-markdown で heading として扱われる。
                    // この辺がうまくいかない場合、mdast-util-frontmattera も検討
                    value: `===md\n---\n\n${matter}\n---\n`
                  }
                ]
              }
            ]
          }
          const pElm: Element = {
            ...cElm,
            children: cElm.children.slice(matterRange + 1)
          }
          if (pElm.children.length === 0) {
            elm.children[0] = matterElm
          } else {
            elm.children.splice(0, 1, matterElm, pElm)
          }
        }
      }
    }
  }
}

const brHandler = (h: any, node: any): any => {
  // <br> が `/` になってしまうので暫定対応
  return h(node, 'text', ' ')
}

const htmlToMarkdownProcessor = unified()
  .use(rehypeParse, { fragment: true })
  .use(firstParagraphAsCodeDockTransformer)
  .use(splitParagraph)
  .use(rehypeSanitize, { allowComments: true })
  .use(rehype2Remark, {
    handlers: { pre: codeDockHandler, br: brHandler }
  } as unknown as Options)
  .use(stringify)
  .freeze()

export async function pageHtmlMarkdown(html: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (html) {
      htmlToMarkdownProcessor.process(html, function (err, file) {
        if (err) {
          console.error(err)
          reject(err)
        } else {
          // とりあえず暫定で改ページさせる
          const markdown = `${file}`.replace(/\\---/g, '---')
          if (markdown && markdown[markdown.length - 1] === '\n') {
            resolve(markdown)
            return
          }
          resolve(`${markdown}\n`)
        }
      })
    }
    resolve('')
  })
}

export async function htmlToMarkdown(html: string): Promise<string> {
  const md = await pageHtmlMarkdown(html)
  // return await qrcodeToDataUrl(md);
  return md
}
