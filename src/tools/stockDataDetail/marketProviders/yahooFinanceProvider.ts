import yahooFinance from 'yahoo-finance2';
import {
  calculateMACD,
  calculateKDJ,
  calculateRSI,
  calculateBOLL,
  calculateSMA,
  parseIndicatorParams,
  expandIndicators,
  filterDataToUserRange
} from '../index.js';

interface EastMoneyQuoteData {
  f43: number;  // 当前价
  f44: number;  // 最高价
  f45: number;  // 最低价
  f46: number;  // 开盘价
  f47?: number; // 成交量
  f48?: number; // 成交额
  f57: string;  // 股票代码
  f58: string;  // 股票名称
  f169?: number; // 涨跌幅(%)
  f170?: number; // 涨跌额
}

export interface YahooFinanceDataParams {
  code: string;
  marketType: string;
  userStartDate: string;
  userEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  requestedIndicators: string[];
  originalStartDate?: string;
  originalEndDate?: string;
}

export interface YahooFinanceDataResult {
  stockData: Record<string, any>[];
  indicators: Record<string, any>;
}

export async function fetchYahooFinanceData(params: YahooFinanceDataParams): Promise<YahooFinanceDataResult> {
  const { code, marketType, userStartDate, userEndDate, actualStartDate, actualEndDate, requestedIndicators } = params;

  // 验证市场类型
  if (!['cn', 'us', 'hk'].includes(marketType)) {
    throw new Error(`Yahoo Finance 不支持 ${marketType} 市场类型`);
  }

  // 转换股票代码格式
  const yahooSymbol = convertToYahooSymbol(code, marketType);
  console.log(`使用 Yahoo Finance 获取 ${marketType} 市场股票 ${code} (${yahooSymbol}) 的行情数据`);

  // 转换日期格式 (YYYYMMDD -> Date)
  const startDate = parseDate(actualStartDate);
  const endDate = parseDate(actualEndDate);

  try {
    // 如果开始日期和结束日期相同，且是今天，直接使用实时API
    if (actualStartDate === actualEndDate && actualEndDate === formatDate(new Date()) && marketType === 'cn') {
      console.log(`检测到查询单日(今天)数据，直接使用东方财富API`);
      const eastMoneyData = await fetchEastMoneyRealTimeData(code, marketType);
      if (eastMoneyData && eastMoneyData.vol > 0 && eastMoneyData.close > 0) {
        console.log(`✅ 东方财富API获取今天数据成功`);
        return { stockData: [eastMoneyData], indicators: {} };
      } else {
        throw new Error(`东方财富API无法获取有效的今日数据`);
      }
    }

    const chartData = await yahooFinance.chart(yahooSymbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    if (!chartData.quotes || chartData.quotes.length === 0) {
      throw new Error(`未找到 ${marketType} 市场股票 ${code} 的行情数据`);
    }

    // 转换数据格式为 Tushare 兼容格式
    let stockData = chartData.quotes.map(quote => ({
      trade_date: formatDate(quote.date!),
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      vol: quote.volume,
      amount: quote.volume && quote.close ? (quote.volume * quote.close) / 10000 : null // 转换为万元
    })).filter(item => item.open !== null && item.close !== null);

    // 按日期降序排列（最新日期在前，与 Tushare 格式一致）
    stockData.sort((a, b) => b.trade_date.localeCompare(a.trade_date));

    // 检查是否需要补充当前数据
    const latestHistoricalDate = stockData.length > 0 ? stockData[0].trade_date : null;
    const today = new Date();
    const todayStr = formatDate(today);

    // 如果请求的结束日期是今天，则优先使用实时API获取更准确的数据
    if (userEndDate === todayStr) {
      console.log(`检测到查询今天(${todayStr})的数据，使用实时API获取`);

      let realtimeDataAdded = false;

      // 对于中国A股，优先使用东方财富API获取更准确的实时数据
      if (marketType === 'cn') {
        console.log(`中国A股市场，优先使用东方财富API获取实时数据...`);
        try {
          const eastMoneyData = await fetchEastMoneyRealTimeData(code, marketType);
          if (eastMoneyData && eastMoneyData.vol > 0 && eastMoneyData.close > 0) {
            // 如果历史数据中有今天的数据，替换它；否则添加
            if (latestHistoricalDate === todayStr) {
              stockData[0] = eastMoneyData;
              console.log(`✅ 东方财富API替换今天的历史数据: ${todayStr}`);
            } else {
              stockData.unshift(eastMoneyData);
              console.log(`✅ 东方财富API补充今天的实时数据: ${todayStr}`);
            }
            realtimeDataAdded = true;
          }
        } catch (eastMoneyError) {
          console.warn(`东方财富API调用失败: ${eastMoneyError instanceof Error ? eastMoneyError.message : String(eastMoneyError)}`);
        }
      }

      // 如果东方财富API失败或不是中国市场，尝试Yahoo Finance quote API
      if (!realtimeDataAdded) {
        console.log(`尝试使用Yahoo Finance Quote API获取实时数据...`);
        try {
          const quote = await yahooFinance.quote(yahooSymbol);
          console.log(`Yahoo Finance Quote API返回:`, {
            regularMarketPrice: quote?.regularMarketPrice,
            regularMarketVolume: quote?.regularMarketVolume,
            marketState: quote?.marketState
          });

          if (quote && quote.regularMarketPrice && quote.regularMarketVolume && quote.regularMarketVolume > 0) {
            const currentData = {
              trade_date: todayStr,
              open: quote.regularMarketOpen || quote.regularMarketPrice,
              high: quote.regularMarketDayHigh || quote.regularMarketPrice,
              low: quote.regularMarketDayLow || quote.regularMarketPrice,
              close: quote.regularMarketPrice,
              vol: quote.regularMarketVolume || 0,
              amount: quote.regularMarketVolume && quote.regularMarketPrice
                ? (quote.regularMarketVolume * quote.regularMarketPrice) / 10000
                : null
            };

            if (currentData.vol > 0 && currentData.close > 0) {
              if (latestHistoricalDate === todayStr) {
                stockData[0] = currentData;
                console.log(`✅ Yahoo Finance替换今天的历史数据: ${todayStr}`);
              } else {
                stockData.unshift(currentData);
                console.log(`✅ Yahoo Finance补充今天的实时数据: ${todayStr}`);
              }
              realtimeDataAdded = true;
            }
          }
        } catch (yahooError) {
          console.warn(`Yahoo Finance实时数据获取失败: ${yahooError instanceof Error ? yahooError.message : String(yahooError)}`);
        }
      }

      if (!realtimeDataAdded) {
        console.warn(`无法获取今天的实时数据，可能是非交易日或所有数据源暂不可用`);
      }
    }

    console.log(`成功获取到${stockData.length}条${code}股票数据记录（Yahoo Finance + 实时数据补充）`);

    // 计算技术指标
    let indicators: Record<string, any> = {};

    if (requestedIndicators.length > 0) {
      // 扩展多参数MA为多个单参数MA
      const expandedIndicators = expandIndicators(requestedIndicators);

      // 构建按时间正序的价格序列（技术指标计算需要）
      const closes = stockData.map(d => parseFloat(String(d.close))).reverse();
      const highs = stockData.map(d => parseFloat(String(d.high))).reverse();
      const lows = stockData.map(d => parseFloat(String(d.low))).reverse();

      for (const indicator of expandedIndicators) {
        try {
          const { name, params } = parseIndicatorParams(indicator);

          switch (name) {
            case 'macd':
              if (params.length !== 3) {
                throw new Error(`MACD指标需要3个参数，格式：macd(快线,慢线,信号线)，如：macd(12,26,9)`);
              }
              indicators.macd = calculateMACD(closes, params[0], params[1], params[2]);
              break;
            case 'rsi':
              if (params.length !== 1) {
                throw new Error(`RSI指标需要1个参数，格式：rsi(周期)，如：rsi(14)`);
              }
              indicators.rsi = calculateRSI(closes, params[0]);
              break;
            case 'kdj':
              if (params.length !== 3) {
                throw new Error(`KDJ指标需要3个参数，格式：kdj(K周期,K平滑,D平滑)，如：kdj(9,3,3)`);
              }
              indicators.kdj = calculateKDJ(highs, lows, closes, params[0], params[1], params[2]);
              break;
            case 'boll':
              if (params.length !== 2) {
                throw new Error(`布林带指标需要2个参数，格式：boll(周期,标准差倍数)，如：boll(20,2)`);
              }
              indicators.boll = calculateBOLL(closes, params[0], params[1]);
              break;
            case 'ma':
              if (params.length !== 1) {
                throw new Error(`移动平均线需要1个参数，格式：ma(周期)，如：ma(5)、ma(10)、ma(20)`);
              }
              const maPeriod = params[0];
              indicators[`ma${maPeriod}`] = calculateSMA(closes, maPeriod);
              break;
            default:
              throw new Error(`不支持的技术指标: ${name}，支持的指标：macd(12,26,9)、rsi(14)、kdj(9,3,3)、boll(20,2)、ma(周期)`);
          }
        } catch (error) {
          console.error(`解析技术指标 ${indicator} 时出错:`, error);
          throw new Error(`技术指标参数错误: ${indicator}`);
        }
      }

      // 将技术指标数据逆序回来，以匹配原始数据的时间顺序（最新日期在前）
      Object.keys(indicators).forEach(key => {
        if (typeof indicators[key] === 'object' && indicators[key] !== null) {
          if (Array.isArray(indicators[key])) {
            indicators[key] = indicators[key].reverse();
          } else {
            // 对于MACD、KDJ、BOLL等对象类型的指标
            Object.keys(indicators[key]).forEach(subKey => {
              if (Array.isArray(indicators[key][subKey])) {
                indicators[key][subKey] = indicators[key][subKey].reverse();
              }
            });
          }
        }
      });
    }

    // 过滤数据到用户请求的时间范围
    if (requestedIndicators.length > 0) {
      stockData = filterDataToUserRange(stockData, userStartDate, userEndDate);
      console.log(`过滤到用户请求时间范围，剩余${stockData.length}条记录`);
    }

    return { stockData, indicators };

  } catch (error) {
    console.error(`Yahoo Finance API 请求失败:`, error);
    throw new Error(`无法从 Yahoo Finance 获取 ${code} 的数据: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function convertToYahooSymbol(code: string, marketType: string): string {
  switch (marketType) {
    case 'us':
      // 美股直接使用代码
      return code.toUpperCase();
    case 'hk':
      // 港股：如果没有 .HK 后缀则添加
      return code.toUpperCase().includes('.HK') ? code.toUpperCase() : `${code.toUpperCase()}.HK`;
    case 'cn':
      // A股：转换为 Yahoo Finance 格式
      if (code.includes('.SZ')) {
        return code.replace('.SZ', '.SZ');
      } else if (code.includes('.SH')) {
        return code.replace('.SH', '.SS');
      } else {
        // 如果没有后缀，根据代码判断交易所
        if (code.startsWith('6')) {
          return `${code}.SS`; // 上交所
        } else if (code.startsWith('0') || code.startsWith('3')) {
          return `${code}.SZ`; // 深交所
        }
      }
      return code;
    default:
      return code;
  }
}

function parseDate(dateStr: string): Date {
  // 将 YYYYMMDD 格式转换为 Date 对象
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // 月份从0开始
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

function formatDate(date: Date): string {
  // 将 Date 对象转换为 YYYYMMDD 格式
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 获取东方财富实时数据
 * @param code 股票代码，如 002115
 * @param marketType 市场类型
 */
async function fetchEastMoneyRealTimeData(code: string, marketType: string): Promise<any | null> {
  try {
    // 转换股票代码格式为东方财富格式
    let secid = '';
    let cleanCode = code;

    if (marketType === 'cn') {
      // 清理股票代码，移除后缀
      if (code.includes('.SH')) {
        cleanCode = code.replace('.SH', '');
        secid = `1.${cleanCode}`; // 上交所
      } else if (code.includes('.SZ')) {
        cleanCode = code.replace('.SZ', '');
        secid = `0.${cleanCode}`; // 深交所
      } else if (cleanCode.startsWith('6')) {
        secid = `1.${cleanCode}`; // 上交所
      } else if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) {
        secid = `0.${cleanCode}`; // 深交所
      } else {
        secid = `0.${cleanCode}`;
      }
    } else {
      console.warn(`东方财富API暂不支持${marketType}市场`);
      return null;
    }

    const url = `http://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f169,f170`;
    console.log(`调用东方财富API: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`东方财富API请求失败: ${response.status}`);
    }

    const data = await response.json();

    if (data.rc !== 0 || !data.data) {
      throw new Error(`东方财富API返回错误: ${JSON.stringify(data)}`);
    }

    const quoteData: EastMoneyQuoteData = data.data;
    console.log(`东方财富API返回数据:`, quoteData);

    // 验证数据有效性
    if (!quoteData.f43 || quoteData.f43 <= 0) {
      throw new Error('东方财富API返回的价格数据无效');
    }

    const today = new Date();
    const todayStr = formatDate(today);

    // 转换为与Yahoo Finance兼容的格式 (东方财富价格单位是分，需要除以100转换为元)
    const currentData = {
      trade_date: todayStr,
      open: quoteData.f46 ? quoteData.f46 / 100 : quoteData.f43 / 100,
      high: quoteData.f44 ? quoteData.f44 / 100 : quoteData.f43 / 100,
      low: quoteData.f45 ? quoteData.f45 / 100 : quoteData.f43 / 100,
      close: quoteData.f43 / 100,
      vol: quoteData.f47 || 0,
      amount: quoteData.f48 ? quoteData.f48 / 10000 : null // 东方财富返回的是元，转换为万元
    };

    console.log(`东方财富实时数据转换结果:`, currentData);
    return currentData;

  } catch (error) {
    console.error(`东方财富API调用失败:`, error);
    return null;
  }
}