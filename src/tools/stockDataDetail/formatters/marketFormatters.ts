export interface FormatParams {
  stockData: Record<string, any>[];
  indicators: Record<string, any>;
  marketType: string;
}

export function formatAmountWan(val: any): string {
  const num = Number(val);
  if (val == null || val === '' || isNaN(num)) return 'N/A';
  return (num / 10).toFixed(2);
}

function buildIndicatorHeaders(indicators: Record<string, any>): string[] {
  const indicatorHeaders: string[] = [];
  if (indicators.macd) indicatorHeaders.push('MACD_DIF', 'MACD_DEA', 'MACD');
  if (indicators.rsi) indicatorHeaders.push('RSI');
  if (indicators.kdj) indicatorHeaders.push('KDJ_K', 'KDJ_D', 'KDJ_J');
  if (indicators.boll) indicatorHeaders.push('BOLL_UP', 'BOLL_MID', 'BOLL_LOW');
  const maIndicators = Object.keys(indicators).filter(key => key.startsWith('ma') && key !== 'macd');
  maIndicators.forEach(ma => indicatorHeaders.push(ma.toUpperCase()));
  return indicatorHeaders;
}

function buildIndicatorRow(indicators: Record<string, any>, index: number): string[] {
  const indicatorRow: string[] = [];
  if (indicators.macd) {
    indicatorRow.push(
      isNaN(indicators.macd.dif[index]) ? 'N/A' : indicators.macd.dif[index].toFixed(4),
      isNaN(indicators.macd.dea[index]) ? 'N/A' : indicators.macd.dea[index].toFixed(4),
      isNaN(indicators.macd.macd[index]) ? 'N/A' : indicators.macd.macd[index].toFixed(4)
    );
  }
  if (indicators.rsi) indicatorRow.push(isNaN(indicators.rsi[index]) ? 'N/A' : indicators.rsi[index].toFixed(2));
  if (indicators.kdj) indicatorRow.push(
    isNaN(indicators.kdj.k[index]) ? 'N/A' : indicators.kdj.k[index].toFixed(2),
    isNaN(indicators.kdj.d[index]) ? 'N/A' : indicators.kdj.d[index].toFixed(2),
    isNaN(indicators.kdj.j[index]) ? 'N/A' : indicators.kdj.j[index].toFixed(2)
  );
  if (indicators.boll) indicatorRow.push(
    isNaN(indicators.boll.upper[index]) ? 'N/A' : indicators.boll.upper[index].toFixed(2),
    isNaN(indicators.boll.middle[index]) ? 'N/A' : indicators.boll.middle[index].toFixed(2),
    isNaN(indicators.boll.lower[index]) ? 'N/A' : indicators.boll.lower[index].toFixed(2)
  );
  const maIndicators = Object.keys(indicators).filter(key => key.startsWith('ma') && key !== 'macd');
  maIndicators.forEach(ma => {
    indicatorRow.push(isNaN(indicators[ma][index]) ? 'N/A' : indicators[ma][index].toFixed(2));
  });
  return indicatorRow;
}

export function formatFxData(params: FormatParams): string {
  const { stockData, indicators } = params;
  const hasIndicators = Object.keys(indicators).length > 0;
  const indicatorHeaders = hasIndicators ? buildIndicatorHeaders(indicators) : [];
  const baseHeaders = ['交易日期','买入开盘','买入最高','买入最低','买入收盘','卖出开盘','卖出最高','卖出最低','卖出收盘','报价笔数'];
  const headers = [...baseHeaders, ...indicatorHeaders];

  let formattedData = `| ${headers.join(' | ')} |\n`;
  formattedData += `|${headers.map(() => '--------').join('|')}|\n`;

  stockData.forEach((data: Record<string, any>, index: number) => {
    const baseRow = [data.trade_date, data.bid_open || 'N/A', data.bid_high || 'N/A', data.bid_low || 'N/A', data.bid_close || 'N/A', data.ask_open || 'N/A', data.ask_high || 'N/A', data.ask_low || 'N/A', data.ask_close || 'N/A', data.tick_qty || 'N/A'];
    const indicatorRow = hasIndicators ? buildIndicatorRow(indicators, index) : [];
    const row = [...baseRow, ...indicatorRow];
    formattedData += `| ${row.join(' | ')} |\n`;
  });

  return formattedData;
}

