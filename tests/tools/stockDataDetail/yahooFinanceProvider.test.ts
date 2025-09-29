/**
 * @jest-environment node
 */

import { fetchYahooFinanceData } from '../../../build/tools/stockDataDetail/marketProviders/yahooFinanceProvider.js';

// Mock yahoo-finance2
const mockYahooFinance = {
  chart: jest.fn()
};

jest.doMock('yahoo-finance2', () => mockYahooFinance);

describe('Yahoo Finance Provider', () => {
  const mockChartData = {
    quotes: [
      {
        date: new Date('2025-09-26'),
        open: 100.0,
        high: 105.0,
        low: 99.0,
        close: 104.0,
        volume: 1000000
      },
      {
        date: new Date('2025-09-27'),
        open: 104.0,
        high: 106.0,
        low: 103.0,
        close: 105.5,
        volume: 1200000
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockYahooFinance.chart.mockResolvedValue(mockChartData);
  });

  describe('fetchYahooFinanceData', () => {
    const baseParams = {
      code: 'AAPL',
      marketType: 'us',
      userStartDate: '20250926',
      userEndDate: '20250927',
      actualStartDate: '20250926',
      actualEndDate: '20250927',
      requestedIndicators: [],
      originalStartDate: '20250926',
      originalEndDate: '20250927'
    };

    test('should fetch US stock data successfully', async () => {
      const result = await fetchYahooFinanceData(baseParams);

      expect(mockYahooFinance.chart).toHaveBeenCalledWith('AAPL', {
        period1: new Date(2025, 8, 26), // 月份从0开始
        period2: new Date(2025, 8, 27),
        interval: '1d'
      });

      expect(result.stockData).toHaveLength(2);
      expect(result.stockData[0]).toMatchObject({
        trade_date: '20250927',
        open: 104.0,
        high: 106.0,
        low: 103.0,
        close: 105.5,
        vol: 1200000
      });
    });

    test('should convert HK stock symbol format', async () => {
      const hkParams = { ...baseParams, code: '00700', marketType: 'hk' };
      await fetchYahooFinanceData(hkParams);

      expect(mockYahooFinance.chart).toHaveBeenCalledWith('00700.HK', expect.any(Object));
    });

    test('should convert CN stock symbol format', async () => {
      const cnParams = { ...baseParams, code: '000001.SZ', marketType: 'cn' };
      await fetchYahooFinanceData(cnParams);

      expect(mockYahooFinance.chart).toHaveBeenCalledWith('000001.SZ', expect.any(Object));
    });

    test('should convert CN stock without suffix', async () => {
      const cnParams = { ...baseParams, code: '600000', marketType: 'cn' };
      await fetchYahooFinanceData(cnParams);

      expect(mockYahooFinance.chart).toHaveBeenCalledWith('600000.SS', expect.any(Object));
    });

    test('should calculate technical indicators', async () => {
      const paramsWithIndicators = {
        ...baseParams,
        requestedIndicators: ['ma(5)', 'rsi(14)']
      };

      const result = await fetchYahooFinanceData(paramsWithIndicators);

      expect(result.indicators).toHaveProperty('ma5');
      expect(result.indicators).toHaveProperty('rsi');
      expect(Array.isArray(result.indicators.ma5)).toBe(true);
      expect(Array.isArray(result.indicators.rsi)).toBe(true);
    });

    test('should reject unsupported market types', async () => {
      const unsupportedParams = { ...baseParams, marketType: 'fx' };

      await expect(fetchYahooFinanceData(unsupportedParams))
        .rejects
        .toThrow('Yahoo Finance 不支持 fx 市场类型');
    });

    test('should handle empty data response', async () => {
      mockYahooFinance.chart.mockResolvedValue({ quotes: [] });

      await expect(fetchYahooFinanceData(baseParams))
        .rejects
        .toThrow('未找到 us 市场股票 AAPL 的行情数据');
    });

    test('should handle Yahoo Finance API errors', async () => {
      mockYahooFinance.chart.mockRejectedValue(new Error('API Error'));

      await expect(fetchYahooFinanceData(baseParams))
        .rejects
        .toThrow('无法从 Yahoo Finance 获取 AAPL 的数据');
    });

    test('should validate MACD indicator parameters', async () => {
      const invalidParams = {
        ...baseParams,
        requestedIndicators: ['macd(12,26)'] // 缺少第三个参数
      };

      await expect(fetchYahooFinanceData(invalidParams))
        .rejects
        .toThrow('MACD指标需要3个参数');
    });

    test('should sort data by date descending', async () => {
      const result = await fetchYahooFinanceData(baseParams);

      // 数据应该按日期降序排列（最新日期在前）
      expect(result.stockData[0].trade_date).toBe('20250927');
      expect(result.stockData[1].trade_date).toBe('20250926');
    });
  });

  describe('Symbol conversion utilities', () => {
    const baseTestParams = {
      code: 'TEST',
      marketType: 'cn',
      userStartDate: '20250926',
      userEndDate: '20250927',
      actualStartDate: '20250926',
      actualEndDate: '20250927',
      requestedIndicators: [],
      originalStartDate: '20250926',
      originalEndDate: '20250927'
    };

    test('should handle various CN stock formats', async () => {
      // 测试不同的A股代码格式
      const testCases = [
        { input: '000001.SZ', expected: '000001.SZ' },
        { input: '600000.SH', expected: '600000.SS' },
        { input: '600000', expected: '600000.SS' },
        { input: '000001', expected: '000001.SZ' },
        { input: '300001', expected: '300001.SZ' }
      ];

      for (const testCase of testCases) {
        const params = { ...baseTestParams, code: testCase.input, marketType: 'cn' };
        await fetchYahooFinanceData(params);
        expect(mockYahooFinance.chart).toHaveBeenCalledWith(testCase.expected, expect.any(Object));
        jest.clearAllMocks();
      }
    });
  });

  describe('Date handling', () => {
    const baseDateParams = {
      code: 'AAPL',
      marketType: 'us',
      userStartDate: '20251225',
      userEndDate: '20251231',
      actualStartDate: '20251225',
      actualEndDate: '20251231',
      requestedIndicators: [],
      originalStartDate: '20251225',
      originalEndDate: '20251231'
    };

    test('should parse and format dates correctly', async () => {
      await fetchYahooFinanceData(baseDateParams);

      expect(mockYahooFinance.chart).toHaveBeenCalledWith('AAPL', {
        period1: new Date(2025, 11, 25), // 月份从0开始，所以12月是11
        period2: new Date(2025, 11, 31),
        interval: '1d'
      });
    });
  });
});