const EM_API_BASE_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
const API_TIMEOUT = 30000;

export const marginTrade = {
  name: "margin_trade",
  description: "获取融资融券相关数据，支持多种数据类型：标的股票、交易汇总、交易明细、转融券汇总等",
  parameters: {
    type: "object",
    properties: {
      data_type: {
        type: "string",
        description: "数据类型，可选值：margin_secs(融资融券标的股票)、margin(融资融券交易汇总)、margin_detail(融资融券交易明细)、slb_len_mm(做市借券交易汇总)"
      },
      ts_code: {
        type: "string",
        description: "股票代码，如'000001.SZ'、'600000.SH'等（部分接口可选）"
      },
      start_date: {
        type: "string",
        description: "起始日期，格式YYYYMMDD，如'20250101'"
      },
      end_date: {
        type: "string",
        description: "结束日期，格式YYYYMMDD，如'20240131'（可选，默认为当前日期）"
      },
      exchange: {
        type: "string",
        description: "交易所代码，可选值：SSE(上海证券交易所)、SZSE(深圳证券交易所)、BSE(北京证券交易所)，仅margin_secs接口使用"
      }
    },
    required: ["data_type", "start_date"]
  },
  async run(args: {
    data_type: string;
    ts_code?: string;
    start_date: string;
    end_date?: string;
    exchange?: string;
  }) {
    try {
      console.log('融资融券数据查询参数:', args);

      let data;
      let formattedOutput;

      switch (args.data_type) {
        case 'margin_secs':
          // 融资融券标的
          data = await fetchMarginSecs(args);
          formattedOutput = formatMarginSecs(data, args);
          break;

        case 'margin':
          // 融资融券交易汇总（个股明细）
          if (!args.ts_code) {
            throw new Error('融资融券交易汇总查询需要提供股票代码(ts_code)');
          }
          data = await fetchMarginSummary(args);
          formattedOutput = formatMarginSummary(data, args);
          break;

        case 'margin_detail':
          // 融资融券交易明细
          if (!args.ts_code) {
            throw new Error('融资融券交易明细查询需要提供股票代码(ts_code)');
          }
          data = await fetchMarginDetail(args);
          formattedOutput = formatMarginDetail(data, args);
          break;

        case 'slb_len_mm':
          // 做市借券交易汇总（历史对比）
          data = await fetchSlbLenMm(args);
          formattedOutput = formatSlbLenMm(data, args);
          break;

        default:
          throw new Error(`不支持的数据类型: ${args.data_type}`);
      }

      if (!data || data.length === 0) {
        throw new Error(`未找到相关融资融券数据`);
      }

      return {
        content: [{ type: "text", text: formattedOutput }]
      };

    } catch (error) {
      console.error('融资融券数据查询错误:', error);
      return {
        content: [{
          type: "text",
          text: `查询融资融券数据时发生错误: ${error instanceof Error ? error.message : '未知错误'}`
        }]
      };
    }
  }
};

// ==================== API 调用函数 ====================

/**
 * 1. 融资融券标的股票
 * 使用东方财富个股明细接口，获取所有标的
 */
async function fetchMarginSecs(args: any) {
  const startDate = formatDateToEM(args.start_date);

  // 获取指定日期的所有标的股票
  const params = new URLSearchParams({
    reportName: 'RPTA_WEB_RZRQ_GGMX',
    columns: 'ALL',
    source: 'WEB',
    sortColumns: 'SCODE',
    sortTypes: '1',
    pageNumber: '1',
    pageSize: '5000',
    filter: `(DATE='${startDate}')`
  });

  const data = await callEastMoneyAPI(params, 'margin_secs');

  // 如果指定了交易所，进行过滤
  if (args.exchange && data.length > 0) {
    const exchangeMap: Record<string, string> = {
      'SSE': '上交所',
      'SZSE': '深交所',
      'BSE': '北交所'
    };
    const exchangeName = exchangeMap[args.exchange] || args.exchange;
    return data.filter((item: any) => item.TRADE_MARKET?.includes(exchangeName));
  }

  // 如果指定了股票代码，进行过滤
  if (args.ts_code && data.length > 0) {
    const code = args.ts_code.split('.')[0]; // 提取代码部分
    return data.filter((item: any) => item.SCODE === code);
  }

  return data;
}

