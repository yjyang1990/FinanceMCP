import {
  calculateMACD,
  calculateKDJ,
  calculateRSI,
  calculateBOLL,
  calculateSMA,
  parseIndicatorParams,
  formatIndicatorParams,
  expandIndicators,
  filterDataToUserRange
} from '../index.js';

export interface CryptoDataParams {
  code: string;
  userStartDate: string;
  userEndDate: string;
  actualStartDate: string;
  requestedIndicators: string[];
}

export interface CryptoDataResult {
  stockData: Record<string, any>[];
  indicators: Record<string, any>;
}

export async function fetchCryptoData(params: CryptoDataParams): Promise<CryptoDataResult> {
  const { code, userStartDate, userEndDate, actualStartDate, requestedIndicators } = params;

  console.log(`使用 Binance 获取加密资产 ${code} 的逐日K线 (OHLCV)`);

  // 日期与符号解析
  const toYMD = (d: Date): string => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };
  const ymdToStartMs = (s: string): number => Date.UTC(parseInt(s.slice(0,4)), parseInt(s.slice(4,6)) - 1, parseInt(s.slice(6,8)), 0, 0, 0, 0);
  const ymdToEndMs = (s: string): number => Date.UTC(parseInt(s.slice(0,4)), parseInt(s.slice(4,6)) - 1, parseInt(s.slice(6,8)), 23, 59, 59, 999);

  const idToTicker: Record<string, string> = {
    'bitcoin': 'BTC', 'ethereum': 'ETH', 'tether': 'USDT', 'usd-coin': 'USDC', 'solana': 'SOL',
    'binancecoin': 'BNB', 'ripple': 'XRP', 'cardano': 'ADA', 'polkadot': 'DOT', 'chainlink': 'LINK',
    'litecoin': 'LTC', 'shiba-inu': 'SHIB', 'tron': 'TRX', 'toncoin': 'TON', 'bitcoin-cash': 'BCH',
    'ethereum-classic': 'ETC'
  };

  const parseBinanceSymbol = (raw: string): string => {
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();
    const validQuotes = new Set(['USDT','USDC','FDUSD','TUSD','BUSD','BTC','ETH']);
    // 已经是诸如 BTCUSDT
    if (!upper.includes('-') && !upper.includes('/') && !upper.includes('.')) {
      return upper;
    }
    // 支持 TICKER-QUOTE / TICKER/QUOTE / id.vs
    let base = '';
    let quote = '';
    if (upper.includes('-') || upper.includes('/')) {
      const sep = upper.includes('-') ? '-' : '/';
      const [b, q] = upper.split(sep);
      base = b;
      quote = q;
    } else if (upper.includes('.')) {
      const [id, vs] = upper.split('.');
      base = idToTicker[id.toLowerCase()] || id; // id -> ticker
      quote = vs;
    }
    if (quote === 'USD') quote = 'USDT';
    if (!validQuotes.has(quote)) {
      throw new Error(`不支持的报价资产: ${quote}。支持: ${Array.from(validQuotes).join(', ')}`);
    }
    return `${base}${quote}`;
  };

  const symbol = parseBinanceSymbol(code);
  const startYmd = requestedIndicators.length > 0 ? actualStartDate : userStartDate;
  let startMs = ymdToStartMs(startYmd);
  const endMs = ymdToEndMs(userEndDate);
  const allKlines: any[] = [];
  let pageIndex = 0;
  const maxPages = 100; // 安全上限，防止极端情况下的无限循环

  while (startMs < endMs && pageIndex < maxPages) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1d&startTime=${startMs}&endTime=${endMs}&limit=1000`;
    console.log(`Binance Klines URL[${pageIndex + 1}]:`, url);

    const resp = await fetch(url);
    if (!resp.ok) {
      try {
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson: any = await resp.json();
          const errMsg = errJson?.msg || `HTTP ${resp.status}`;
          if (Number(errJson?.code) === -1121 || /invalid symbol/i.test(String(errMsg))) {
            throw new Error(`Binance 无效交易对: ${symbol}。该币对在 Binance 不存在或已下线，请更换有效币对（例如：BTCUSDT、ETHUSDT、SOLUSDT）。也支持 BTC-USDT、BTC/USDT、或 coinid.USDT 写法。`);
          }
          throw new Error(`Binance K线请求失败: ${resp.status} - ${errMsg}`);
        } else {
          const text = await resp.text();
          throw new Error(`Binance K线请求失败: ${resp.status}${text ? ` - ${text}` : ''}`);
        }
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(`Binance K线请求失败: ${resp.status}`);
      }
    }
    const klines: any[] = await resp.json();
    if (!Array.isArray(klines)) throw new Error('Binance 返回的 K 线数据格式异常');
    if (klines.length === 0) break;
    allKlines.push(...klines);
    const lastOpenTime = Number(klines[klines.length - 1][0]);
    if (!(lastOpenTime > startMs)) break; // 保护，避免相同时间导致死循环
    startMs = lastOpenTime + 1; // 下一页从最后一根K线的下一毫秒开始
    pageIndex += 1;
    if (klines.length < 1000) break; // 已取完
  }

  let stockData = allKlines.map(row => {
    const openTime = Number(row[0]);
    const d = toYMD(new Date(openTime));
    return {
      trade_date: d,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      vol: Number(row[5])
    } as Record<string, any>;
  });

  // 若未请求技术指标，才在此处严格按用户区间过滤；
  // 若请求了技术指标，需保留扩展区间用于计算，稍后再截回用户区间
  if (requestedIndicators.length === 0) {
    stockData = stockData.filter(r => r.trade_date >= userStartDate && r.trade_date <= userEndDate);
  }
  stockData.sort((a, b) => b.trade_date.localeCompare(a.trade_date));
  console.log(`Binance 分页返回 共${allKlines.length} 根K线，过滤后 ${stockData.length} 条记录`);

  // 计算技术指标
  let indicators: Record<string, any> = {};
  if (requestedIndicators.length > 0) {
    // 扩展多参数MA为多个单参数MA
    const expandedIndicators = expandIndicators(requestedIndicators);

    let closes: number[] = stockData.map(d => parseFloat(d.close)).reverse();
    let highs: number[] = stockData.map(d => parseFloat(d.high)).reverse();
    let lows: number[] = stockData.map(d => parseFloat(d.low)).reverse();

    for (const indicator of expandedIndicators) {
      try {
        const { name, params } = parseIndicatorParams(indicator);
        switch (name) {
          case 'macd':
            if (params.length !== 3) throw new Error('MACD指标需要3个参数，格式：macd(快线,慢线,信号线)');
            indicators.macd = calculateMACD(closes, params[0], params[1], params[2]);
            break;
          case 'rsi':
            if (params.length !== 1) throw new Error('RSI指标需要1个参数，格式：rsi(周期)');
            indicators.rsi = calculateRSI(closes, params[0]);
            break;
          case 'kdj':
            if (params.length !== 3) throw new Error('KDJ指标需要3个参数，格式：kdj(9,3,3)');
            indicators.kdj = calculateKDJ(highs, lows, closes, params[0], params[1], params[2]);
            break;
          case 'boll':
            if (params.length !== 2) throw new Error('布林带指标需要2个参数，格式：boll(周期,标准差倍数)');
            indicators.boll = calculateBOLL(closes, params[0], params[1]);
            break;
          case 'ma':
            if (params.length !== 1) throw new Error('移动平均线需要1个参数，格式：ma(周期)');
            indicators[`ma${params[0]}`] = calculateSMA(closes, params[0]);
            break;
          default:
            throw new Error(`不支持的技术指标: ${name}`);
        }
      } catch (e) {
        console.error(`解析技术指标 ${indicator} 时出错:`, e);
        throw new Error(`技术指标参数错误: ${indicator}`);
      }
    }
    // 指标逆序以匹配最新在前
    Object.keys(indicators).forEach(key => {
      if (typeof indicators[key] === 'object' && indicators[key] !== null) {
        if (Array.isArray(indicators[key])) {
          indicators[key] = indicators[key].reverse();
        } else {
          Object.keys(indicators[key]).forEach(subKey => {
            if (Array.isArray(indicators[key][subKey])) {
              indicators[key][subKey] = indicators[key][subKey].reverse();
            }
          });
        }
      }
    });
    // 过滤到用户指定区间
    stockData = filterDataToUserRange(stockData, userStartDate, userEndDate);
    console.log(`过滤到用户请求时间范围，剩余${stockData.length}条记录`);
  }

  return { stockData, indicators };
}