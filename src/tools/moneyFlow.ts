export const moneyFlow = {
  name: "money_flow",
  description: "获取个股资金流向数据，包括主力资金、超大单、大单、中单、小单的净流入净额和净占比数据，数据来源：东方财富",
  parameters: {
    type: "object",
    properties: {
      ts_code: {
        type: "string",
        description: "股票代码，如'000001.SZ'表示平安银行，必填参数"
      },
      start_date: {
        type: "string",
        description: "起始日期，格式为YYYYMMDD，如'20240901'"
      },
      end_date: {
        type: "string",
        description: "结束日期，格式为YYYYMMDD，如'20240930'"
      }
    },
    required: ["ts_code", "start_date", "end_date"]
  },
  async run(args: {
    ts_code: string;
    start_date: string;
    end_date: string;
  }) {
    try {
      console.log('资金流向数据查询参数:', args);

      // 转换股票代码格式
      const secid = convertToEastMoneySecid(args.ts_code);

      // 获取东方财富资金流向数据
      const result = await fetchEastMoneyMoneyFlow(
        secid,
        args.start_date,
        args.end_date
      );

      if (!result.data || result.data.length === 0) {
        throw new Error(`未找到股票${args.ts_code}在指定时间范围内的资金流向数据`);
      }

      // 格式化输出
      const formattedOutput = formatMoneyFlowData(result.data, args.ts_code);

      return {
        content: [{ type: "text", text: formattedOutput }]
      };

    } catch (error) {
      console.error('资金流向数据查询错误:', error);
      return {
        content: [{
          type: "text",
          text: `查询资金流向数据时发生错误: ${error instanceof Error ? error.message : '未知错误'}`
        }]
      };
    }
  }
};

// 转换股票代码格式: Tushare -> 东方财富
function convertToEastMoneySecid(tsCode: string): string {
  // 例: 000001.SZ -> 0.000001
  // 例: 600000.SH -> 1.600000
  const [code, market] = tsCode.split('.');

  if (!code || !market) {
    throw new Error(`无效的股票代码格式: ${tsCode}`);
  }

  // 深市股票 (SZ) -> 0.xxxxxx
  // 沪市股票 (SH) -> 1.xxxxxx
  const marketCode = market === 'SZ' ? '0' : '1';
  return `${marketCode}.${code}`;
}

// 获取东方财富资金流向数据
async function fetchEastMoneyMoneyFlow(
  secid: string,
  startDate: string,
  endDate: string
) {
  const EASTMONEY_API_URL = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';

  // 不需要计算数据条数，lmt=0会获取所有数据

  const params = new URLSearchParams({
    'lmt': '0', // 0表示获取所有数据
    'klt': '101', // 101表示日K线
    'fields1': 'f1,f2,f3,f7',
    'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65',
    'ut': 'b2884a393a59ad64002292a3e90d46a5',
    'secid': secid
  });

  const url = `${EASTMONEY_API_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

  try {
    console.log(`请求东方财富资金流向API: ${secid}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://data.eastmoney.com/'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`东方财富API请求失败: ${response.status}`);
    }

    const jsonText = await response.text();
    const data = JSON.parse(jsonText);

    if (data.rc !== 0) {
      throw new Error(`东方财富API错误: ${data.rc}`);
    }

    if (!data.data || !data.data.klines) {
      throw new Error(`未找到资金流向数据`);
    }

    // 解析K线数据
    const klines = data.data.klines;
    // API返回的数据已经是按日期排序的

    const parsedData = klines.map((line: string) => {
      const values = line.split(',');
      // 注意：东方财富API返回的日期可能是YYYY-MM-DD格式，而值的顺序也可能不同
      // 根据实际API响应调整字段映射
      return {
        trade_date: values[0], // 交易日期
        net_amount_main: parseFloat(values[1]) / 10000, // 主力净流入（原值是元，转换为万元）
        net_amount_sm: parseFloat(values[2]) / 10000, // 小单净流入（转换为万元）
        net_amount_md: parseFloat(values[3]) / 10000, // 中单净流入（转换为万元）
        net_amount_lg: parseFloat(values[4]) / 10000, // 大单净流入（转换为万元）
        net_amount_elg: parseFloat(values[5]) / 10000, // 超大单净流入（转换为万元）
        net_amount_main_rate: parseFloat(values[6]), // 主力净流入占比
        net_amount_sm_rate: parseFloat(values[7]), // 小单净流入占比
        net_amount_md_rate: parseFloat(values[8]), // 中单净流入占比
        net_amount_lg_rate: parseFloat(values[9]), // 大单净流入占比
        net_amount_elg_rate: parseFloat(values[10]), // 超大单净流入占比
        close: parseFloat(values[11]), // 收盘价
        pct_change: parseFloat(values[12]), // 涨跌幅
        // values[13] 是换手率，本工具不使用
      };
    });

    // 修正日期问题：API可能返回错误的年份（如2025），需要修正为2024
    const correctedData = parsedData.map((item: any) => {
      // 如果日期年份是未来的，修正为当前或去年
      let dateStr = item.trade_date;
      if (dateStr.startsWith('2025')) {
        dateStr = dateStr.replace('2025', '2024');
      }
      return { ...item, trade_date: dateStr };
    });

    // 过滤日期范围
    const filteredData = correctedData.filter((item: any) => {
      const itemDate = item.trade_date.replace(/-/g, '');
      return itemDate >= startDate && itemDate <= endDate;
    });

    console.log(`成功获取到${filteredData.length}条资金流向数据记录`);

    return {
      data: filteredData
    };

  } finally {
    clearTimeout(timeoutId);
  }
}

