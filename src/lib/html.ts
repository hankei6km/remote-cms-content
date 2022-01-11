import { unified, Plugin, Transformer } from 'unified'
import rehypeParse from 'rehype-parse'
import rehype2Remark, { Options } from 'rehype-remark'
import { em } from 'hast-util-to-mdast/lib/handlers/em.js'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkFootnotes from 'remark-footnotes'
import remarkDirective from 'remark-directive'
import remarkStringify from 'remark-stringify'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { directive } from 'micromark-extension-directive'
import { directiveFromMarkdown } from 'mdast-util-directive'
import { Root, Node, Element, Text } from 'hast'
import { Code } from 'mdast'
import { visitParents } from 'unist-util-visit-parents'
import matter from 'gray-matter'
import splitParagraph from 'rehype-split-paragraph'
import imageSalt from '@hankei6km/rehype-image-salt'
import { codeDockHandler } from './codedock.js'
import {
  MapFldsHtmlOpts,
  HtmlToMarkdownOpts,
  HtmlToHtmlOpts,
  HtmlToOptsUnusualSpaceChars
} from '../types/map.js'

export function extractFrontMatter(
  p: Element
): [matter: string, matterRange: number] {
  let matter = ''
  let matterRange = 0
  if (
    p.children.length > 0 &&
    p.children[0].type === 'text' &&
    p.children[0].value === '---'
  ) {
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
                properties: {}, // rehype-remark で children の text node 内が変換されることを防ぐ("\n" が " " となる).
                children: [
                  {
                    type: 'element',
                    tagName: 'code',
                    properties: {}, // 上の propeties と同じ目的で記述.
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

type UnusualSpaceCharsTransformerOpts = {
  mode?: HtmlToOptsUnusualSpaceChars
}
// &nbsp; &ensp; &emsp; 体裁を整えるために使われそうな white space 的文字.
// \s だと \t なども含まれるので使わない.
const unusualSpaceCharsRegExp = /[\u00A0\u2002\u2003]/g
export const normalizeSpaceCharsTransformer: Plugin<
  [UnusualSpaceCharsTransformerOpts] | [],
  string,
  Root
> = function normalizeSpaceCharsTransformer(
  opts: UnusualSpaceCharsTransformerOpts = { mode: 'none' }
): Transformer {
  const visitTest =
    opts.mode === undefined || opts.mode === 'none'
      ? (_node: Node) => false
      : opts.mode === 'throw' || opts.mode === 'normalize'
      ? (node: Node) => {
          if (
            node.type === 'text' ||
            node.type === 'emphasis' ||
            node.type === 'strong' ||
            node.type === 'inlineCode' ||
            node.type === 'code'
          ) {
            return true
          }
          return false
        }
      : (node: Node) => {
          if (node.type === 'code') {
            return true
          }
          return false
        }
  return function transformer(tree: Node): void {
    const visitor = (node: Node) => {
      const n = node as Code
      if (typeof n.value === 'string') {
        if (opts.mode === 'throw') {
          if (n.value.match(unusualSpaceCharsRegExp)) {
            throw new Error(
              `normalizeSpaceCharsTransformer: Unusual space char is existed:${n.value}`
            )
          }
        } else if (
          opts.mode === 'normalize' ||
          opts.mode === 'normalizeInCodeBlock'
        ) {
          n.value = n.value.replace(unusualSpaceCharsRegExp, ' ')
        }
      }
    }
    visitParents(tree, visitTest, visitor)
  }
}

const uToFootnoteOrDirectiveReferenceRegExp = /^\^/
const uToFootnoteOrDirectiveHandler = (h: any, node: Element): any => {
  if (
    node.children.length === 1 &&
    node.children[0].type === 'text' &&
    node.children[0].value !== ''
  ) {
    // text node のみ(CMS からの変換だとこの形が多いかな)
    if (node.children[0].value.match(uToFootnoteOrDirectiveReferenceRegExp)) {
      // text node のみで ^ で始まっているなら footnoteReference へ変換する.
      // なお、今回の変換は最終的に Markdown になるので
      // footnoteReference と footnoteDefinition の区別がつかない.
      // `<u>^1<u>: footnote1` のような記述があれば Markdown としては `[^1]: footnote1` となる.
      const t = node.children[0].value.slice(1)
      return {
        type: 'footnoteReference',
        identifier: t,
        label: t
      }
    } else {
      // text node のみなら Markdown として解釈する.
      // その結果から textDirective か footnote として扱う.
      // ここまでやるなら <u> の中をインライン Markdown として扱いたいが、
      // node の階層があわない.
      // <u> のノードに対して children[] を割り当てることは難しい.
      const text = node.children[0].value
      const tree = fromMarkdown(text, {
        extensions: [directive()],
        mdastExtensions: [directiveFromMarkdown]
      })

      const children =
        tree.type === 'root' &&
        tree.children.length > 0 &&
        tree.children[0].type === 'paragraph'
          ? tree.children[0].children
          : undefined

      if (
        children &&
        children.length > 0 &&
        children[0].type === 'textDirective'
      ) {
        // textDirective なら html としてわたす.
        // ここで textDirective にするとこれを処理している processor に remark-directive が必要となる.
        // その場合、pre などのテキストに記述されている textDirective がエスケースされる.
        // (徐々にがんじがらめになってきた)
        return {
          type: 'html',
          value: text
        }
      }

      return {
        type: 'footnote',
        children: children ? children : [{ type: 'text', value: text }]
      }
    }
  }
  // デフォルトでは <u> は <en> と同じような扱いだったので.
  return em(h, node)
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
  const imageSaltOpts: boolean | Parameters<typeof imageSalt>[0] =
    opts.imageSalt !== undefined
      ? Array.isArray(opts.imageSalt)
        ? opts.imageSalt
        : [opts.imageSalt]
      : false
  return unified()
    .use(rehypeParse, { fragment: true })
    .use(firstParagraphAsCodeDockTransformer)
    .use(imageSalt, imageSaltOpts)
    .use(splitParagraph)
    .use(rehype2Remark, {
      handlers: {
        pre: codeDockHandler,
        br: brHandler,
        u: uToFootnoteOrDirectiveHandler
      }
    } as unknown as Options)
    .use(remarkGfm)
    .use(remarkFootnotes, { inlineNotes: true }) // remark-gfm だと inline に対応していないため.
    .use(remarkStringify)
    .freeze()
}

const htmlToMarkdownPostProcessor = (opts: HtmlToMarkdownOpts) => {
  return unified()
    .use(remarkDirective)
    .use(remarkParse)
    .use(normalizeSpaceCharsTransformer, { mode: opts.unusualSpaceChars })
    .use(remarkGfm)
    .use(remarkFootnotes, { inlineNotes: true }) // remark-gfm だと inline に対応していないため.
    .use(remarkStringify)
    .freeze()
}

const htmlToHtmlFrontMatterRegExp = /^\s*(---\n.+\n---\n+){0,1}.*$/ms
const htmlToHtmlLfRegExp = /\n/g
export async function htmlToHtml(
  html: string,
  opts: HtmlToHtmlOpts
): Promise<string> {
  if (html) {
    const file = await htmlToHtmlProcessor(opts)
      .process(html)
      .catch((err) => {
        throw err
      })
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
      return converted
    }
    return `${converted}\n`
  }
  return ''
}

export async function htmlToMarkdown(
  html: string,
  opts: HtmlToMarkdownOpts
): Promise<string> {
  if (html) {
    const f = await htmlToMarkdownProcessor(opts)
      .process(html)
      .catch((err) => {
        throw err
      })
    // とりあえず暫定で改ページさせる
    const m = matter(`${f}`.replace(/\\---/g, '---'))
    const file = await htmlToMarkdownPostProcessor(opts)
      .process(m.content)
      .catch((err) => {
        throw err
      })
    return matter.stringify(`${file}`, m.data)
  }
  return ''
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