/**
 * 2. 融资融券交易汇总（个股明细）
 * 获取指定股票的融资融券历史数据
 */
async function fetchMarginSummary(args: any) {
  const code = args.ts_code.split('.')[0]; // 提取代码部分，如 '600000'
  const startDate = formatDateToEM(args.start_date);
  const endDate = args.end_date ? formatDateToEM(args.end_date) : getTodayEM();

  const params = new URLSearchParams({
    reportName: 'RPTA_WEB_RZRQ_GGMX',
    columns: 'ALL',
    source: 'WEB',
    sortColumns: 'DATE',
    sortTypes: '-1',
    pageNumber: '1',
    pageSize: '500',
    filter: `(SCODE="${code}")(DATE>='${startDate}')(DATE<='${endDate}')`
  });

  return await callEastMoneyAPI(params, 'margin');
}

/**
 * 3. 融资融券交易明细
 * 与交易汇总使用相同的接口，数据格式相同
 */
async function fetchMarginDetail(args: any) {
  return await fetchMarginSummary(args);
}

/**
 * 4. 做市借券交易汇总（历史对比 - 沪深市场对比）
 */
async function fetchSlbLenMm(args: any) {
  const startDate = formatDateToEM(args.start_date);
  const endDate = args.end_date ? formatDateToEM(args.end_date) : getTodayEM();

  const params = new URLSearchParams({
    reportName: 'RPTA_RZRQ_LSDB',
    columns: 'ALL',
    source: 'WEB',
    sortColumns: 'DIM_DATE',
    sortTypes: '-1',
    pageNumber: '1',
    pageSize: '500',
    filter: `(DIM_DATE>='${startDate}')(DIM_DATE<='${endDate}')`
  });

  return await callEastMoneyAPI(params, 'slb_len_mm');
}

/**
 * 通用东方财富API调用函数
 */
async function callEastMoneyAPI(params: URLSearchParams, apiName: string) {
  const url = `${EM_API_BASE_URL}?${params.toString()}`;
  console.log(`请求${apiName}数据，URL:`, url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`东方财富API请求失败: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`东方财富API错误: ${result.message || '未知错误'}`);
    }

    if (!result.result || !result.result.data || result.result.data.length === 0) {
      return [];
    }

    console.log(`成功获取到${result.result.data.length}条${apiName}数据记录`);
    return result.result.data;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时: ${apiName}`);
    }
    throw error;
  }
}

// ==================== 数据格式化函数 ====================

/**
 * 格式化融资融券标的数据
 */
function formatMarginSecs(data: any[], args: any): string {
  let output = `# 📋 融资融券标的股票列表\n\n`;

  output += `📅 查询日期: ${args.start_date}`;
  if (args.end_date) {
    output += ` ~ ${args.end_date}`;
  }
  output += `\n`;

  if (args.exchange) {
    output += `🏛️ 交易所: ${getExchangeName(args.exchange)}\n`;
  }
  output += `📊 标的数量: ${data.length}只\n\n`;

  if (data.length === 0) {
    output += `ℹ️ 暂无融资融券标的数据\n\n`;
    return output;
  }

  // 按交易所分组统计
  const exchangeStats: Record<string, number> = {};
  data.forEach(item => {
    const market = item.TRADE_MARKET || '未知';
    exchangeStats[market] = (exchangeStats[market] || 0) + 1;
  });

  output += `## 📈 按交易所统计\n\n`;
  output += `| 交易所 | 标的数量 | 占比 |\n`;
  output += `|--------|----------|------|\n`;
  Object.entries(exchangeStats).forEach(([market, count]) => {
    const percentage = ((count / data.length) * 100).toFixed(2);
    output += `| ${market} | ${count}只 | ${percentage}% |\n`;
  });

  // 显示详细列表（前50个）
  const displayData = data.slice(0, 50);
  output += `\n## 📋 详细标的列表 (前${displayData.length}条)\n\n`;
  output += `| 代码 | 名称 | 交易所 | 融资余额(万元) |\n`;
  output += `|------|------|--------|---------------|\n`;

  displayData.forEach(item => {
    const rzye = (parseFloat(item.RZYE || 0) / 10000).toFixed(2);
    output += `| ${item.SCODE} | ${item.SECNAME} | ${item.TRADE_MARKET} | ${rzye} |\n`;
  });

  if (data.length > 50) {
    output += `\n*显示前50条记录，共${data.length}条数据*\n`;
  }

  return output;
}

