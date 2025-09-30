// 股东数据格式化函数模块
// 用于处理股东人数和股东增减持数据展示

// 辅助函数：格式化数字
function formatNumber(num: any): string {
  if (num === null || num === undefined || num === '') return 'N/A';
  const number = parseFloat(num);
  if (isNaN(number)) return 'N/A';
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

// 辅助函数：获取股东类型描述
function getHolderType(type: string): string {
  const typeMap: Record<string, string> = {
    'G': '👤 高管',
    'P': '👤 个人',
    'C': '🏢 公司'
  };
  return typeMap[type] || type;
}

// 格式化股东人数数据
export function formatHolderNumber(data: any[]): string {
  if (!data || data.length === 0) {
    return `暂无数据\n\n`;
  }

  let output = '';
  
  // 按公告日期排序（最新的在前）
  const sortedData = data.sort((a, b) => (b.ann_date || '').localeCompare(a.ann_date || ''));
  
  // 创建表格头
  output += `| 公告日期 | 截止日期 | 股东户数(户) |\n`;
  output += `|---------|---------|------------|\n`;
  
  // 添加数据行
  for (const item of sortedData) {
    const annDate = item.ann_date || 'N/A';
    const endDate = item.end_date || 'N/A';
    const holderNum = item.holder_num ? formatNumber(item.holder_num) : 'N/A';
    
    output += `| ${annDate} | ${endDate} | ${holderNum} |\n`;
  }
  
  output += '\n';
  output += `📊 数据统计: 共 ${data.length} 条记录\n\n`;
  
  return output;
}

// 格式化龙虎榜数据 (之前命名有误，这是龙虎榜数据而非股东增减持)
export function formatHolderTrade(data: any[]): string {
  if (!data || data.length === 0) {
    return `暂无数据\n\n`;
  }

  let output = '';

  // 按交易日期排序（最新的在前）
  const sortedData = data.sort((a, b) => (b.trade_date || '').localeCompare(a.trade_date || ''));

  output += `📊 龙虎榜交易概况: 共 ${data.length} 条记录\n\n`;

  // 创建详细表格
  output += `| 交易日期 | 上榜原因 | 买入金额(万元) | 卖出金额(万元) | 净买入(万元) |\n`;
  output += `|---------|---------|---------------|---------------|-------------|\n`;

  // 添加数据行
  for (const item of sortedData) {
    const tradeDate = item.trade_date || 'N/A';
    const explanation = item.explanation || 'N/A';
    const totalBuy = item.total_buy ? formatNumber(item.total_buy / 10000) : 'N/A';
    const totalSell = item.total_sell ? formatNumber(item.total_sell / 10000) : 'N/A';
    const netBuy = item.net_buy ? formatNumber(item.net_buy / 10000) : 'N/A';

    output += `| ${tradeDate} | ${explanation} | ${totalBuy} | ${totalSell} | ${netBuy} |\n`;
  }

  output += '\n';

  // 龙虎榜统计
  const totalBuyAmount = sortedData.reduce((sum, item) => sum + (item.total_buy || 0), 0);
  const totalSellAmount = sortedData.reduce((sum, item) => sum + (item.total_sell || 0), 0);
  const totalNetBuy = sortedData.reduce((sum, item) => sum + (item.net_buy || 0), 0);

  output += `### 📈 龙虎榜交易统计\n\n`;
  output += `- 累计买入金额: ${formatNumber(totalBuyAmount / 10000)} 万元\n`;
  output += `- 累计卖出金额: ${formatNumber(totalSellAmount / 10000)} 万元\n`;
  output += `- 累计净买入: ${formatNumber(totalNetBuy / 10000)} 万元\n`;
  output += `- 上榜次数: ${data.length} 次\n\n`;

  return output;
} 