import { NewsItem } from '../financeNews.js';
import { createRequire } from 'module';

// 类型定义
type EncodingName = 'gbk' | 'gb2312' | 'gb18030' | 'utf-8' | 'latin1';

interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

// 常量定义
const FETCH_TIMEOUT = 10000; // 10秒超时
const CONTENT_FETCH_LIMIT = 5; // 最多获取5条新闻正文
const MAX_RESULTS = 20; // 最多返回20条结果

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
} as const;

// 编码检测和转换工具类
class EncodingHandler {
  // 检测页面声明的字符编码
  static detectDeclaredEncoding(html: string): string | null {
    // 检测meta标签中的charset声明
    const patterns = [
      /<meta[^>]*charset=["']?([^"'>\s]+)/i,
      /<meta[^>]*content=["'][^"']*charset=([^"';\s]+)/i,
      /<\?xml[^>]*encoding=["']?([^"'>\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase().trim();
      }
    }

    return null;
  }


  // 标准化编码名称
  static normalizeEncodingName(encoding: string): string {
    const normalized = encoding.toLowerCase().replace(/[-_]/g, '');

    // 标准化常见编码名称
    const encodingMap: Record<string, string> = {
      gbk: 'gbk',
      gb2312: 'gbk',  // GB2312是GBK的子集
      gb18030: 'gb18030',
      utf8: 'utf-8',
      'utf-8': 'utf-8',
      iso88591: 'latin1',
      latin1: 'latin1'
    };

    return encodingMap[normalized] || 'utf-8';
  }

  // 使用正确的编码解码字节流
  static async decodeWithEncoding(bytes: Uint8Array, encoding: string): Promise<string> {
    const normalizedEncoding = this.normalizeEncodingName(encoding);

    try {
      switch (normalizedEncoding) {
        case 'gbk':
        case 'gb18030':
          // 对于GBK/GB18030，使用特殊处理
          return await this.decodeGBKBytes(bytes);

        case 'latin1':
          return new TextDecoder('latin1').decode(bytes);

        case 'utf-8':
        default:
          return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      }
    } catch (error) {
      console.error(`编码解码失败 (${encoding}):`, error);
      // 回退到UTF-8
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
  }

  // GBK字节流解码，使用 iconv-lite 库
  private static async decodeGBKBytes(bytes: Uint8Array): Promise<string> {
    try {
      // 使用 createRequire 在 ES 模块中导入 CommonJS 模块
      const require = createRequire(import.meta.url);
      const iconv = require('iconv-lite');

      // 使用 iconv-lite 正确解码 GBK/GB2312 编码
      const buffer = Buffer.from(bytes);
      const text = iconv.decode(buffer, 'gbk');
      
      return text;
    } catch (error) {
      console.error('GBK字节解码失败:', error);
      // 回退到UTF-8
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
  }
}

// 网页正文提取函数
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 获取原始字节数据
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let html = '';

    // 使用标准化的编码检测和解码流程
    try {
      // 步骤1：使用UTF-8解码来检测页面声明的编码
      const utf8Preview = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024));
      const declaredEncoding = EncodingHandler.detectDeclaredEncoding(utf8Preview);

      if (declaredEncoding) {
        console.log(`检测到页面声明编码: ${declaredEncoding}`);

        // 步骤2：使用声明的编码进行解码
        html = await EncodingHandler.decodeWithEncoding(bytes, declaredEncoding);

        console.log(`使用 ${EncodingHandler.normalizeEncodingName(declaredEncoding)} 编码解码完成`);

      } else {
        // 步骤3：没有找到编码声明，默认使用UTF-8解码
        console.log('未找到编码声明，使用UTF-8解码');
        html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      }

    } catch (decodeError) {
      console.error('编码处理失败:', decodeError);
      // 回退到基本UTF-8解码
      html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }

    return extractMainContent(html);

  } catch (error) {
    console.error(`获取文章内容失败 (${url}):`, error instanceof Error ? error.message : error);
    return '';
  }
}