/**
 * 格式化融资融券交易汇总数据
 */
function formatMarginSummary(data: any[], args: any): string {
  let output = `# 💰 ${args.ts_code} 融资融券交易汇总\n\n`;
  output += `📅 查询期间: ${args.start_date} ~ ${args.end_date || '今日'}\n`;
  output += `📊 数据条数: ${data.length}条\n\n`;

  if (data.length === 0) {
    output += `ℹ️ 暂无融资融券交易汇总数据\n\n`;
    return output;
  }

  const sortedData = data.sort((a, b) => b.DATE.localeCompare(a.DATE));
  const latestData = sortedData[0];

  // 最新数据概览
  const latestDate = formatDateDisplay(latestData.DATE);
  output += `## 📈 最新数据概览 (${latestDate})\n\n`;
  output += `| 项目 | 金额/数量 | 说明 |\n`;
  output += `|------|----------|------|\n`;
  output += `| 💼 融资余额 | ${formatNumber(latestData.RZYE)}元 | 当日融资买入后的余额 |\n`;
  output += `| 📊 融券余额 | ${formatNumber(latestData.RQYE)}元 | 当日融券卖出后的余额 |\n`;
  output += `| 💰 融资融券余额 | ${formatNumber(latestData.RZRQYE)}元 | 融资余额 + 融券余额 |\n`;
  output += `| 📈 融资买入额 | ${formatNumber(latestData.RZMRE)}元 | 当日融资买入额 |\n`;
  output += `| 📉 融券卖出量 | ${formatNumber(latestData.RQMCL)} | 当日融券卖出量 |\n\n`;

  // 期间统计
  let totalRzmre = 0, totalRzche = 0, totalRqmcl = 0, totalRqchl = 0;
  sortedData.forEach(item => {
    totalRzmre += parseFloat(item.RZMRE || 0);
    totalRzche += parseFloat(item.RZCHE || 0);
    totalRqmcl += parseFloat(item.RQMCL || 0);
    totalRqchl += parseFloat(item.RQCHL || 0);
  });

  output += `## 📊 期间统计汇总\n\n`;
  output += `| 项目 | 累计金额/数量 | 日均金额/数量 |\n`;
  output += `|------|-------------|-------------|\n`;
  output += `| 💵 融资买入额 | ${formatNumber(totalRzmre)}元 | ${formatNumber(totalRzmre / data.length)}元 |\n`;
  output += `| 💸 融资偿还额 | ${formatNumber(totalRzche)}元 | ${formatNumber(totalRzche / data.length)}元 |\n`;
  output += `| 📈 融券卖出量 | ${formatNumber(totalRqmcl)} | ${formatNumber(totalRqmcl / data.length)} |\n`;
  output += `| 📉 融券偿还量 | ${formatNumber(totalRqchl)} | ${formatNumber(totalRqchl / data.length)} |\n\n`;

  // 详细记录表格
  const displayData = sortedData.slice(0, 10);
  output += `## 📋 详细交易记录 (最近${displayData.length}个交易日)\n\n`;
  output += `| 交易日期 | 融资余额(万元) | 融资买入(万元) | 融资偿还(万元) | 融券余额(万元) | 融券卖出量 | 融券偿还量 |\n`;
  output += `|---------|--------------|--------------|--------------|--------------|----------|-----------|\n`;

  displayData.forEach(item => {
    const date = formatDateDisplay(item.DATE);
    const rzye = (parseFloat(item.RZYE || 0) / 10000).toFixed(2);
    const rzmre = (parseFloat(item.RZMRE || 0) / 10000).toFixed(2);
    const rzche = (parseFloat(item.RZCHE || 0) / 10000).toFixed(2);
    const rqye = (parseFloat(item.RQYE || 0) / 10000).toFixed(2);
    const rqmcl = formatNumber(item.RQMCL || 0);
    const rqchl = formatNumber(item.RQCHL || 0);

    output += `| ${date} | ${rzye} | ${rzmre} | ${rzche} | ${rqye} | ${rqmcl} | ${rqchl} |\n`;
  });

  return output;
}

