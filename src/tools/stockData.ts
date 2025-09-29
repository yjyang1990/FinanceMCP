import { resolveStockCodes } from '../utils/stockCodeResolver.js';
import {
  calculateRequiredDays,
  calculateExtendedStartDate
} from './stockDataDetail/index.js';

// 导入拆分后的模块
import { fetchCryptoData } from './stockDataDetail/marketProviders/cryptoProvider.js';
import { fetchTushareData } from './stockDataDetail/marketProviders/tushareProvider.js';
import { fetchYahooFinanceData } from './stockDataDetail/marketProviders/yahooFinanceProvider.js';
import {
  formatFxData,
  formatFuturesData,
  formatRepoData,
  formatConvertibleBondData,
  formatOptionsData,
  formatStockData,
  formatCryptoData
} from './stockDataDetail/formatters/marketFormatters.js';
import { formatIndicatorExplanation } from './stockDataDetail/formatters/indicatorFormatters.js';
import {
  validateMarketType,
  getMarketTitle,
  generateDefaultDates
} from './stockDataDetail/utils/marketUtils.js';

export const stockData = {
  name: "stock_data",
  description: "获取指定股票/加密资产的历史行情数据，支持A股、美股、港股、外汇、期货、基金、债券逆回购、可转债、期权、加密货币(通过CoinGecko)",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "股票/合约/加密资产代码。股票示例：'000001.SZ'(A股平安银行)、'AAPL'(美股)、'00700.HK'(港股)、'USDCNH.FXCM'(外汇)、'CU2501.SHF'(期货)、'159919.SZ'(基金)、'204001.SH'(逆回购)、'113008.SH'(可转债)、'10001313.SH'(期权)。加密示例(需 market_type=crypto，Binance)：推荐标准写法 'BTCUSDT'、'ETHUSDT'、'USDCUSDT'、'FDUSDUSDT' 等；也兼容 'BTC-USDT' 或 'BTC/USDT'。常见报价币：USDT、USDC、FDUSD、TUSD、BUSD、BTC、ETH。注意：若写 'USD' 会自动映射为 'USDT'（如 'BTC-USD' → 'BTCUSDT'）。"
      },
      market_type: {
        type: "string",
        description: "市场类型（必需），可选值：cn(A股),us(美股),hk(港股),fx(外汇),futures(期货),fund(基金),repo(债券逆回购),convertible_bond(可转债),options(期权),crypto(加密货币/CoinGecko)"
      },
      start_date: {
        type: "string",
        description: "起始日期，格式为YYYYMMDD，如'20230101'"
      },
      end_date: {
        type: "string",
        description: "结束日期，格式为YYYYMMDD，如'20230131'"
      },
      indicators: {
        type: "string",
        description: "需要计算的技术指标，多个指标用空格分隔。支持的指标：macd(MACD指标)、rsi(相对强弱指标)、kdj(随机指标)、boll(布林带)、ma(均线指标)。必须明确指定参数，例如：'macd(12,26,9) rsi(14) kdj(9,3,3) boll(20,2) ma(10)'"
      }
    },
    required: ["code", "market_type"]
  },
  async run(args: { code: string; market_type: string; start_date?: string; end_date?: string; indicators?: string }) {
    try {
      // 添加调试日志
      console.log('接收到的参数:', args);

      // 检查market_type参数
      if (!args.market_type) {
        throw new Error('请指定market_type参数：cn(A股)、us(美股)、hk(港股)、fx(外汇)、futures(期货)、fund(基金)、repo(债券逆回购)、convertible_bond(可转债)、options(期权)');
      }

      const marketType = args.market_type.trim().toLowerCase();
      console.log(`使用的市场类型: ${marketType}`);
      console.log(`使用Tushare API获取${marketType}市场股票${args.code}的行情数据`);

      // 解析技术指标参数
      const requestedIndicators = args.indicators ? args.indicators.trim().split(/\s+/) : [];
      console.log('请求的技术指标:', requestedIndicators);

      // 默认参数设置
      const { defaultStartDate, defaultEndDate } = generateDefaultDates();

      // 用户请求的时间范围
      const userStartDate = args.start_date || defaultStartDate;
      const userEndDate = args.end_date || defaultEndDate;

      // 如果有技术指标请求，计算需要的历史数据并扩展获取范围
      let actualStartDate = userStartDate;
      let actualEndDate = userEndDate;

      if (requestedIndicators.length > 0) {
        const requiredDays = calculateRequiredDays(requestedIndicators);
        actualStartDate = calculateExtendedStartDate(userStartDate, requiredDays);
        console.log(`技术指标需要${requiredDays}天历史数据，扩展开始日期从 ${userStartDate} 到 ${actualStartDate}`);
      }

      // 验证市场类型
      validateMarketType(marketType);

      // 加密货币市场（Binance）分支：
      if (marketType === 'crypto') {
        const { stockData, indicators } = await fetchCryptoData({
          code: args.code,
          userStartDate,
          userEndDate,
          actualStartDate,
          requestedIndicators
        });

        const formattedData = formatCryptoData({ stockData, indicators, marketType });
        const indicatorData = formatIndicatorExplanation({ indicators, requestedIndicators });

        return {
          content: [
            {
              type: "text",
              text: `# ${args.code} ${getMarketTitle(marketType)}行情数据\n\n${formattedData}${indicatorData}`
            }
          ]
        };
      }

      // 选择数据提供者：Yahoo Finance 优先，不支持的市场使用 Tushare
      let stockData: Record<string, any>[];
      let indicators: Record<string, any>;

      if (['cn', 'us', 'hk'].includes(marketType)) {
        // 使用 Yahoo Finance 数据提供者
        try {
          const yahooResult = await fetchYahooFinanceData({
            code: args.code,
            marketType,
            userStartDate,
            userEndDate,
            actualStartDate,
            actualEndDate,
            requestedIndicators,
            originalStartDate: args.start_date,
            originalEndDate: args.end_date
          });
          stockData = yahooResult.stockData;
          indicators = yahooResult.indicators;
          console.log(`成功使用 Yahoo Finance 获取 ${marketType} 市场数据`);
        } catch (yahooError) {
          console.warn(`Yahoo Finance 获取失败，尝试使用 Tushare:`, yahooError);
          // 降级到 Tushare
          const tushareResult = await fetchTushareData({
            code: args.code,
            marketType,
            userStartDate,
            userEndDate,
            actualStartDate,
            actualEndDate,
            requestedIndicators,
            originalStartDate: args.start_date,
            originalEndDate: args.end_date
          });
          stockData = tushareResult.stockData;
          indicators = tushareResult.indicators;
        }
      } else {
        // 其他市场类型仅支持 Tushare
        throw new Error(`${getMarketTitle(marketType)}数据需要配置 Tushare API。支持的免费数据源：cn(A股)、us(美股)、hk(港股)、crypto(加密货币)`);
      }

      // 格式化表格数据
      let formattedData = '';
      const titleSuffix = marketType === 'cn' ? '（前复权）' : '';

      // 根据市场类型选择相应的格式化函数
      switch (marketType) {
        case 'fx':
          formattedData = formatFxData({ stockData, indicators, marketType });
          break;
        case 'futures':
          formattedData = formatFuturesData({ stockData, indicators, marketType });
          break;
        case 'repo':
          formattedData = formatRepoData({ stockData, indicators, marketType });
          break;
        case 'convertible_bond':
          formattedData = formatConvertibleBondData({ stockData, indicators, marketType });
          break;
        case 'options':
          formattedData = formatOptionsData({ stockData, indicators, marketType });
          break;
        default:
          formattedData = formatStockData({ stockData, indicators, marketType });
          break;
      }

      // 生成技术指标说明
      const indicatorData = formatIndicatorExplanation({ indicators, requestedIndicators });

      // 收集股票代码并生成说明（仅对股票市场）
      let stockExplanation = '';
      if (['cn', 'us', 'hk'].includes(marketType)) {
        stockExplanation = await resolveStockCodes([args.code]);
      }

      return {
        content: [
          {
            type: "text",
            text: `# ${args.code} ${getMarketTitle(marketType)}行情数据${titleSuffix}\n\n${formattedData}${indicatorData}${stockExplanation}`
          }
        ]
      };
    } catch (error) {
      console.error("获取股票数据失败:", error);

      return {
        content: [
          {
            type: "text",
            text: `# 获取股票${args.code}数据失败\n\n无法获取数据：${error instanceof Error ? error.message : String(error)}\n\n请检查股票代码和市场类型是否正确：\n- A股格式："000001.SZ"\n- 美股格式："AAPL"\n- 港股格式："00700.HK"\n- 外汇格式："USDCNH.FXCM"（美元人民币）\n- 期货格式："CU2501.SHF"\n- 基金格式："159919.SZ"\n- 债券逆回购格式："204001.SH"\n- 可转债格式："113008.SH"\n- 期权格式："10001313.SH"\n\n技术指标使用说明（必须明确指定参数）：\n- **MACD**: macd(快线,慢线,信号线) - 例：macd(12,26,9)\n- **RSI**: rsi(周期) - 例：rsi(14)\n- **KDJ**: kdj(K周期,K平滑,D平滑) - 例：kdj(9,3,3)\n- **布林带**: boll(周期,标准差倍数) - 例：boll(20,2)\n- **移动平均线**: ma(周期) - 例：ma(5)、ma(10)、ma(20)\n\n使用示例：\n- "macd(12,26,9) rsi(14)"\n- "kdj(9,3,3) boll(20,2) ma(30)"\n- "macd(5,10,5) ma(5) ma(10)"`
          }
        ]
      };
    }
  }
};