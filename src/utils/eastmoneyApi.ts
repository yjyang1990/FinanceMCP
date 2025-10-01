/**
 * 东方财富API工具函数
 * 用于替代Tushare分钟K线API
 */

/**
 * 股票代码转换：Tushare格式 → 东方财富格式
 * @param tsCode Tushare格式代码，如 '600519.SH' 或 '000001.SZ'
 * @returns 东方财富格式代码，如 '1.600519' 或 '0.000001'
 */
export function convertToEastmoneyCode(tsCode: string): string {
  const trimmed = String(tsCode || '').trim().toUpperCase();

  // 匹配格式：代码.市场
  const match = trimmed.match(/^(\d{6})\.(SH|SZ)$/);
  if (!match) {
    throw new Error(`无效的股票代码格式：${tsCode}，应为 XXXXXX.SH 或 XXXXXX.SZ`);
  }

  const [, code, market] = match;

  // 市场代码映射：SH→1（上交所），SZ→0（深交所）
  const marketCode = market === 'SH' ? '1' : '0';

  return `${marketCode}.${code}`;
}

/**
 * 时间周期参数转换：Tushare格式 → 东方财富klt参数
 * @param freq Tushare频率字符串，如 '1min', '5MIN', '1m'
 * @returns 东方财富klt数值，如 1, 5, 15, 30, 60
 */
export function convertToEastmoneyKlt(freq: string): number {
  const normalized = String(freq || '').trim().toLowerCase();

  // 映射表
  const freqMap: Record<string, number> = {
    '1min': 1, '1m': 1,
    '5min': 5, '5m': 5,
    '15min': 15, '15m': 15,
    '30min': 30, '30m': 30,
    '60min': 60, '60m': 60, '1h': 60
  };

  const klt = freqMap[normalized];
  if (!klt) {
    throw new Error(`不支持的频率：${freq}，允许值：1min/5min/15min/30min/60min`);
  }

  return klt;
}

/**
 * 时间格式转换：YYYYMMDDHHmmss → YYYYMMDD（仅提取日期部分）
 * @param datetime 时间字符串，支持 'YYYYMMDDHHmmss' 或 'YYYY-MM-DD HH:mm:ss'
 * @returns 日期字符串 'YYYYMMDD'
 */
export function convertToEastmoneyDate(datetime: string): string {
  // 移除所有非数字字符
  const normalized = String(datetime || '').replace(/[^0-9]/g, '');

  // 提取前8位作为日期
  if (normalized.length < 8) {
    throw new Error(`时间格式不正确：${datetime}，需要至少8位日期`);
  }

  return normalized.slice(0, 8);
}

/**
 * 东方财富K线数据接口
 */
export interface EastmoneyKlineParams {
  secid: string;        // 股票代码，如 '1.600519'
  klt: number;          // 时间周期，如 1, 5, 15, 30, 60
  fqt: number;          // 复权类型：0=不复权, 1=前复权, 2=后复权
  beg: string;          // 开始日期 YYYYMMDD
  end: string;          // 结束日期 YYYYMMDD
  lmt?: number;         // 数据条数限制，默认1000
}

export interface EastmoneyKlineData {
  trade_time: string;   // 交易时间
  open: number;         // 开盘价
  close: number;        // 收盘价
  high: number;         // 最高价
  low: number;          // 最低价
  vol: number;          // 成交量
  amount: number;       // 成交额
  amplitude: number;    // 振幅
  change_pct: number;   // 涨跌幅
  change: number;       // 涨跌额
  turnover: number;     // 换手率
}

/**
 * 请求东方财富分钟K线数据
 * @param params 请求参数
 * @returns K线数据数组
 */
export async function fetchEastmoneyKline(params: EastmoneyKlineParams): Promise<EastmoneyKlineData[]> {
  const { secid, klt, fqt, beg, end, lmt = 1000 } = params;

  // 构造请求URL
  const fields1 = 'f1,f2,f3,f4,f5,f6';
  const fields2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${encodeURIComponent(secid)}&fields1=${fields1}&fields2=${fields2}&klt=${klt}&fqt=${fqt}&beg=${beg}&end=${end}&lmt=${lmt}`;

  // 发起请求
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`东方财富API请求失败: HTTP ${resp.status}`);
  }

  const data = await resp.json();

  // 检查响应码
  if (data.rc !== 0) {
    throw new Error(`东方财富API错误: rc=${data.rc}`);
  }

  // 解析K线数据
  const klines: string[] = data.data?.klines || [];
  if (!klines || klines.length === 0) {
    return [];
  }

  return parseEastmoneyKlines(klines);
}

/**
 * 解析东方财富K线CSV字符串数组
 * @param klines CSV字符串数组
 * @returns 解析后的对象数组
 */
export function parseEastmoneyKlines(klines: string[]): EastmoneyKlineData[] {
  return klines.map(kline => {
    // CSV格式：时间,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率
    const parts = kline.split(',');
    if (parts.length < 11) {
      throw new Error(`东方财富K线数据格式异常：${kline}`);
    }

    return {
      trade_time: parts[0],
      open: parseFloat(parts[1]),
      close: parseFloat(parts[2]),
      high: parseFloat(parts[3]),
      low: parseFloat(parts[4]),
      vol: parseFloat(parts[5]),
      amount: parseFloat(parts[6]),
      amplitude: parseFloat(parts[7]),
      change_pct: parseFloat(parts[8]),
      change: parseFloat(parts[9]),
      turnover: parseFloat(parts[10])
    };
  });
}