/**
 * 格式化融资融券交易明细数据
 */
function formatMarginDetail(data: any[], args: any): string {
  let output = `# 📊 ${args.ts_code} 融资融券交易明细\n\n`;
  output += `📅 查询期间: ${args.start_date} ~ ${args.end_date || '今日'}\n`;
  output += `📊 数据条数: ${data.length}条\n\n`;

  if (data.length === 0) {
    output += `ℹ️ 暂无融资融券交易明细数据\n\n`;
    return output;
  }

  const sortedData = data.sort((a, b) => b.DATE.localeCompare(a.DATE));

  // 显示详细明细表格
  const displayData = sortedData.slice(0, 20);
  output += `## 📋 交易明细记录 (最近${displayData.length}个交易日)\n\n`;
  output += `| 交易日期 | 融资余额(万元) | 融资买入(万元) | 融券余额(万元) | 融券卖出量 | 融资融券余额(万元) |\n`;
  output += `|---------|--------------|--------------|--------------|----------|----------------|\n`;

  displayData.forEach(item => {
    const date = formatDateDisplay(item.DATE);
    const rzye = (parseFloat(item.RZYE || 0) / 10000).toFixed(2);
    const rzmre = (parseFloat(item.RZMRE || 0) / 10000).toFixed(2);
    const rqye = (parseFloat(item.RQYE || 0) / 10000).toFixed(2);
    const rqmcl = formatNumber(item.RQMCL || 0);
    const rzrqye = (parseFloat(item.RZRQYE || 0) / 10000).toFixed(2);

    output += `| ${date} | ${rzye} | ${rzmre} | ${rqye} | ${rqmcl} | ${rzrqye} |\n`;
  });

  if (sortedData.length > 20) {
    output += `\n*显示最近20条记录，共${sortedData.length}条数据*\n`;
  }

  return output;
}

/**
 * 格式化做市借券交易汇总数据（沪深市场历史对比）
 */
