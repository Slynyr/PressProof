import * as cheerio from 'cheerio'
import type { Element as DomElement } from 'domhandler'

type CheerioAPI = ReturnType<typeof cheerio.load>

function formatListMarker(tag: string, index: number, olType: string | undefined): string {
    if (tag === 'ul') return '-'
    // Ordered list: respect the type attribute
    switch (olType) {
        case 'a': return `${String.fromCharCode(97 + index)}.`   // a, b, c ...
        case 'A': return `${String.fromCharCode(65 + index)}.`   // A, B, C ...
        case 'i': return `${toRomanNumeral(index + 1).toLowerCase()}.`
        case 'I': return `${toRomanNumeral(index + 1)}.`
        default:  return `${index + 1}.`
    }
}

function toRomanNumeral(num: number): string {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
    let result = ''
    for (let i = 0; i < vals.length; i++) {
        while (num >= vals[i]) {
            result += syms[i]
            num -= vals[i]
        }
    }
    return result
}

function convertList($: CheerioAPI, listEl: DomElement, depth: number): string[] {
    const tag = listEl.name.toLowerCase()
    const $list = $(listEl)
    const olType = tag === 'ol' ? ($list.attr('type') ?? undefined) : undefined
    const startAttr = tag === 'ol' ? parseInt($list.attr('start') ?? '1', 10) : 0
    const lines: string[] = []
    const indent = '  '.repeat(depth)

    $list.children('li').each((i, li) => {
        const $li = $(li)
        const markerIndex = tag === 'ol' ? (startAttr - 1 + i) : i
        const marker = formatListMarker(tag, markerIndex, olType)

        // Get direct text content (excluding nested lists)
        const $clone = $li.clone()
        $clone.children('ul, ol').remove()
        const text = $clone.text().trim()

        if (text) {
            lines.push(`${indent}${marker} ${text}`)
        }

        // Recurse into nested lists
        $li.children('ul, ol').each((_j, nested) => {
            lines.push(...convertList($, nested as DomElement, depth + 1))
        })
    })

    return lines
}

export function parsePageHtml(html: string): string {
    // Pre-extract <pre> code blocks from raw HTML before cheerio parses them.
    // Without this, cheerio interprets HTML code examples (e.g. <head>, <title>)
    // as real DOM elements and strips them via .text().
    const codeBlocks: string[] = []
    html = html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, (_match, attrs, content) => {
        const langMatch = (attrs + content).match(/language-(\w+)/)
        const lang = langMatch?.[1] ?? ''

        const code = content
            .replace(/<[^>]+>/g, '')   // strip structural tags (<code>, syntax <span>s, etc.)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")

        const idx = codeBlocks.length
        codeBlocks.push(`\`\`\`${lang}\n${code}\n\`\`\``)
        return `<div class="pp-code-block" data-cb="${idx}"></div>`
    })

    const $ = cheerio.load(html)

    // Non-content elements
    $('nav, header, footer, aside, script, style, noscript, iframe').remove()

    // remove sidebar content
    $('[class*="sidebar"], [class*="navigation"], [class*="toc"], [class*="menu"]').remove()
    $('[class*="breadcrumb"], [class*="toolbar"]').remove()

    // Inline <code>: entity-encode before re-inserting so cheerio
    // doesn't parse HTML tag names as real DOM elements
    $('code').each((_i, el) => {
        const $el = $(el)
        const escaped = $el.text()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
        $el.replaceWith(`<span>\`${escaped}\`</span>`)
    })

    // Converting HTML to readable text
    const content = $('div.entry-content, main, article, #content, .content').first()
    const target = content.length ? content : $('body')

    const lines: string[] = []

    target.find('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, div.pp-code-block').each((_i, el) => {
        const $el = $(el)
        const tag = el.name.toLowerCase()

        // Skip nested lists — they are handled recursively by their parent list
        if ((tag === 'ul' || tag === 'ol') && $el.parents('ul, ol').length > 0) return

        if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1])
        lines.push(`${'#'.repeat(level)} ${$el.text().trim()}`)

        } else if (tag === 'p') {
        const text = $el.text().trim()
        if (text) lines.push(text)

        } else if (tag === 'ul' || tag === 'ol') {
        lines.push(...convertList($, el, 0))

        } else if (tag === 'blockquote') {
        lines.push(`> ${$el.text().trim()}`)

        } else if ($el.hasClass('pp-code-block')) {
        const idx = parseInt($el.attr('data-cb') ?? '0', 10)
        lines.push(codeBlocks[idx])
        }
    })

    return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}
