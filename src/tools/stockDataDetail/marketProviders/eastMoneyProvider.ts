/**
 * 东方财富数据提供者
 * 提供A股市场的历史行情数据（支持深圳和上海市场）
 * API: https://push2his.eastmoney.com/api/qt/stock/kline/get
 */

import {
  calculateMACD,
  calculateKDJ,
  calculateRSI,
  calculateBOLL,
  calculateSMA,
  parseIndicatorParams,
  filterDataToUserRange
} from '../index.js';

export interface EastMoneyDataParams {
  code: string;
  marketType: string;
  userStartDate: string;
  userEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  requestedIndicators: string[];
}

export interface EastMoneyDataResult {
  stockData: Record<string, any>[];
  indicators: Record<string, any>;
}

interface EastMoneyKlineResponse {
  rc: number;
  rt: number;
  svr: number;
  lt: number;
  full: number;
  dlmkts: string;
  data: {
    code: string;
    market: number;
    name: string;
    decimal: number;
    dktotal: number;
    preKPrice: number;
    klines: string[];
  };
}

/**
 * 解析股票代码，获取市场前缀
 * @param code 股票代码，格式如 000001.SZ 或 600519.SH
 * @returns 市场前缀：0=深圳，1=上海
 */
function parseStockCode(code: string): { market: string; stockCode: string } {
  const parts = code.split('.');
  if (parts.length !== 2) {
    throw new Error(`股票代码格式错误: ${code}，正确格式如：000001.SZ 或 600519.SH`);
  }

  const [stockCode, exchange] = parts;
  const exchangeUpper = exchange.toUpperCase();

  let market: string;
  if (exchangeUpper === 'SZ') {
    market = '0'; // 深圳
  } else if (exchangeUpper === 'SH') {
    market = '1'; // 上海
  } else {
    throw new Error(`不支持的交易所: ${exchange}，仅支持 SZ(深圳) 和 SH(上海)`);
  }

  return { market, stockCode };
}

/**
 * 获取东方财富A股历史数据
 */
export async function fetchEastMoneyData(params: EastMoneyDataParams): Promise<EastMoneyDataResult> {
  const {
    code,
    marketType,
    userStartDate,
    userEndDate,
    actualStartDate,
    actualEndDate,
    requestedIndicators
  } = params;

  // 仅支持A股市场
  if (marketType !== 'cn') {
    throw new Error('东方财富数据提供者仅支持A股市场 (market_type=cn)');
  }

  // 解析股票代码
  const { market, stockCode } = parseStockCode(code);
  const secid = `${market}.${stockCode}`;

  // 构建API请求URL
  // fields2: f51=日期, f52=开盘, f53=收盘, f54=最高, f55=最低, f56=成交量, f57=成交额, f58=振幅, f59=涨跌幅, f60=涨跌额, f61=换手率
  // klt=101: 日K线
  // fqt=1: 前复权
  const url = new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get');
  url.searchParams.set('secid', secid);
  url.searchParams.set('fields1', 'f1,f2,f3,f4,f5,f6');
  url.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
  url.searchParams.set('klt', '101'); // 日K线
  url.searchParams.set('fqt', '1');   // 前复权
  url.searchParams.set('beg', actualStartDate);
  url.searchParams.set('end', actualEndDate);
  url.searchParams.set('lmt', '10000'); // 最大限制

  console.log(`请求东方财富API: ${url.toString()}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`东方财富API请求失败: HTTP ${response.status}`);
    }

    const data = await response.json() as EastMoneyKlineResponse;

    // 检查响应状态
    if (data.rc !== 0) {
      throw new Error(`东方财富API返回错误: rc=${data.rc}`);
    }

    // 检查数据完整性
    if (!data.data || !data.data.klines || data.data.klines.length === 0) {
      throw new Error(`未找到股票 ${code} 的行情数据`);
    }

    console.log(`成功获取 ${data.data.name} (${code}) 的 ${data.data.klines.length} 条数据记录`);

    // 解析K线数据
    // 数据格式：日期,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率
    const stockData = data.data.klines.map(line => {
      const parts = line.split(',');
      return {
        trade_date: parts[0].replace(/-/g, ''), // 转换为 YYYYMMDD 格式
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        high: parseFloat(parts[3]),
        low: parseFloat(parts[4]),
        volume: parseFloat(parts[5]),      // 成交量（手）
        amount: parseFloat(parts[6]),      // 成交额（元）
        amplitude: parseFloat(parts[7]),   // 振幅(%)
        pct_chg: parseFloat(parts[8]),     // 涨跌幅(%)
        change: parseFloat(parts[9]),      // 涨跌额
        turnover_rate: parseFloat(parts[10]) // 换手率(%)
      };
    });

    // 数据按时间倒序（最新在前）
    stockData.reverse();

    console.log(`数据时间范围: ${stockData[stockData.length - 1].trade_date} ~ ${stockData[0].trade_date}`);

    // 计算技术指标
    let indicators: Record<string, any> = {};

    if (requestedIndicators.length > 0) {
      // 构建按时间正序的价格序列（用于技术指标计算）
      const closes = stockData.map(d => d.close).reverse();
      const highs = stockData.map(d => d.high).reverse();
      const lows = stockData.map(d => d.low).reverse();

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

      console.log(`成功计算技术指标: ${Object.keys(indicators).join(', ')}`);
    }

    // 过滤数据到用户请求的时间范围
    let filteredData = stockData;
    if (requestedIndicators.length > 0) {
      filteredData = filterDataToUserRange(stockData, userStartDate, userEndDate);
      console.log(`过滤到用户请求时间范围，剩余 ${filteredData.length} 条记录`);
    }

    return {
      stockData: filteredData,
      indicators
    };

  } catch (error) {
    console.error('东方财富API请求失败:', error);
    throw new Error(`获取东方财富数据失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
