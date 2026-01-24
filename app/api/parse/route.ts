import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Получаем HTML страницы
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Ищем заголовок статьи
    let title = ''
    const titleSelectors = [
      'h1',
      'article h1',
      '.post-title',
      '.article-title',
      '.entry-title',
      '[class*="title"]',
      'title'
    ]
    
    for (const selector of titleSelectors) {
      const found = $(selector).first().text().trim()
      if (found && found.length > 10) {
        title = found
        break
      }
    }

    // Ищем дату
    let date = ''
    const dateSelectors = [
      'time[datetime]',
      'time',
      '[class*="date"]',
      '[class*="published"]',
      '[class*="time"]',
      'meta[property="article:published_time"]',
      'meta[name="publish-date"]',
      'meta[name="date"]'
    ]

    for (const selector of dateSelectors) {
      let found = ''
      if (selector.startsWith('meta')) {
        found = $(selector).attr('content') || ''
      } else if (selector.includes('[datetime]')) {
        found = $(selector).attr('datetime') || $(selector).text().trim()
      } else {
        found = $(selector).first().text().trim() || $(selector).first().attr('datetime') || ''
      }
      if (found && found.length > 0) {
        date = found
        break
      }
    }

    // Ищем основной контент
    let content = ''
    const contentSelectors = [
      'article',
      '.post',
      '.content',
      '.article-content',
      '.entry-content',
      '.post-content',
      '[class*="article"]',
      '[class*="content"]',
      'main',
      '.main-content'
    ]

    for (const selector of contentSelectors) {
      const found = $(selector).first()
      if (found.length > 0) {
        // Удаляем скрипты, стили и другие ненужные элементы
        found.find('script, style, nav, header, footer, aside, .ad, .advertisement, .social, .share').remove()
        const text = found.text().trim()
        if (text && text.length > 100) {
          content = text
          break
        }
      }
    }

    // Если не нашли контент, пробуем body
    if (!content) {
      $('script, style, nav, header, footer, aside').remove()
      content = $('body').text().trim()
    }

    // Очищаем контент от лишних пробелов и переносов строк
    content = content.replace(/\s+/g, ' ').trim()
    
    // Ограничиваем длину контента
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '...'
    }

    return NextResponse.json({
      date: date || 'Не найдено',
      title: title || 'Не найдено',
      content: content || 'Не найдено'
    })

  } catch (error: any) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse article' },
      { status: 500 }
    )
  }
}
