import { resolveStockCodes } from '../utils/stockCodeResolver.js';

/**
 * 龙虎榜机构成交明细工具
 * 使用东方财富API替代Tushare API
 */
export const dragonTigerInst = {
  name: 'dragon_tiger_inst',
  description: '龙虎榜机构成交明细。必填：交易日期；可选：股票代码。返回表格包含买入/卖出/净额及上榜理由等。',
  parameters: {
    type: 'object',
    properties: {
      trade_date: {
        type: 'string',
        description: '交易日期，格式YYYYMMDD或YYYY-MM-DD'
      },
      ts_code: {
        type: 'string',
        description: '可选，股票代码，如 000001.SZ 或 688448.SH'
      }
    },
    required: ['trade_date']
  },
  async run(args: { trade_date: string; ts_code?: string }) {
    try {
      // 验证并格式化交易日期
      let tradeDate = args.trade_date.replace(/-/g, '');
      if (tradeDate.length !== 8) {
        throw new Error('trade_date 必须为YYYYMMDD或YYYY-MM-DD格式');
      }
      // 转换为 YYYY-MM-DD 格式用于API查询
      const formattedDate = `${tradeDate.slice(0, 4)}-${tradeDate.slice(4, 6)}-${tradeDate.slice(6, 8)}`;

      // 构建API URL
      const baseUrl = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
      const params = new URLSearchParams({
        reportName: 'RPT_BILLBOARD_DAILYDETAILSBUY',
        columns: 'SECURITY_CODE,SECUCODE,TRADE_DATE,OPERATEDEPT_NAME,EXPLANATION,CHANGE_RATE,CLOSE_PRICE,BUY,SELL,NET,TOTAL_BUYRIO,TOTAL_SELLRIO',
        pageNumber: '1',
        pageSize: '500',
        sortTypes: '-1',
        sortColumns: 'BUY',
        source: 'WEB',
        client: 'WEB',
        filter: `(TRADE_DATE='${formattedDate}')`
      });

      const url = `${baseUrl}?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const resp = await fetch(url, {
          method: 'GET',
          signal: controller.signal
        });

        if (!resp.ok) {
          throw new Error(`东方财富API请求失败: ${resp.status}`);
        }

        const data = await resp.json();

        if (!data.result || !data.result.data) {
          return {
            content: [
              { type: 'text', text: `# 龙虎榜机构明细 ${args.trade_date}${args.ts_code ? ` - ${args.ts_code}` : ''}\n\n暂无数据` }
            ]
          };
        }

        let items = data.result.data;

        // 过滤机构数据（包含"机构"字样的营业部名称）
        items = items.filter((item: any) =>
          item.OPERATEDEPT_NAME && item.OPERATEDEPT_NAME.includes('机构')
        );

        // 如果指定了股票代码，进行过滤
        if (args.ts_code) {
          const targetCode = args.ts_code.toUpperCase();
          items = items.filter((item: any) => item.SECUCODE === targetCode);
        }

        if (items.length === 0) {
          return {
            content: [
              { type: 'text', text: `# 龙虎榜机构明细 ${args.trade_date}${args.ts_code ? ` - ${args.ts_code}` : ''}\n\n暂无机构数据` }
            ]
          };
        }

        // 构建表格
        const headers = ['股票代码', '股票简称', '营业部', '涨跌幅(%)', '买入(元)', '卖出(元)', '净额(元)', '上榜理由'];
        let table = `| ${headers.join(' | ')} |\n`;
        table += `|${headers.map(() => '--------').join('|')}|\n`;

        let totalBuy = 0;
        let totalSell = 0;
        let totalNet = 0;
        const stockCodes: string[] = [];

        for (const item of items) {
          const code = item.SECUCODE || 'N/A';
          const stockCode = item.SECURITY_CODE || 'N/A';
          const dept = item.OPERATEDEPT_NAME || 'N/A';
          const changeRate = item.CHANGE_RATE != null ? item.CHANGE_RATE.toFixed(2) : 'N/A';
          const buy = item.BUY != null ? item.BUY : 0;
          const sell = item.SELL != null ? item.SELL : 0;
          const net = item.NET != null ? item.NET : 0;
          const reason = item.EXPLANATION || 'N/A';

          const buyStr = buy ? (buy / 10000).toFixed(2) + '万' : 'N/A';
          const sellStr = sell ? (sell / 10000).toFixed(2) + '万' : 'N/A';
          const netStr = net ? (net / 10000).toFixed(2) + '万' : 'N/A';

          table += `| ${code} | ${stockCode} | ${dept} | ${changeRate} | ${buyStr} | ${sellStr} | ${netStr} | ${reason} |\n`;

          if (buy) totalBuy += buy;
          if (sell) totalSell += sell;
          if (net) totalNet += net;

          if (code !== 'N/A' && !stockCodes.includes(code)) {
            stockCodes.push(code);
          }
        }

        const title = `# 龙虎榜机构明细 ${args.trade_date}${args.ts_code ? ` - ${args.ts_code}` : ''}`;
        const fmt = (n: number) => (n / 100000000).toFixed(2) + '亿';
        const summary = `\n\n## 当日资金统计\n- 买入额合计: ${fmt(totalBuy)}\n- 卖出额合计: ${fmt(totalSell)}\n- 净流入: ${fmt(totalNet)}\n- 数据条数: ${items.length}`;

        // 生成股票代码说明
        const stockExplanation = stockCodes.length > 0 ? await resolveStockCodes(stockCodes) : '';

        return {
          content: [
            { type: 'text', text: `${title}\n\n${table}${summary}${stockExplanation}` }
          ]
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      return {
        content: [
          { type: 'text', text: `❌ 查询失败: ${error instanceof Error ? error.message : String(error)}` }
        ],
        isError: true
      };
    }
  }
};