// 从HTML中提取主要内容的通用函数
function extractMainContent(html: string): string {
  try {
    // 优先级策略提取正文内容

    // 策略1: 证券之星等特定网站的精确提取
    const stockstarContent = extractStockstarContent(html);
    if (stockstarContent) {
      return stockstarContent;
    }

    // 策略2: 通用的内容选择器
    const contentSelectors = [
      // 常见的文章内容选择器（按优先级排序）
      /<div[^>]*id="[^"]*(?:Detail|content|article|main)[^"]*"[^>]*>(.*?)<\/div>/gs,
      /<div[^>]*class="[^"]*article[_-]?content[^"]*"[^>]*>(.*?)<\/div>/gs,
      /<div[^>]*class="[^"]*(?:content|article|main|text|body)[^"]*"[^>]*>(.*?)<\/div>/gs,
      /<article[^>]*>(.*?)<\/article>/gs,
      /<div[^>]*class="[^"]*(?:news-content|post-content)[^"]*"[^>]*>(.*?)<\/div>/gs
    ];

    let bestContent = '';
    let maxLength = 0;

    for (const selector of contentSelectors) {
      const matches = html.match(selector);
      if (matches) {
        for (const match of matches) {
          const cleanText = cleanHtmlContent(match);
          if (cleanText.length > maxLength && cleanText.length > 100) {
            maxLength = cleanText.length;
            bestContent = cleanText;
          }
        }
      }
    }

    // 策略3: 如果没有找到合适的内容，尝试提取所有p标签
    if (!bestContent) {
      const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gs);
      if (pMatches) {
        const pContent = pMatches
          .map(p => cleanHtmlContent(p))
          .filter(text => text.length > 20)
          .join('\n\n');
        if (pContent.length > 100) {
          bestContent = pContent;
        }
      }
    }

    return bestContent.slice(0, 5000); // 限制长度避免过长

  } catch (error) {
    console.error('HTML内容提取失败:', error);
    return '';
  }
}

// 专门提取证券之星等网站的内容
function extractStockstarContent(html: string): string {
  try {
    // 策略1: 精确提取article_content中的段落
    const articleContentMatch = html.match(/<div[^>]*class="[^"]*article_content[^"]*"[^>]*>(.*?)<\/div>/s);
    if (articleContentMatch) {
      const contentHtml = articleContentMatch[1];
      console.log('找到article_content，开始提取段落...');

      // 提取所有p标签内容，保持顺序
      const paragraphs: string[] = [];

      // 先尝试提取带ID的特定段落（qcc_patent_开头的ID）
      const specificIds = ['qcc_patent_1', 'qcc_patent_2', 'qcc_patent_3', 'qcc_patent_4'];
      specificIds.forEach(id => {
        const idPattern = new RegExp(`<p[^>]*id="${id}"[^>]*>(.*?)<\/p>`, 's');
        const match = contentHtml.match(idPattern);
        if (match && match[1]) {
          const cleanText = cleanHtmlContent(match[1]);
          if (cleanText.length > 20) {
            paragraphs.push(cleanText);
          }
        }
      });

      // 如果没有找到特定ID的段落，提取所有p标签
      if (paragraphs.length === 0) {
        const pMatches = contentHtml.match(/<p[^>]*>(.*?)<\/p>/gs);
        if (pMatches) {
          pMatches.forEach(pMatch => {
            const cleanText = cleanHtmlContent(pMatch);
            // 过滤掉免责声明、版权信息和太短的内容
            if (cleanText.length > 30 &&
                !cleanText.includes('免责声明') &&
                !cleanText.includes('不构成投资建议') &&
                !cleanText.includes('数据来源：') &&
                !cleanText.includes('以上内容为') &&
                !cleanText.includes('由AI算法生成')) {
              paragraphs.push(cleanText);
            }
          });
        }
      }

      if (paragraphs.length > 0) {
        console.log(`成功提取 ${paragraphs.length} 个段落`);
        return paragraphs.join('\n\n');
      }
    }

    // 策略2: 如果没有找到article_content，尝试查找Detail div中的内容
    const detailMatch = html.match(/<div[^>]*id="Detail"[^>]*>(.*?)<\/div>/s);
    if (detailMatch) {
      console.log('未找到article_content，尝试从Detail div提取...');
      const detailContent = detailMatch[1];

      // 在Detail中查找article_content
      const articleInDetail = detailContent.match(/<div[^>]*class="[^"]*article_content[^"]*"[^>]*>(.*?)<\/div>/s);
      if (articleInDetail) {
        const contentHtml = articleInDetail[1];
        const pMatches = contentHtml.match(/<p[^>]*>(.*?)<\/p>/gs);
        if (pMatches) {
          const paragraphs = pMatches
            .map(p => cleanHtmlContent(p))
            .filter(text => text.length > 30 &&
                           !text.includes('免责声明') &&
                           !text.includes('不构成投资建议'))
            .slice(0, 6); // 取前6段

          if (paragraphs.length > 0) {
            console.log(`从Detail中成功提取 ${paragraphs.length} 个段落`);
            return paragraphs.join('\n\n');
          }
        }
      }
    }

    console.log('证券之星特定提取失败');
    return '';
  } catch (error) {
    console.error('证券之星内容提取失败:', error);
    return '';
  }
}