function formatSlbLenMm(data: any[], args: any): string {
  let output = `# 🏦 融资融券市场历史对比\n\n`;

  output += `📅 查询期间: ${args.start_date}`;
  if (args.end_date) {
    output += ` ~ ${args.end_date}`;
  }
  output += `\n`;
  output += `📊 数据条数: ${data.length}条\n\n`;

  if (data.length === 0) {
    output += `ℹ️ 暂无市场对比数据\n\n`;
    return output;
  }

  const sortedData = data.sort((a, b) => b.DIM_DATE.localeCompare(a.DIM_DATE));
  const latestData = sortedData[0];

  // 最新数据概览
  const latestDate = formatDateDisplay(latestData.DIM_DATE);
  output += `## 📈 最新数据概览 (${latestDate})\n\n`;
  output += `| 市场 | 融资余额(亿元) | 融资买入(亿元) | 融券余额(亿元) | 融券卖出量(万股) |\n`;
  output += `|------|---------------|---------------|---------------|----------------|\n`;

  if (latestData.H_RZYE) {
    const hRzye = (parseFloat(latestData.H_RZYE) / 100000000).toFixed(2);
    const hRzmre = (parseFloat(latestData.H_RZMRE) / 100000000).toFixed(2);
    const hRqye = (parseFloat(latestData.H_RQYE) / 100000000).toFixed(2);
    const hRqmcl = (parseFloat(latestData.H_RQMCL) / 10000).toFixed(2);
    output += `| 上海市场 | ${hRzye} | ${hRzmre} | ${hRqye} | ${hRqmcl} |\n`;
  }

  if (latestData.S_RZYE) {
    const sRzye = (parseFloat(latestData.S_RZYE) / 100000000).toFixed(2);
    const sRzmre = (parseFloat(latestData.S_RZMRE) / 100000000).toFixed(2);
    const sRqye = (parseFloat(latestData.S_RQYE) / 100000000).toFixed(2);
    const sRqmcl = (parseFloat(latestData.S_RQMCL) / 10000).toFixed(2);
    output += `| 深圳市场 | ${sRzye} | ${sRzmre} | ${sRqye} | ${sRqmcl} |\n`;
  }

  // 详细记录表格
  const displayData = sortedData.slice(0, 15);
  output += `\n## 📋 历史对比记录 (最近${displayData.length}个交易日)\n\n`;
  output += `| 交易日期 | 沪融资余额(亿) | 沪融资买入(亿) | 深融资余额(亿) | 深融资买入(亿) |\n`;
  output += `|---------|---------------|---------------|---------------|---------------|\n`;

  displayData.forEach(item => {
    const date = formatDateDisplay(item.DIM_DATE);
    const hRzye = item.H_RZYE ? (parseFloat(item.H_RZYE) / 100000000).toFixed(2) : '-';
    const hRzmre = item.H_RZMRE ? (parseFloat(item.H_RZMRE) / 100000000).toFixed(2) : '-';
    const sRzye = item.S_RZYE ? (parseFloat(item.S_RZYE) / 100000000).toFixed(2) : '-';
    const sRzmre = item.S_RZMRE ? (parseFloat(item.S_RZMRE) / 100000000).toFixed(2) : '-';

    output += `| ${date} | ${hRzye} | ${hRzmre} | ${sRzye} | ${sRzmre} |\n`;
  });

  if (sortedData.length > 15) {
    output += `\n*显示前15条记录，共${sortedData.length}条数据*\n`;
  }

  // 数据说明
  output += `\n## 📝 数据说明\n\n`;
  output += `- **融资余额**: 当日收盘时投资者融资买入股票的余额\n`;
  output += `- **融资买入额**: 当日投资者融资买入股票的金额\n`;
  output += `- **融券余额**: 当日收盘时投资者融券卖出股票的余额\n`;
  output += `- **融券卖出量**: 当日投资者融券卖出股票的数量\n`;

  return output;
}

// ==================== 辅助函数 ====================

/**
 * 将 YYYYMMDD 格式转换为东方财富格式 YYYY-MM-DD
 */
function formatDateToEM(date: string): string {
  if (date.length === 8) {
    return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
  }
  return date;
}

/**
 * 获取今天的日期（东方财富格式）
 */
function getTodayEM(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期显示（去掉时间部分）
 */
function formatDateDisplay(date: string): string {
  if (date.includes(' ')) {
    return date.split(' ')[0];
  }
  return date;
}

/**
 * 获取交易所名称
 */
function getExchangeName(exchange: string): string {
  const exchangeMap: Record<string, string> = {
    'SSE': '上交所',
    'SZSE': '深交所',
    'BSE': '北交所',
    '上交所': '上交所',
    '深交所': '深交所',
    '北交所': '北交所'
  };
  return exchangeMap[exchange] || exchange;
}

/**
 * 格式化数字显示
 */
function formatNumber(num: any): string {
  if (num === null || num === undefined || num === '') {
    return '0';
  }

  const numValue = parseFloat(num);
  if (isNaN(numValue)) {
    return '0';
  }

  if (numValue >= 100000000) {
    return (numValue / 100000000).toFixed(2) + '亿';
  } else if (numValue >= 10000) {
    return (numValue / 10000).toFixed(2) + '万';
  } else {
    return numValue.toLocaleString();
  }
}
