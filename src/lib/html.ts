import { unified, Plugin, Transformer } from 'unified'
import rehypeParse from 'rehype-parse'
import rehype2Remark, { Options } from 'rehype-remark'
import rehypeSanitize from 'rehype-sanitize'
// import { Handle } from 'hast-util-to-mdast';
import rehypeStringify from 'rehype-stringify'
import remarkStringify from 'remark-stringify'
import { Root, Node, Element, Text } from 'hast'
// import visit from 'unist-util-visit';
import splitParagraph from 'rehype-split-paragraph'
import imageSalt from '@hankei6km/rehype-image-salt'
import { codeDockHandler } from './codedock.js'
import {
  MapFldsHtmlOpts,
  HtmlToMarkdownOpts,
  HtmlToHtmlOpts
} from '../types/map.js'

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

type FirstParagraphAsCodeDockTransformerOpts = { textNode: boolean }
const fenceToFrontMatterRegExp = /^---\n(.+)\n---\n*.*$/s
export const firstParagraphAsCodeDockTransformer: Plugin<
  [FirstParagraphAsCodeDockTransformerOpts] | [],
  string,
  Root
> = function firstParagraphAsCodeDockTransformer(
  opts?: FirstParagraphAsCodeDockTransformerOpts
): Transformer {
  const { textNode } = opts || {}
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
          const matterElm: Element | Text = textNode
            ? {
                type: 'text',
                value: `---\n${matter}\n---\n\n`
              }
            : {
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

const htmlToHtmlProcessor = (opts: HtmlToHtmlOpts) => {
  return unified()
    .use(rehypeParse, { fragment: true })
    .use(
      firstParagraphAsCodeDockTransformer,
      opts.frontMatter || false ? { textNode: true } : false
    )
    .use(splitParagraph, opts.splitParagraph || false)
    .use(rehypeStringify)
    .freeze()
}

const htmlToMarkdownProcessor = (opts: HtmlToMarkdownOpts) => {
  let ret = unified()
    .use(rehypeParse, { fragment: true })
    .use(firstParagraphAsCodeDockTransformer)

  if (opts.embedImgAttrs) {
    const o: Parameters<typeof imageSalt>[0] = (
      Array.isArray(opts.embedImgAttrs)
        ? opts.embedImgAttrs
        : [opts.embedImgAttrs]
    ).map((v) => ({
      command: 'embed',
      baseURL: v.baseURL,
      embed: {
        embedTo: v.embedTo,
        pickAttrs: v.pickAttrs
      }
    }))
    ret = ret.use(imageSalt, o)
  }
  return ret
    .use(splitParagraph)
    .use(rehypeSanitize, { allowComments: true })
    .use(rehype2Remark, {
      handlers: { pre: codeDockHandler, br: brHandler }
    } as unknown as Options)
    .use(remarkStringify)
    .freeze()
}

const htmlToHtmlFrontMatterRegExp = /^\s*(---\n.+\n---\n+){0,1}.*$/ms
const htmlToHtmlLfRegExp = /\n/g
export async function htmlToHtml(
  html: string,
  opts: HtmlToHtmlOpts
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (html) {
      htmlToHtmlProcessor(opts).process(html, function (err, file) {
        if (err) {
          console.error(err)
          reject(err)
        } else {
          let converted = `${file}`
          const lfTo = opts.lfTo === undefined ? '&#x000a;' : opts.lfTo
          if (lfTo) {
            // 空行あると HTML の終端となってしまうので &#x000a; に置き換える.
            // processor 側で変換したかったが & がエスケープされたりで断念.
            const matter = converted.replace(htmlToHtmlFrontMatterRegExp, '$1')
            const content = converted
              .slice(matter.length)
              .replace(htmlToHtmlLfRegExp, lfTo)
            converted = `${matter}${content}`
          }
          if (converted && converted[converted.length - 1] === '\n') {
            resolve(converted)
            return
          }
          resolve(`${converted}\n`)
        }
      })
    }
    resolve('')
  })
}

export async function htmlToMarkdown(
  html: string,
  opts: HtmlToMarkdownOpts
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (html) {
      htmlToMarkdownProcessor(opts).process(html, function (err, file) {
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

export async function htmlTo(
  html: string,
  opts: MapFldsHtmlOpts
): Promise<string> {
  let ret = ''
  if (opts.convert === undefined || opts.convert === 'none') {
    ret = html
  } else if (opts.convert === 'html') {
    ret = await htmlToHtml(html, opts.toHtmlOpts || {})
  } else if (opts.convert === 'markdown') {
    ret = await htmlToMarkdown(html, opts.toMarkdownOpts || {})
  }
  return ret
}