export function formatFuturesData(params: FormatParams): string {
  const { stockData, indicators } = params;
  const hasIndicators = Object.keys(indicators).length > 0;
  const indicatorHeaders = hasIndicators ? buildIndicatorHeaders(indicators) : [];
  const baseHeaders = ['交易日期','开盘','最高','最低','收盘','结算','涨跌1','涨跌2','成交量','持仓量'];
  const headers = [...baseHeaders, ...indicatorHeaders];

  let formattedData = `| ${headers.join(' | ')} |\n`;
  formattedData += `|${headers.map(() => '--------').join('|')}|\n`;

  stockData.forEach((data: Record<string, any>, index: number) => {
    const baseRow = [data.trade_date, data.open || 'N/A', data.high || 'N/A', data.low || 'N/A', data.close || 'N/A', data.settle || 'N/A', data.change1 || 'N/A', data.change2 || 'N/A', data.vol || 'N/A', data.oi || 'N/A'];
    const indicatorRow = hasIndicators ? buildIndicatorRow(indicators, index) : [];
    const row = [...baseRow, ...indicatorRow];
    formattedData += `| ${row.join(' | ')} |\n`;
  });

  return formattedData;
}

export function formatRepoData(params: FormatParams): string {
  const { stockData } = params;
  let formattedData = `| 交易日期 | 品种名称 | 利率(%) | 成交金额(万元) |\n`;
  formattedData += `|---------|---------|---------|---------------|\n`;

  stockData.forEach((data: Record<string, any>) => {
    const amtWan = formatAmountWan(data.amount);
    formattedData += `| ${data.trade_date} | ${data.name || 'N/A'} | ${data.rate || 'N/A'} | ${amtWan} |\n`;
  });

  return formattedData;
}

export function formatConvertibleBondData(params: FormatParams): string {
  const { stockData, indicators } = params;
  const hasIndicators = Object.keys(indicators).length > 0;
  const indicatorHeaders = hasIndicators ? buildIndicatorHeaders(indicators) : [];
  const baseHeaders = ['交易日期','开盘','最高','最低','收盘','涨跌','涨跌幅(%)','成交量(手)','成交金额(万元)','纯债价值','纯债溢价率(%)','转股价值','转股溢价率(%)'];
  const headers = [...baseHeaders, ...indicatorHeaders];

  let formattedData = `| ${headers.join(' | ')} |\n`;
  formattedData += `|${headers.map(() => '--------').join('|')}|\n`;

  stockData.forEach((data: Record<string, any>, index: number) => {
    const baseRow = [
      data.trade_date,
      data.open || 'N/A',
      data.high || 'N/A',
      data.low || 'N/A',
      data.close || 'N/A',
      data.change || 'N/A',
      data.pct_chg || 'N/A',
      data.vol || 'N/A',
      formatAmountWan(data.amount),
      data.bond_value || 'N/A',
      data.bond_over_rate || 'N/A',
      data.cb_value || 'N/A',
      data.cb_over_rate || 'N/A'
    ];
    const indicatorRow = hasIndicators ? buildIndicatorRow(indicators, index) : [];
    const row = [...baseRow, ...indicatorRow];
    formattedData += `| ${row.join(' | ')} |\n`;
  });

  return formattedData;
}