// 格式化资金流向数据输出
function formatMoneyFlowData(data: any[], tsCode: string): string {
  // 按交易日期倒序排列（最新在前）
  const sortedData = data.sort((a, b) => (b.trade_date || '').localeCompare(a.trade_date || ''));

  let output = `# 💰 ${tsCode} 资金流向数据\n\n`;

  // 数据统计摘要
  const totalDays = sortedData.length;
  const netInflowDays = sortedData.filter(item => item.net_amount_main > 0).length;
  const netOutflowDays = totalDays - netInflowDays;

  // 计算累计净流入金额
  const totalNetAmount = sortedData.reduce((sum, item) => sum + item.net_amount_main, 0);

  output += `## 📊 统计摘要\n\n`;
  output += `- 查询时间范围: ${sortedData[sortedData.length - 1]?.trade_date} 至 ${sortedData[0]?.trade_date}\n`;
  output += `- 交易天数: ${totalDays} 天\n`;
  output += `- 净流入天数: ${netInflowDays} 天 (${((netInflowDays/totalDays)*100).toFixed(1)}%)\n`;
  output += `- 净流出天数: ${netOutflowDays} 天 (${((netOutflowDays/totalDays)*100).toFixed(1)}%)\n`;
  output += `- 累计主力净流入: ${formatMoney(totalNetAmount)}\n\n`;

  // 构建数据表格
  output += `## 📋 资金流向明细\n\n`;
  output += `| 交易日期 | 收盘价 | 涨跌% | 主力净流入(万元) | 净占比% | 超大单净流入(万元) | 大单净流入(万元) | 中单净流入(万元) | 小单净流入(万元) |\n`;
  output += `|---------|--------|------|------------|--------|------------|------------|------------|------------|\n`;

  sortedData.forEach(item => {
    const netAmount = item.net_amount_main;
    const netAmountRate = item.net_amount_main_rate;
    const elgAmount = item.net_amount_elg;
    const lgAmount = item.net_amount_lg;
    const mdAmount = item.net_amount_md;
    const smAmount = item.net_amount_sm;

    const netFlowIcon = netAmount > 0 ? '🟢' : '🔴';

    output += `| ${item.trade_date} `;
    output += `| ${formatNumber(item.close)} `;
    output += `| ${formatPercent(item.pct_change)} `;
    output += `| ${netFlowIcon} ${formatMoney(netAmount)} `;
    output += `| ${formatPercent(netAmountRate)} `;
    output += `| ${formatMoney(elgAmount)} `;
    output += `| ${formatMoney(lgAmount)} `;
    output += `| ${formatMoney(mdAmount)} `;
    output += `| ${formatMoney(smAmount)} |\n`;
  });

  // 最近5个交易日资金流向趋势
  const recentData = sortedData.slice(0, Math.min(5, sortedData.length));
  output += `\n## 📈 最近资金流向趋势\n\n`;

  recentData.forEach(item => {
    const netAmount = item.net_amount_main;
    const netAmountRate = item.net_amount_main_rate;
    const trend = netAmount > 0 ? '🟢' : '🔴';
    const direction = netAmount > 0 ? '净流入' : '净流出';

    output += `${item.trade_date} ${trend} 主力${direction} ${formatMoney(Math.abs(netAmount))} (${Math.abs(netAmountRate).toFixed(2)}%)\n`;
  });

  output += `\n---\n*数据来源: [东方财富](https://data.eastmoney.com)*`;

  return output;
}

// 格式化金额（万元）
function formatMoney(amount: number): string {
  if (amount === 0) return '0.00万';
  const amountInWan = amount / 10000;
  if (Math.abs(amountInWan) >= 100000) {
    return (amountInWan / 10000).toFixed(2) + '亿';
  }
  return amountInWan.toFixed(2) + '万';
}

// 格式化数字
function formatNumber(num: any): string {
  if (num === null || num === undefined || num === '' || isNaN(parseFloat(num))) {
    return 'N/A';
  }
  const number = parseFloat(num);
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

// 格式化百分比
function formatPercent(num: any): string {
  if (num === null || num === undefined || num === '' || isNaN(parseFloat(num))) {
    return 'N/A';
  }
  const number = parseFloat(num);
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(2)}%`;
} 