import {
  formatStockData,
  formatCryptoData,
  formatFxData,
  formatFuturesData,
  formatRepoData,
  formatConvertibleBondData,
  formatOptionsData,
  formatAmountWan
} from '../../../build/tools/stockDataDetail/formatters/marketFormatters.js';

describe('Market Formatters', () => {
  const mockStockData = [
    {
      trade_date: '20250927',
      open: 104.5,
      close: 105.2,
      high: 106.0,
      low: 103.8,
      vol: 1000000,
      amount: 1050000000
    },
    {
      trade_date: '20250926',
      open: 103.2,
      close: 104.0,
      high: 104.8,
      low: 102.5,
      vol: 900000,
      amount: 936000000
    }
  ];

  const mockIndicators = {
    ma5: [104.8, 103.6],
    rsi: [65.5, 62.3],
    macd: {
      dif: [0.5, 0.3],
      dea: [0.4, 0.2],
      macd: [0.2, 0.2]
    }
  };

  describe('formatAmountWan', () => {
    test('should convert amount to wan correctly', () => {
      expect(formatAmountWan(1000000000)).toBe('100000000.00');
      expect(formatAmountWan('1000000000')).toBe('100000000.00');
      expect(formatAmountWan(null)).toBe('N/A');
      expect(formatAmountWan('')).toBe('N/A');
      expect(formatAmountWan('invalid')).toBe('N/A');
    });
  });

  describe('formatStockData', () => {
    test('should format stock data without indicators', () => {
      const result = formatStockData({
        stockData: mockStockData,
        indicators: {},
        marketType: 'us'
      });

      expect(result).toContain('| 交易日期 | 开盘 | 收盘 | 最高 | 最低 | 成交量 | 成交额(万元) |');
      expect(result).toContain('| 20250927 | 104.5 | 105.2 | 106 | 103.8 | 1000000 | 105000000.00 |');
      expect(result).toContain('| 20250926 | 103.2 | 104 | 104.8 | 102.5 | 900000 | 93600000.00 |');
    });

    test('should format stock data with indicators', () => {
      const result = formatStockData({
        stockData: mockStockData,
        indicators: mockIndicators,
        marketType: 'us'
      });

      expect(result).toContain('MACD_DIF');
      expect(result).toContain('MACD_DEA');
      expect(result).toContain('MACD');
      expect(result).toContain('RSI');
      expect(result).toContain('MA5');
      expect(result).toContain('| 0.5000 | 0.4000 | 0.2000 | 65.50 | 104.80 |');
    });

    test('should handle empty data', () => {
      const result = formatStockData({
        stockData: [],
        indicators: {},
        marketType: 'us'
      });

      expect(result).toBe('');
    });
  });

  describe('formatCryptoData', () => {
    const cryptoData = [
      {
        trade_date: '20250927',
        open: 50000.5,
        close: 51000.2,
        high: 51500.0,
        low: 49800.0,
        vol: 1000
      }
    ];

    test('should format crypto data correctly', () => {
      const result = formatCryptoData({
        stockData: cryptoData,
        indicators: {},
        marketType: 'crypto'
      });

      expect(result).toContain('| 交易日期 | 开盘 | 收盘 | 最高 | 最低 | 成交量 |');
      expect(result).toContain('| 20250927 | 50000.5 | 51000.2 | 51500 | 49800 | 1000 |');
    });

    test('should handle missing fields', () => {
      const dataWithMissing = [
        {
          trade_date: '20250927',
          open: 50000.5,
          close: null,
          high: 51500.0
        }
      ];

      const result = formatCryptoData({
        stockData: dataWithMissing,
        indicators: {},
        marketType: 'crypto'
      });

      expect(result).toContain('N/A');
    });
  });

  describe('formatFxData', () => {
    const fxData = [
      {
        trade_date: '20250927',
        bid_open: 7.1000,
        bid_high: 7.1500,
        bid_low: 7.0800,
        bid_close: 7.1200,
        ask_open: 7.1020,
        ask_high: 7.1520,
        ask_low: 7.0820,
        ask_close: 7.1220,
        tick_qty: 1000
      }
    ];

    test('should format forex data correctly', () => {
      const result = formatFxData({
        stockData: fxData,
        indicators: {},
        marketType: 'fx'
      });

      expect(result).toContain('买入开盘');
      expect(result).toContain('卖出收盘');
      expect(result).toContain('报价笔数');
      expect(result).toContain('| 20250927 | 7.1 | 7.15 | 7.08 | 7.12 | 7.102 | 7.152 | 7.082 | 7.122 | 1000 |');
    });
  });

  describe('formatFuturesData', () => {
    const futuresData = [
      {
        trade_date: '20250927',
        open: 60000,
        high: 61000,
        low: 59500,
        close: 60800,
        settle: 60750,
        change1: 800,
        change2: 750,
        vol: 50000,
        oi: 100000
      }
    ];

    test('should format futures data correctly', () => {
      const result = formatFuturesData({
        stockData: futuresData,
        indicators: {},
        marketType: 'futures'
      });

      expect(result).toContain('结算');
      expect(result).toContain('涨跌1');
      expect(result).toContain('涨跌2');
      expect(result).toContain('持仓量');
      expect(result).toContain('| 20250927 | 60000 | 61000 | 59500 | 60800 | 60750 | 800 | 750 | 50000 | 100000 |');
    });
  });

  describe('formatRepoData', () => {
    const repoData = [
      {
        trade_date: '20250927',
        name: '1天回购',
        rate: 2.5,
        amount: 1000000000
      }
    ];

    test('should format repo data correctly', () => {
      const result = formatRepoData({
        stockData: repoData,
        indicators: {},
        marketType: 'repo'
      });

      expect(result).toContain('品种名称');
      expect(result).toContain('利率(%)');
      expect(result).toContain('成交金额(万元)');
      expect(result).toContain('| 20250927 | 1天回购 | 2.5 | 100000000.00 |');
    });
  });

  describe('formatConvertibleBondData', () => {
    const cbData = [
      {
        trade_date: '20250927',
        open: 110.5,
        high: 112.0,
        low: 109.8,
        close: 111.2,
        change: 0.7,
        pct_chg: 0.63,
        vol: 10000,
        amount: 11120000,
        bond_value: 100.5,
        bond_over_rate: 10.67,
        cb_value: 115.2,
        cb_over_rate: -3.47
      }
    ];

    test('should format convertible bond data correctly', () => {
      const result = formatConvertibleBondData({
        stockData: cbData,
        indicators: {},
        marketType: 'convertible_bond'
      });

      expect(result).toContain('纯债价值');
      expect(result).toContain('纯债溢价率(%)');
      expect(result).toContain('转股价值');
      expect(result).toContain('转股溢价率(%)');
      expect(result).toContain('| 20250927 | 110.5 | 112 | 109.8 | 111.2 | 0.7 | 0.63 | 10000 | 1112000.00 | 100.5 | 10.67 | 115.2 | -3.47 |');
    });
  });

  describe('formatOptionsData', () => {
    const optionsData = [
      {
        trade_date: '20250927',
        exchange: 'SSE',
        pre_settle: 5.5,
        pre_close: 5.6,
        open: 5.4,
        high: 5.8,
        low: 5.2,
        close: 5.7,
        settle: 5.65,
        vol: 1000,
        amount: 5700000,
        oi: 5000
      }
    ];

    test('should format options data correctly', () => {
      const result = formatOptionsData({
        stockData: optionsData,
        indicators: {},
        marketType: 'options'
      });

      expect(result).toContain('交易所');
      expect(result).toContain('昨结算');
      expect(result).toContain('前收盘');
      expect(result).toContain('持仓量(手)');
      expect(result).toContain('| 20250927 | SSE | 5.5 | 5.6 | 5.4 | 5.8 | 5.2 | 5.7 | 5.65 | 1000 | 570000.00 | 5000 |');
    });
  });

  describe('Indicator formatting', () => {
    test('should format all supported indicators', () => {
      const fullIndicators = {
        macd: {
          dif: [0.5, 0.3],
          dea: [0.4, 0.2],
          macd: [0.2, 0.2]
        },
        rsi: [65.5, 62.3],
        kdj: {
          k: [80.5, 75.2],
          d: [78.3, 73.1],
          j: [84.9, 79.4]
        },
        boll: {
          upper: [108.5, 107.2],
          middle: [105.0, 104.1],
          lower: [101.5, 101.0]
        },
        ma5: [104.8, 103.6],
        ma10: [103.2, 102.8],
        ma20: [102.1, 101.9]
      };

      const result = formatStockData({
        stockData: mockStockData,
        indicators: fullIndicators,
        marketType: 'us'
      });

      expect(result).toContain('MACD_DIF');
      expect(result).toContain('MACD_DEA');
      expect(result).toContain('MACD');
      expect(result).toContain('RSI');
      expect(result).toContain('KDJ_K');
      expect(result).toContain('KDJ_D');
      expect(result).toContain('KDJ_J');
      expect(result).toContain('BOLL_UP');
      expect(result).toContain('BOLL_MID');
      expect(result).toContain('BOLL_LOW');
      expect(result).toContain('MA5');
      expect(result).toContain('MA10');
      expect(result).toContain('MA20');
    });

    test('should handle NaN values in indicators', () => {
      const indicatorsWithNaN = {
        ma5: [NaN, 103.6],
        rsi: [65.5, NaN]
      };

      const result = formatStockData({
        stockData: mockStockData,
        indicators: indicatorsWithNaN,
        marketType: 'us'
      });

      expect(result).toContain('N/A');
    });
  });
});