export function formatOptionsData(params: FormatParams): string {
  const { stockData, indicators } = params;
  const hasIndicators = Object.keys(indicators).length > 0;
  const indicatorHeaders = hasIndicators ? buildIndicatorHeaders(indicators) : [];
  const baseHeaders = ['交易日期','交易所','昨结算','前收盘','开盘','最高','最低','收盘','结算','成交量(手)','成交金额(万元)','持仓量(手)'];
  const headers = [...baseHeaders, ...indicatorHeaders];

  let formattedData = `| ${headers.join(' | ')} |\n`;
  formattedData += `|${headers.map(() => '--------').join('|')}|\n`;

  stockData.forEach((data: Record<string, any>, index: number) => {
    const baseRow = [
      data.trade_date,
      data.exchange || 'N/A',
      data.pre_settle || 'N/A',
      data.pre_close || 'N/A',
      data.open || 'N/A',
      data.high || 'N/A',
      data.low || 'N/A',
      data.close || 'N/A',
      data.settle || 'N/A',
      data.vol || 'N/A',
      formatAmountWan(data.amount),
      data.oi || 'N/A'
    ];
    const indicatorRow = hasIndicators ? buildIndicatorRow(indicators, index) : [];
    const row = [...baseRow, ...indicatorRow];
    formattedData += `| ${row.join(' | ')} |\n`;
  });

  return formattedData;
}

export function formatStockData(params: FormatParams): string {
  const { stockData, indicators } = params;

  if (stockData.length === 0) return '';

  // 基础字段
  const coreFields = ['trade_date', 'open', 'close', 'high', 'low', 'vol', 'amount'];
  const availableFields = Object.keys(stockData[0]);
  const displayFields = coreFields.filter(field => availableFields.includes(field));

  // 生成字段名映射
  const fieldNameMap: Record<string, string> = {
    'trade_date': '交易日期',
    'open': '开盘',
    'close': '收盘',
    'high': '最高',
    'low': '最低',
    'vol': '成交量',
    'amount': '成交额'
  };
  fieldNameMap['amount'] = '成交额(万元)';

  // 如果有技术指标，添加技术指标列
  const indicatorHeaders: string[] = [];
  const hasIndicators = Object.keys(indicators).length > 0;

  if (hasIndicators) {
    indicatorHeaders.push(...buildIndicatorHeaders(indicators));
  }

  // 组合所有表头
  const allHeaders = [
    ...displayFields.map(field => field === 'amount' ? '成交额(万元)' : (fieldNameMap[field] || field)),
    ...indicatorHeaders
  ];
  let formattedData = `| ${allHeaders.join(' | ')} |\n`;
  formattedData += `|${allHeaders.map(() => '--------').join('|')}|\n`;

  // 生成数据行
  stockData.forEach((data: Record<string, any>, index: number) => {
    const basicRow = displayFields.map(field => {
      if (field === 'amount') return formatAmountWan(data.amount);
      return data[field] || 'N/A';
    });

    // 添加技术指标数据
    const indicatorRow = hasIndicators ? buildIndicatorRow(indicators, index) : [];

    const fullRow = [...basicRow, ...indicatorRow];
    formattedData += `| ${fullRow.join(' | ')} |\n`;
  });

  return formattedData;
}

export function formatCryptoData(params: FormatParams): string {
  const { stockData, indicators } = params;

  const fieldNameMap: Record<string, string> = {
    'trade_date': '交易日期',
    'open': '开盘',
    'close': '收盘',
    'high': '最高',
    'low': '最低',
    'vol': '成交量'
  };

  let formattedData = '';
  if (stockData.length > 0) {
    const coreFields = ['trade_date', 'open', 'close', 'high', 'low', 'vol'];
    const availableFields = Object.keys(stockData[0]);
    const displayFields = coreFields.filter(field => availableFields.includes(field));
    const indicatorHeaders: string[] = [];
    const hasIndicators = Object.keys(indicators).length > 0;

    if (hasIndicators) {
      indicatorHeaders.push(...buildIndicatorHeaders(indicators));
    }

    const allHeaders = [
      ...displayFields.map(field => fieldNameMap[field] || field),
      ...indicatorHeaders
    ];
    formattedData = `| ${allHeaders.join(' | ')} |\n`;
    formattedData += `|${allHeaders.map(() => '--------').join('|')}|\n`;

    stockData.forEach((data: Record<string, any>, index: number) => {
      const basicRow = displayFields.map(field => data[field] ?? 'N/A');
      const indicatorRow = hasIndicators ? buildIndicatorRow(indicators, index) : [];
      const fullRow = [...basicRow, ...indicatorRow];
      formattedData += `| ${fullRow.join(' | ')} |\n`;
    });
  }

  return formattedData;
}