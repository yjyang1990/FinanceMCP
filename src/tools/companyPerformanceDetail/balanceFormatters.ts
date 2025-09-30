// 资产负债表数据格式化函数 - 简洁表格版本
// 格式化数字的辅助函数
function formatNumber(num: any): string {
  if (num === null || num === undefined || num === '') return 'N/A';
  const number = parseFloat(num);
  if (isNaN(number)) return 'N/A';
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

// 辅助函数：获取报告类型描述
function getReportType(type: string): string {
  const typeMap: Record<string, string> = {
    '1': '合并报表',
    '2': '单季合并',
    '6': '母公司报表'
  };
  return typeMap[type] || `类型${type}`;
}

// 辅助函数：获取公司类型描述
function getCompanyType(type: string): string {
  const typeMap: Record<string, string> = {
    '1': '一般工商业',
    '2': '银行',
    '3': '保险',
    '4': '证券'
  };
  return typeMap[type] || `类型${type}`;
}

// 格式化核心资产负债表数据
export function formatBasicBalance(data: any[]): string {
  if (!data || data.length === 0) return '暂无数据\n\n';

  let output = `| 报告期 | 公告日期 | 总股本(股) | 流通股本(股) | 每股净资产(元) | 报告类型 |\n`;
  output += `|--------|----------|------------|-------------|---------------|----------|\n`;

  for (const item of data) {
    const endDate = item.end_date || 'N/A';
    const annDate = item.ann_date || 'N/A';
    const totalShare = formatNumber(item.total_share);
    const floatShare = formatNumber(item.float_share);
    const bps = item.bps ? item.bps.toFixed(4) : 'N/A';
    const reportType = getReportType(item.report_type);

    output += `| ${endDate} | ${annDate} | ${totalShare} | ${floatShare} | ${bps} | ${reportType} |\n`;
  }
  
  output += `\n**💡 说明：** 单位：万元，报告类型：${getReportType(data[0]?.report_type || '1')}\n\n`;
  return output;
}


// 格式化完整基础财务数据
export function formatAllBalance(data: any[]): string {
  if (!data || data.length === 0) return '暂无数据\n\n';

  let output = `| 报告期 | 公告日期 | 总股本(股) | 流通股本(股) | 每股净资产(元) | 报告类型 | 公司类型 |\n`;
  output += `|--------|----------|------------|-------------|---------------|----------|----------|\n`;

  for (const item of data) {
    const endDate = item.end_date || 'N/A';
    const annDate = item.ann_date || 'N/A';
    const totalShare = formatNumber(item.total_share);
    const floatShare = formatNumber(item.float_share);
    const bps = item.bps ? item.bps.toFixed(4) : 'N/A';
    const reportType = getReportType(item.report_type);
    const compType = getCompanyType(item.comp_type);

    output += `| ${endDate} | ${annDate} | ${totalShare} | ${floatShare} | ${bps} | ${reportType} | ${compType} |\n`;
  }

  output += `\n**💡 说明：** 基础财务数据，包含股本结构和每股净资产信息\n\n`;

  return output;
}

