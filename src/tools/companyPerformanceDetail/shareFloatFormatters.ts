// 融资融券数据格式化器

// 格式化融资融券数据
export function formatShareFloat(data: any[]): string {
  if (!data || data.length === 0) {
    return 'ℹ️ 暂无融资融券数据\n\n';
  }

  let output = '';

  // 按交易日期排序（最新的在前）
  const sortedData = data.sort((a, b) => (b.trade_date || '').localeCompare(a.trade_date || ''));

  output += `📊 融资融券数据概况: 共 ${data.length} 条记录\n\n`;

  // 创建详细表格
  output += `| 交易日期 | 融资余额(万元) | 融券余额(万股) | 融资融券余额(万元) |\n`;
  output += `|---------|---------------|---------------|------------------|\n`;

  // 添加数据行
  for (const item of sortedData) {
    const tradeDate = item.trade_date || 'N/A';
    const rzye = item.rzye ? formatNumber(item.rzye / 10000) : 'N/A';
    const rqye = item.rqye ? formatNumber(item.rqye / 10000) : 'N/A';
    const rzrqYe = item.rzrq_ye ? formatNumber(item.rzrq_ye / 10000) : 'N/A';

    output += `| ${tradeDate} | ${rzye} | ${rqye} | ${rzrqYe} |\n`;
  }

  output += '\n';

  // 融资融券统计
  const avgRzye = sortedData.reduce((sum, item) => sum + (item.rzye || 0), 0) / data.length;
  const avgRqye = sortedData.reduce((sum, item) => sum + (item.rqye || 0), 0) / data.length;
  const avgRzrqYe = sortedData.reduce((sum, item) => sum + (item.rzrq_ye || 0), 0) / data.length;

  const maxRzye = Math.max(...sortedData.map(item => item.rzye || 0));
  const minRzye = Math.min(...sortedData.map(item => item.rzye || 0));

  output += `### 📈 融资融券统计\n\n`;
  output += `- 平均融资余额: ${formatNumber(avgRzye / 10000)} 万元\n`;
  output += `- 平均融券余额: ${formatNumber(avgRqye / 10000)} 万股\n`;
  output += `- 平均融资融券余额: ${formatNumber(avgRzrqYe / 10000)} 万元\n`;
  output += `- 最高融资余额: ${formatNumber(maxRzye / 10000)} 万元\n`;
  output += `- 最低融资余额: ${formatNumber(minRzye / 10000)} 万元\n`;
  output += `- 统计期间: ${data.length} 个交易日\n\n`;

  return output;
}

// 格式化数字显示
function formatNumber(num: number): string {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万';
  } else {
    return num.toLocaleString();
  }
} 