// 清理HTML标签和特殊字符
function cleanHtmlContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // 移除HTML标签
    .replace(/&nbsp;/g, ' ') // 替换非断行空格
    .replace(/&amp;/g, '&') // 替换HTML实体
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '') // 移除数字实体
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
}

// 百度新闻搜索爬虫
export async function searchBaiduNews(keywords: string[]): Promise<NewsItem[]> {
  // 参数验证
  if (!Array.isArray(keywords) || keywords.length === 0) {
    console.warn('搜索关键词为空，返回空结果');
    return [];
  }

  const validKeywords = keywords.filter(k => k && k.trim().length > 0);
  if (validKeywords.length === 0) {
    console.warn('没有有效的搜索关键词，返回空结果');
    return [];
  }

  try {
    const searchQuery = validKeywords.join(' ');
    console.log(`正在搜索百度新闻关键词: ${searchQuery}`);
    
    // 百度新闻搜索URL，使用word参数传递搜索关键词
    const encodedQuery = encodeURIComponent(searchQuery);
    const baiduUrl = `https://www.baidu.com/s?rtt=1&bsst=1&cl=2&tn=news&ie=utf-8&word=${encodedQuery}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT + 5000); // 稍长一点避免超时

    const response = await fetch(baiduUrl, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.baidu.com/'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`百度新闻请求失败: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`百度新闻页面HTML长度: ${html.length}`);
    
    // 解析百度新闻页面内容
    const newsItems = parseBaiduNews(html, searchQuery);

    console.log(`百度新闻解析完成，共获得 ${newsItems.length} 条新闻`);

    // 并发获取正文内容（避免过多请求）
    const itemsToFetch = newsItems.slice(0, CONTENT_FETCH_LIMIT);
    console.log(`开始获取前 ${itemsToFetch.length} 条新闻的正文内容...`);

    const contentPromises = itemsToFetch.map(async (item, index) => {
      try {
        const content = await fetchArticleContent(item.url);
        if (content) {
          item.content = content;
          console.log(`✓ 获取第 ${index + 1} 条新闻正文成功 (${content.length} 字符)`);
        } else {
          console.log(`✗ 获取第 ${index + 1} 条新闻正文失败`);
        }
      } catch (error) {
        console.log(`✗ 获取第 ${index + 1} 条新闻正文出错:`, error instanceof Error ? error.message : error);
      }
      return item;
    });

    // 等待所有正文获取完成
    await Promise.allSettled(contentPromises);

    console.log(`正文内容获取完成`);
    return newsItems.slice(0, MAX_RESULTS);
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('百度新闻搜索超时');
    } else {
      console.error('百度新闻搜索出错:', error);
    }
    return [];
  }
}

// 解析百度新闻页面内容
function parseBaiduNews(html: string, searchQuery: string): NewsItem[] {
  const newsItems: NewsItem[] = [];
  
  try {
    // 策略: 查找所有新闻结果的容器区块(div.result)，然后逐个解析
    const newsBlockRegex = /<div[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>(.*?)<\/div>/gs;
    const blockMatches = html.match(newsBlockRegex);

    if (blockMatches) {
        console.log(`找到 ${blockMatches.length} 个新闻区块`);
        for (const blockHtml of blockMatches) {
            const newsItem = extractNewsFromBaiduItem(blockHtml, searchQuery);
            if (newsItem && newsItems.length < 15) {
                // 检查重复，避免添加相同的文章
                if (!newsItems.some(item => item.title === newsItem.title)) {
                    newsItems.push(newsItem);
                }
            }
        }
    }

    // 如果主策略未找到任何新闻，则启用备用策略
    if (newsItems.length === 0) {
        console.log("主策略未找到新闻，启用备用策略...");
        // 备用策略: 查找包含新闻标题的h3标签 (旧方法)
        const titleRegex = /<h3[^>]*class="[^"]*t"[^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a><\/h3>/g;
        let titleMatch;
        while ((titleMatch = titleRegex.exec(html)) !== null && newsItems.length < 15) {
            const url = titleMatch[1];
            const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
            if (title && url && containsKeywords(title, searchQuery)) {
                newsItems.push({
                    title: title,
                    summary: title,
                    url: url,
                    source: '百度新闻',
                    publishTime: '未知时间', // 备用策略无法保证时间匹配
                    keywords: searchQuery.split(' ').filter(k => k.trim().length > 0)
                });
            }
        }
    }
    
  } catch (error) {
    console.error('百度新闻页面解析出错:', error);
  }

  return newsItems.slice(0, MAX_RESULTS);
}

