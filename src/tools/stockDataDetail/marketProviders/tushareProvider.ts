import { TUSHARE_CONFIG } from '../../../config.js';
import {
  calculateMACD,
  calculateKDJ,
  calculateRSI,
  calculateBOLL,
  calculateSMA,
  parseIndicatorParams,
  filterDataToUserRange
} from '../index.js';
import { buildTushareParams } from '../utils/marketUtils.js';

export interface TushareDataParams {
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

export interface TushareDataResult {
  stockData: Record<string, any>[];
  indicators: Record<string, any>;
}

export async function fetchTushareData(params: TushareDataParams): Promise<TushareDataResult> {
  const { code, marketType, userStartDate, userEndDate, actualStartDate, actualEndDate, requestedIndicators, originalStartDate, originalEndDate } = params;

  const TUSHARE_API_KEY = TUSHARE_CONFIG.API_TOKEN;
  const TUSHARE_API_URL = TUSHARE_CONFIG.API_URL;

  // 构建请求参数
  const apiParams = {
    token: TUSHARE_API_KEY,
    ...buildTushareParams(marketType, code, actualStartDate, actualEndDate, requestedIndicators, originalStartDate, originalEndDate)
  };

  console.log(`选择的API接口: ${apiParams.api_name}`);
  console.log(`字段设置: 返回所有可用字段`);

  // 设置请求超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TUSHARE_CONFIG.TIMEOUT);

  try {
    console.log(`请求Tushare API: ${apiParams.api_name}，参数:`, apiParams.params);

    // 发送请求
    const response = await fetch(TUSHARE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(apiParams),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Tushare API请求失败: ${response.status}`);
    }

    const data = await response.json();

    // 处理响应数据
    if (data.code !== 0) {
      throw new Error(`Tushare API错误: ${data.msg}`);
    }

    // 确保data.data和data.data.items存在
    if (!data.data || !data.data.items || data.data.items.length === 0) {
      throw new Error(`未找到${marketType}市场股票${code}的行情数据`);
    }

    // 获取字段名
    const fields = data.data.fields;

    // 将数据转换为对象数组
    let stockData = data.data.items.map((item: any) => {
      const result: Record<string, any> = {};
      fields.forEach((field: string, index: number) => {
        result[field] = item[index];
      });
      return result;
    });

    console.log(`成功获取到${stockData.length}条${code}股票数据记录（扩展数据范围）`);

    // 对A股强制应用前复权（qfq）：使用最新交易日因子进行归一
    if (marketType === 'cn' && stockData.length > 0) {
      try {
        const afParams = {
          api_name: 'adj_factor',
          token: TUSHARE_API_KEY,
          params: {
            ts_code: code,
            start_date: actualStartDate,
            end_date: actualEndDate
          },
          fields: 'trade_date,adj_factor'
        } as any;

        const afResp = await fetch(TUSHARE_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(afParams),
          signal: controller.signal
        });
        if (!afResp.ok) throw new Error(`adj_factor 请求失败: ${afResp.status}`);
        const afJson = await afResp.json();
        if (afJson.code !== 0) throw new Error(`adj_factor 返回错误: ${afJson.msg}`);
        const afFields: string[] = afJson.data?.fields ?? [];
        const afItems: any[] = afJson.data?.items ?? [];
        const idxDate = afFields.indexOf('trade_date');
        const idxFactor = afFields.indexOf('adj_factor');
        const factorMap = new Map<string, number>();
        for (const row of afItems) {
          const d = String(row[idxDate]);
          const f = Number(row[idxFactor]);
          if (!isNaN(f)) factorMap.set(d, f);
        }

        // 找到stockData中最新交易日的因子
        const latestDate = stockData
          .map((r: any) => String(r.trade_date))
          .sort((a: string, b: string) => b.localeCompare(a))[0];
        const latestFactor = factorMap.get(latestDate);

        if (latestFactor && !isNaN(latestFactor)) {
          stockData = stockData.map((row: any) => {
            const f = factorMap.get(String(row.trade_date));
            if (f && !isNaN(f)) {
              const ratio = f / latestFactor; // 前复权：price * f / f_latest
              const adj = (v: any) => (v == null || v === '' || isNaN(Number(v))) ? v : Number(v) * ratio;
              return {
                ...row,
                open: adj(row.open),
                high: adj(row.high),
                low: adj(row.low),
                close: adj(row.close)
              };
            }
            return row;
          });
          console.log(`已应用前复权(基于最新交易日因子)到 ${code} 的OHLC价格`);
        } else {
          console.warn('未找到最新交易日复权因子，跳过前复权');
        }
      } catch (e) {
        console.warn('应用前复权失败，继续返回未复权数据:', e);
      }
    }

    // 计算技术指标
    let indicators: Record<string, any> = {};

    if (requestedIndicators.length > 0 && ['cn', 'us', 'hk', 'fund', 'futures', 'convertible_bond', 'options', 'fx', 'crypto'].includes(marketType)) {
      // 对具有可用于OHLC的市场计算技术指标
      // 构建按时间正序的价格序列
      const mid = (a: any, b: any): number => {
        const x = parseFloat(a);
        const y = parseFloat(b);
        if (!isNaN(x) && !isNaN(y)) return (x + y) / 2;
        if (!isNaN(x)) return x;
        if (!isNaN(y)) return y;
        return NaN;
      };

      let closes: number[] = [];
      let highs: number[] = [];
      let lows: number[] = [];

      if (marketType === 'fx') {
        closes = stockData.map((d: Record<string, any>) => mid(d.bid_close, d.ask_close)).reverse();
        highs = stockData.map((d: Record<string, any>) => mid(d.bid_high, d.ask_high)).reverse();
        lows = stockData.map((d: Record<string, any>) => mid(d.bid_low, d.ask_low)).reverse();
      } else {
        closes = stockData.map((d: Record<string, any>) => parseFloat(d.close)).reverse();
        highs = stockData.map((d: Record<string, any>) => parseFloat(d.high)).reverse();
        lows = stockData.map((d: Record<string, any>) => parseFloat(d.low)).reverse();
      }

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
  } finally {
    clearTimeout(timeoutId);
  }
}