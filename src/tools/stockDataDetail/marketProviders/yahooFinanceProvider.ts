import yahooFinance from 'yahoo-finance2';
import {
  calculateMACD,
  calculateKDJ,
  calculateRSI,
  calculateBOLL,
  calculateSMA,
  parseIndicatorParams,
  filterDataToUserRange
} from '../index.js';

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
    // 获取历史数据
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

    console.log(`成功获取到${stockData.length}条${code}股票数据记录（Yahoo Finance）`);

    // 计算技术指标
    let indicators: Record<string, any> = {};

    if (requestedIndicators.length > 0) {
      // 构建按时间正序的价格序列（技术指标计算需要）
      const closes = stockData.map(d => parseFloat(String(d.close))).reverse();
      const highs = stockData.map(d => parseFloat(String(d.high))).reverse();
      const lows = stockData.map(d => parseFloat(String(d.low))).reverse();

      for (const indicator of requestedIndicators) {
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