// 从单个百度新闻区块中提取完整信息
function extractNewsFromBaiduItem(itemHtml: string, searchQuery: string): NewsItem | null {
  try {
    // 策略1: 解析s-data注释中的结构化数据
    const dataMatch = itemHtml.match(/<!--s-data:(.*?)-->/);
    if (dataMatch) {
      try {
        const newsData = JSON.parse(dataMatch[1]);
        if (newsData.title && newsData.titleUrl) {
          const title = newsData.title.replace(/<[^>]*>/g, '').trim();
          const summary = (newsData.summary || title).replace(/<[^>]*>/g, '').trim();
          const source = newsData.sourceName || '百度新闻';
          const publishTime = newsData.dispTime || '未知时间';

          if (containsKeywords(title + summary, searchQuery)) {
            return {
              title,
              summary,
              url: newsData.titleUrl,
              source,
              publishTime,
              keywords: searchQuery.split(' ').filter(k => k.trim().length > 0)
            };
          }
        }
      } catch (jsonError) {
        // JSON解析失败，继续下一个策略
      }
    }

    // 策略2: 解析新版HTML结构 (news-title class)
    const newTitleMatch = itemHtml.match(/<h3[^>]*class="[^"]*news-title[^"]*"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*[^>]*aria-label="[^"]*：([^"]*)"[^>]*>/s);
    if (newTitleMatch && newTitleMatch[1] && newTitleMatch[2]) {
      const url = newTitleMatch[1];
      const title = newTitleMatch[2].replace(/<[^>]*>/g, '').trim();

      if (containsKeywords(title, searchQuery)) {
        return {
          title,
          summary: title,
          url: url,
          source: '百度新闻',
          publishTime: '未知时间',
          keywords: searchQuery.split(' ').filter(k => k.trim().length > 0)
        };
      }
    }

    // 策略3: 原有的HTML结构解析
    const titleMatch = itemHtml.match(/<h3[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>.*?<\/h3>/s);

    // 摘要信息 - 尝试多种可能的class名
    const summaryMatch = itemHtml.match(/<div[^>]*class="[^"]*(?:c-abstract|news-desc|desc)[^"]*"[^>]*>([^<]+(?:<br\s*\/?>[^<]+)*)<\/div>/);

    // 时间信息 - 尝试多种可能的时间格式
    const timeMatch = itemHtml.match(/<span[^>]*class="[^"]*(?:c-color-gray2|news-time|time)[^"]*"[^>]*(?:aria-label="发布于：([^"]*)"[^>]*>([^<]*)|>([^<]*))<\/span>/);

    if (titleMatch && titleMatch[1] && titleMatch[2]) {
      const url = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();

      // 摘要是可选的，默认为标题
      let summary = title;
      if (summaryMatch && summaryMatch[1]) {
          summary = summaryMatch[1].replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').trim();
      }

      // 时间也是可选的 - 处理不同的匹配组
      let time = '';
      if (timeMatch) {
        time = (timeMatch[2] || timeMatch[3] || timeMatch[1] || '').trim();
      }

      // 必须有标题和链接，且包含关键词
      if (title && url && containsKeywords(title + summary, searchQuery)) {
        return {
          title,
          summary,
          url: url,
          source: '百度新闻',
          publishTime: time || '未知时间',
          keywords: searchQuery.split(' ').filter(k => k.trim().length > 0)
        };
      }
    }
  } catch (error) {
    console.error('解析百度新闻项出错:', error);
  }

  return null;
}

// 检查内容是否包含关键词
function containsKeywords(content: string, searchQuery: string): boolean {
  const keywords = searchQuery.split(' ').filter(k => k.trim().length > 0);
  const lowerContent = content.toLowerCase();
  
  // OR逻辑：只要包含任意一个关键词即可
  return keywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
} 