/**
 * 股票代码解析器 - 基于东方财富 API
 * 替代 Tushare API，提供股票代码对应的公司全称
 */

export interface StockInfo {
  ts_code: string;
  name: string;
  fullname: string;
}

interface EastMoneySearchResult {
  QuotationCodeTable: {
    Data: Array<{
      Code: string;
      Name: string;
      MktNum: string;
      SecurityTypeName: string;
      QuoteID: string;
    }>;
    Status: number;
    Message: string;
  };
}

interface EastMoneyQuoteData {
  rc: number;
  data?: {
    f57: string; // 股票代码
    f58: string; // 股票简称
  };
}

/**
 * 批量获取股票代码对应的公司全称信息
 * @param stockCodes 股票代码数组
 * @returns 格式化的股票代码说明文本
 */
export async function resolveStockCodes(stockCodes: string[]): Promise<string> {
  if (!stockCodes || stockCodes.length === 0) {
    return '';
  }

  // 去重并过滤有效的股票代码
  const uniqueCodes = [...new Set(stockCodes)]
    .filter(code => isValidStockCode(code))
    .sort();

  if (uniqueCodes.length === 0) {
    return '';
  }

  try {
    const stockInfos = await fetchStockBasicInfo(uniqueCodes);

    if (stockInfos.length === 0) {
      return '';
    }

    // 生成股票代码说明部分
    let explanation = '\n\n---\n\n## 📋 股票代码说明\n\n';

    stockInfos.forEach(stock => {
      explanation += `- **${stock.ts_code}**: ${stock.fullname || stock.name}\n`;
    });

    return explanation;
  } catch (error) {
    console.error('获取股票基本信息失败:', error);
    return '';
  }
}

/**
 * 从文本中提取股票代码
 * @param text 文本内容
 * @returns 提取到的股票代码数组
 */
export function extractStockCodes(text: string): string[] {
  if (!text) return [];

  // 匹配常见的股票代码格式：6位数字.SH/SZ, 5位数字.SZ, 00开头港股等
  const stockCodeRegex = /\b(\d{6}\.(SH|SZ|HK)|\d{5}\.(SZ|HK)|00\d{4}\.HK)\b/g;
  const matches = text.match(stockCodeRegex) || [];

  return matches.map(code => code.toUpperCase());
}

/**
 * 验证是否为有效的股票代码格式
 */
function isValidStockCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;

  const trimmed = code.trim().toUpperCase();

  // A股：6位数字.SH/.SZ
  if (/^\d{6}\.(SH|SZ)$/.test(trimmed)) return true;

  // 创业板等：5位数字.SZ
  if (/^\d{5}\.SZ$/.test(trimmed)) return true;

  // 港股：4-5位数字.HK
  if (/^\d{4,5}\.HK$/.test(trimmed)) return true;

  return false;
}

/**
 * 转换股票代码格式
 * 从 Tushare 格式 (600000.SH) 转换为东方财富格式 (1.600000)
 */
function convertToEastMoneyCode(tsCode: string): string {
  const [stockCode, market] = tsCode.split('.');

  // 上海: 1, 深圳: 0, 香港: 116
  let marketCode = '1';
  if (market === 'SZ') {
    marketCode = '0';
  } else if (market === 'HK') {
    marketCode = '116';
  }

  return `${marketCode}.${stockCode}`;
}

/**
 * 从东方财富格式转回 Tushare 格式
 */
function convertFromEastMoneyCode(eastMoneyCode: string, mktNum: string): string {
  const [marketCode, stockCode] = eastMoneyCode.split('.');

  // 根据市场代码确定后缀
  let market = 'SH';
  if (marketCode === '0' || mktNum === '0') {
    market = 'SZ';
  } else if (marketCode === '116' || mktNum === '116') {
    market = 'HK';
  }

  return `${stockCode}.${market}`;
}

/**
 * 使用东方财富搜索 API 获取股票基本信息
 */
async function fetchStockBasicInfo(stockCodes: string[]): Promise<StockInfo[]> {
  const results: StockInfo[] = [];
  const timeout = 10000; // 10秒超时

  // 并发查询所有股票，限制并发数为10
  const concurrentLimit = 10;
  for (let i = 0; i < stockCodes.length; i += concurrentLimit) {
    const batch = stockCodes.slice(i, i + concurrentLimit);

    const batchPromises = batch.map(async (code) => {
      try {
        const stockInfo = await fetchSingleStockInfo(code, timeout);
        if (stockInfo) {
          results.push(stockInfo);
        }
      } catch (error) {
        console.error(`查询股票 ${code} 失败:`, error);
        // 继续处理其他股票
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
}

/**
 * 查询单个股票信息
 * 方案1: 使用搜索接口 (更快，但可能没有全称)
 * 方案2: 使用行情接口作为备用
 */
async function fetchSingleStockInfo(tsCode: string, timeout: number): Promise<StockInfo | null> {
  const [stockCode] = tsCode.split('.');

  try {
    // 方案1: 搜索接口 (推荐)
    const searchUrl = `http://searchapi.eastmoney.com/api/suggest/get?input=${stockCode}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'http://quote.eastmoney.com/'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: EastMoneySearchResult = await response.json();

      if (data.QuotationCodeTable?.Status === 0 && data.QuotationCodeTable.Data?.length > 0) {
        const stock = data.QuotationCodeTable.Data[0];

        // 匹配正确的市场
        const expectedMarket = tsCode.split('.')[1];
        const actualMarket = stock.MktNum === '1' ? 'SH' : stock.MktNum === '0' ? 'SZ' : 'HK';

        if (actualMarket === expectedMarket || stock.Code === stockCode) {
          return {
            ts_code: tsCode,
            name: stock.Name,
            fullname: stock.Name // 搜索接口没有全称，使用简称
          };
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // 方案2: 行情接口作为备用
    return await fetchFromQuoteApi(tsCode, timeout);

  } catch (error) {
    console.error(`获取 ${tsCode} 信息失败:`, error);
    return null;
  }
}

/**
 * 使用行情接口获取股票信息 (备用方案)
 */
async function fetchFromQuoteApi(tsCode: string, timeout: number): Promise<StockInfo | null> {
  const eastMoneyCode = convertToEastMoneyCode(tsCode);
  const url = `http://push2.eastmoney.com/api/qt/stock/get?secid=${eastMoneyCode}&fields=f57,f58`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'http://quote.eastmoney.com/'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const data: EastMoneyQuoteData = await response.json();

    if (data.rc === 0 && data.data) {
      return {
        ts_code: tsCode,
        name: data.data.f58,
        fullname: data.data.f58 // 行情接口只有简称
      };
    }

    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
