import * as cheerio from 'cheerio'

export interface PageMeta {
    url: string
    title: string
    chapter: string

}

export interface DiscoveryResult {
    bookTitle: string
    pages: PageMeta[]
}

async function fetchHTML(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
    }
    // Explicitly decode as UTF8
    const buffer = await response.arrayBuffer()
    return new TextDecoder('utf-8').decode(buffer)
}

export async function discoverPages(rootUrl: string): Promise<DiscoveryResult> {
  const html = await fetchHTML(rootUrl)
  const $ = cheerio.load(html)

  // Extract the book title from meta tags or page heading
  const bookTitle =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() ||
    $('title').first().text().trim() ||
    rootUrl

  const pages: PageMeta[] = []
  const seenUrls = new Set<string>()

  // Only accept URLs that belong to this book's content
  const bookBase = new URL(rootUrl).origin + new URL(rootUrl).pathname
  function isContentUrl(href: string): boolean {
    return (
      href.startsWith(bookBase) &&
      !href.includes('wp-login') &&
      !href.includes('wp-admin') &&
      !href.includes('xmlrpc') &&
      !href.includes('#')
    )
  }

  $('ol.toc').children('li').each((_i, el) => {
    const $el = $(el)

    if ($el.hasClass('toc__part')) {
      const chapterName = $el
        .children('.toc__title__container')
        .text()
        .replace(/\s+/g, ' ')
        .trim()

      // All content pages inside this part have p.toc__title a
      $el.find('p.toc__title a').each((_j, aEl) => {
        const href = $(aEl).attr('href')
        const title = $(aEl).text().replace(/\s+/g, ' ').trim()
        if (href && title && isContentUrl(href) && !seenUrls.has(href)) {
          seenUrls.add(href)
          pages.push({ url: href, title, chapter: chapterName })
        }
      })

    } else {
      // Front matter
      const link = $el.find('p.toc__title a').first()
      const href = link.attr('href')
      const title = link.text().replace(/\s+/g, ' ').trim()
      if (href && title && isContentUrl(href) && !seenUrls.has(href)) {
        seenUrls.add(href)
        pages.push({ url: href, title, chapter: 'Front Matter' })
      }
    }
  })

  return { bookTitle, pages }
}

export async function fetchPage(url: string): Promise<string> {
    return fetchHTML(url)
}