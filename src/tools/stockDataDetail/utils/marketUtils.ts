export const VALID_MARKETS = ['cn', 'us', 'hk', 'fx', 'futures', 'fund', 'repo', 'convertible_bond', 'options', 'crypto'];

export const MARKET_TITLE_MAP: Record<string, string> = {
  'cn': 'A股',
  'us': '美股',
  'hk': '港股',
  'fx': '外汇',
  'futures': '期货',
  'fund': '基金',
  'repo': '债券逆回购',
  'convertible_bond': '可转债',
  'options': '期权',
  'crypto': '加密货币'
};

export function validateMarketType(marketType: string): void {
  if (!VALID_MARKETS.includes(marketType)) {
    throw new Error(`不支持的市场类型: ${marketType}。支持的类型有: ${VALID_MARKETS.join(', ')}`);
  }
}

export function getMarketTitle(marketType: string): string {
  return MARKET_TITLE_MAP[marketType] || marketType;
}

export function generateDefaultDates() {
  const today = new Date();
  const defaultEndDate = today.toISOString().slice(0, 10).replace(/-/g, '');

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const defaultStartDate = oneMonthAgo.toISOString().slice(0, 10).replace(/-/g, '');

  return { defaultStartDate, defaultEndDate };
}

export function buildTushareParams(marketType: string, code: string, actualStartDate: string, actualEndDate: string, requestedIndicators: string[], originalStartDate?: string, originalEndDate?: string) {
  const params: any = {
    params: {
      ts_code: code,
      start_date: actualStartDate,
      end_date: actualEndDate
    }
  };

  switch(marketType) {
    case 'cn':
      params.api_name = "daily";
      break;
    case 'us':
      params.api_name = "us_daily";
      break;
    case 'hk':
      params.api_name = "hk_daily";
      break;
    case 'fx':
      params.api_name = "fx_daily";
      break;
    case 'futures':
      params.api_name = "fut_daily";
      break;
    case 'fund':
      params.api_name = "fund_daily";
      break;
    case 'repo':
      params.api_name = "repo_daily";
      break;
    case 'convertible_bond':
      params.api_name = "cb_daily";
      break;
    case 'options':
      params.api_name = "opt_daily";
      // 期权接口优先使用trade_date，如果没有指定则使用end_date作为trade_date
      if (requestedIndicators.length > 0) {
        // 如请求技术指标，必须用区间以便获取足够历史
        params.params = {
          ts_code: code,
          start_date: actualStartDate,
          end_date: actualEndDate
        };
      } else if (!originalStartDate && !originalEndDate) {
        // 如果都没指定，使用默认的end_date作为trade_date
        params.params = {
          trade_date: actualEndDate
        };
      } else if (originalEndDate && !originalStartDate) {
        // 只指定了end_date，使用作为trade_date
        params.params = {
          trade_date: actualEndDate
        };
      } else {
        // 如果指定了start_date或日期范围，保持原有逻辑但添加ts_code
        params.params = {
          ts_code: code,
          start_date: actualStartDate,
          end_date: actualEndDate
        };
      }
      // 如果指定了具体的期权代码，添加到params中
      if (code && code.length > 0) {
        params.params.ts_code = code;
      }
      break;
  }

  return params;
}