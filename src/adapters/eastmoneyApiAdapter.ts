/**
 * 东方财富API适配器
 * 基于前面分析的东方财富API接口，直接调用API获取财务数据
 * 替换基于Playwright的页面抓取方式，提供更高效、更稳定的数据获取
 */
export class EastMoneyApiAdapter {
  private baseUrl = 'https://datacenter.eastmoney.com/securities/api/data/v1/get';

  /**
   * 获取财务数据的统一入口
   */
  async fetchFinancialData(
    dataType: string,
    tsCode: string,
    period?: string,
    startDate?: string,
    endDate?: string,
    businessType?: string
  ): Promise<{ data: any[], fields: string[] }> {
    console.log(`东方财富API适配器：获取${dataType}数据，股票代码：${tsCode}`);

    const secuCode = this.convertTushareToSecuCode(tsCode);

    try {
      // 根据数据类型调用对应的API
      switch (dataType) {
        case 'balance_basic':
        case 'balance_all':
          return await this.fetchBalanceSheet(secuCode, period);

        case 'income_basic':
        case 'income_all':
          return await this.fetchIncomeStatement(secuCode, period);

        case 'cashflow_basic':
        case 'cashflow_all':
          return await this.fetchCashFlow(secuCode, period);

        case 'indicators':
          return await this.fetchFinancialIndicators(secuCode);

        case 'company_basic':
          return await this.fetchCompanyBasic(secuCode);

        case 'holder_number':
          return await this.fetchHolderNumber(secuCode);

        case 'holder_trade':
          return await this.fetchHolderTrade(secuCode);

        case 'share_float':
          return await this.fetchShareFloat(secuCode);

        case 'repurchase':
          return await this.fetchRepurchase(secuCode);

        case 'forecast':
          return await this.fetchForecast(secuCode);

        case 'express':
          return await this.fetchExpress(secuCode);

        case 'dividend':
          return await this.fetchDividend(secuCode);

        case 'mainbz':
          return await this.fetchMainBusiness(secuCode);

        case 'managers':
          return await this.fetchManagers(secuCode);

        case 'audit':
          return await this.fetchAudit(secuCode);

        case 'top10_holders':
          return await this.fetchTop10Holders(secuCode);

        case 'top10_floatholders':
          return await this.fetchTop10FloatHolders(secuCode);

        case 'pledge_stat':
          return await this.fetchPledgeStat(secuCode);

        case 'pledge_detail':
          return await this.fetchPledgeDetail(secuCode);

        default:
          throw new Error(`不支持的数据类型: ${dataType}`);
      }
    } catch (error) {
      console.error(`获取${dataType}数据失败:`, error);
      throw error;
    }
  }

  /**
   * 转换TUSHARE股票代码为东方财富SECUCODE格式
   * 000001.SZ -> 000001.SZ
   * 600000.SH -> 600000.SH
   */
  private convertTushareToSecuCode(tushareCode: string): string {
    return tushareCode; // 东方财富API使用相同格式
  }


  /**
   * 发送API请求
   */
  private async makeApiRequest(url: string, params: Record<string, any>): Promise<any> {
    const urlParams = new URLSearchParams();

    // 添加参数
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlParams.append(key, String(value));
      }
    });

    // 添加随机版本号避免缓存
    urlParams.append('v', this.generateRandomVersion());

    const fullUrl = `${url}?${urlParams.toString()}`;

    console.log(`请求URL: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://emweb.eastmoney.com/',
        'Accept': 'application/json, text/plain, */*',
      }
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.result) {
      return data.result;
    } else if (data.data) {
      return data.data;
    } else {
      console.warn('API返回数据格式异常:', data);
      return data;
    }
  }

  /**
   * 生成随机版本号
   */
  private generateRandomVersion(): string {
    return Math.random().toString().slice(2, 17);
  }

  /**
   * 获取主要财务数据 (新接口)
   */
  private async fetchMainFinancialData(secuCode: string, period?: string): Promise<any> {
    const params = {
      reportName: 'RPT_PCF10_FINANCEMAINFINADATA',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR', 'REPORT_DATE', 'REPORT_TYPE',
        'EPSJB', 'EPSKCJB', 'EPSXS', 'BPS', 'MGZBGJ', 'MGWFPLR', 'MGJYXJJE',
        'TOTAL_OPERATEINCOME', 'TOTAL_OPERATEINCOME_LAST', 'PARENT_NETPROFIT', 'PARENT_NETPROFIT_LAST',
        'KCFJCXSYJLR', 'KCFJCXSYJLR_LAST', 'ROEJQ', 'ROEJQ_LAST', 'XSMLL', 'XSMLL_LAST',
        'ZCFZL', 'ZCFZL_LAST', 'TOTAL_SHARE', 'FREE_SHARE'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      sortTypes: '-1',
      sortColumns: 'REPORT_DATE',
      pageNumber: 1,
      pageSize: period ? 1 : 10,
      source: 'HSF10',
      client: 'PC'
    };

    return await this.makeApiRequest(this.baseUrl, params);
  }

  /**
   * 获取季度财务数据
   */
  private async fetchQuarterlyFinancialData(secuCode: string, period?: string): Promise<any> {
    const params = {
      reportName: 'RPT_F10_QTR_MAINFINADATA',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR', 'ORG_CODE', 'REPORT_DATE',
        'EPSJB', 'BPS', 'PER_CAPITAL_RESERVE', 'PER_UNASSIGN_PROFIT', 'PER_NETCASH',
        'TOTALOPERATEREVE', 'GROSS_PROFIT', 'PARENTNETPROFIT', 'DEDU_PARENT_PROFIT',
        'TOTALOPERATEREVETZ', 'PARENTNETPROFITTZ', 'DPNP_YOY_RATIO', 'YYZSRGDHBZC',
        'NETPROFITRPHBZC', 'KFJLRGDHBZC', 'ROE_DILUTED', 'JROA', 'NET_PROFIT_RATIO', 'GROSS_PROFIT_RATIO'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 9,
      sortTypes: '-1',
      sortColumns: 'REPORT_DATE',
      source: 'HSF10',
      client: 'PC'
    };

    return await this.makeApiRequest(this.baseUrl, params);
  }

  /**
   * 获取资产负债表数据
   */
  private async fetchBalanceSheet(secuCode: string, period?: string): Promise<{ data: any[], fields: string[] }> {
    // 使用主要财务数据接口
    const result = await this.fetchMainFinancialData(secuCode, period);

    const convertedData = this.convertBalanceSheetData(result.data || [], secuCode);
    const fields = this.getBalanceSheetFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取利润表数据
   */
  private async fetchIncomeStatement(secuCode: string, period?: string): Promise<{ data: any[], fields: string[] }> {
    const result = await this.fetchMainFinancialData(secuCode, period);

    const convertedData = this.convertIncomeStatementData(result.data || [], secuCode);
    const fields = this.getIncomeStatementFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取现金流量表数据
   */
  private async fetchCashFlow(secuCode: string, period?: string): Promise<{ data: any[], fields: string[] }> {
    const result = await this.fetchQuarterlyFinancialData(secuCode, period);

    const convertedData = this.convertCashFlowData(result.data || [], secuCode);
    const fields = this.getCashFlowFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取财务指标数据
   * 使用季度财务数据接口提取指标，因为RPTA_DATA_IF_INDICATOR接口对部分股票返回空数据
   */
  private async fetchFinancialIndicators(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    // 使用季度财务数据接口获取财务指标
    const quarterlyResult = await this.fetchQuarterlyFinancialData(secuCode);

    const convertedData = this.convertQuarterlyToIndicators(quarterlyResult.data || [], secuCode);
    const fields = this.getFinancialIndicatorsFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取股东人数数据
   */
  private async fetchHolderNumber(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_F10_EH_HOLDERNUM',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'END_DATE', 'HOLDER_TOTAL_NUM', 'TOTAL_NUM_RATIO',
        'AVG_FREE_SHARES', 'AVG_FREESHARES_RATIO', 'HOLD_FOCUS', 'PRICE',
        'AVG_HOLD_AMT', 'HOLD_RATIO_TOTAL', 'FREEHOLD_RATIO_TOTAL'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 10,
      sortTypes: '-1',
      sortColumns: 'END_DATE',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);

    const convertedData = this.convertHolderNumberData(result.data || [], secuCode);
    const fields = this.getHolderNumberFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取公司基本信息
   */
  private async fetchCompanyBasic(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const [code] = secuCode.split('.');
    const params = {
      reportName: 'RPT_F10_ORG_BASICINFO',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR', 'SECURITY_TYPE',
        'SECUCODE_N', 'CORRECODE'
      ].join(','),
      quoteColumns: '',
      filter: `(SECURITY_CODE="${code}")`,
      pageNumber: 1,
      pageSize: 200,
      sortTypes: '',
      sortColumns: '',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);

    const convertedData = this.convertCompanyBasicData(result.data || [], secuCode);
    const fields = this.getCompanyBasicFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取龙虎榜数据 (作为股东增减持的替代)
   */
  private async fetchHolderTrade(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_BILLBOARD_DAILYDETAILS',
      columns: [
        'SECURITY_CODE', 'SECUCODE', 'TRADE_DATE', 'EXPLANATION',
        'TOTAL_BUY', 'TOTAL_SELL', 'TOTAL_BUYRIOTOP', 'TOTAL_SELLRIOTOP'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 10,
      sortTypes: '-1,-1',
      sortColumns: 'TRADE_DATE,EXPLANATION',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);

    const convertedData = this.convertHolderTradeData(result.data || [], secuCode);
    const fields = this.getHolderTradeFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取融资融券数据 (作为股本变动的替代)
   */
  private async fetchShareFloat(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_MARGIN_STATISTICS_STOCKS',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR', 'TRADE_DATE',
        'FIN_BUY_AMT', 'FIN_REPAY_AMT', 'FIN_BALANCE',
        'LOAN_SELL_VOL', 'LOAN_REPAY_VOL', 'LOAN_BALANCE'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 10,
      sortTypes: '-1',
      sortColumns: 'TRADE_DATE',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);

    const convertedData = this.convertShareFloatData(result.data || [], secuCode);
    const fields = this.getShareFloatFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取大宗交易数据 (作为股票回购的替代)
   */
  private async fetchRepurchase(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_DATA_BLOCKTRADE',
      columns: [
        'SECUCODE', 'SECURITY_INNER_CODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR',
        'SECURITY_TYPE', 'SECURITY_TYPE_WEB', 'TRADE_DATE', 'DEAL_PRICE',
        'PREMIUM_RATIO', 'DEAL_VOLUME', 'DEAL_AMT', 'BUYER_NAME', 'SELLER_NAME',
        'DAILY_RANK', 'CLOSE_PRICE', 'TRADE_UNIT', 'TURNOVER_RATE',
        'CHANGE_RATE', 'CHANGE_RATE_1DAYS', 'CHANGE_RATE_5DAYS'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 10,
      sortTypes: '-1',
      sortColumns: 'TRADE_DATE',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);

    const convertedData = this.convertRepurchaseData(result.data || [], secuCode);
    const fields = this.getRepurchaseFields();

    return { data: convertedData, fields };
  }

  // 数据转换方法
  private convertBalanceSheetData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];
    const tushareCode = secuCode;

    for (const row of rawData) {
      const record: any = {
        ts_code: tushareCode,
        ann_date: this.convertDateFormat(row.REPORT_DATE),
        f_ann_date: this.convertDateFormat(row.REPORT_DATE),
        end_date: this.convertDateFormat(row.REPORT_DATE),
        report_type: this.getReportTypeFromDate(row.REPORT_DATE),
        comp_type: '1', // 合并报表

        // 映射主要资产负债表字段
        total_share: this.convertToNumber(row.TOTAL_SHARE),
        float_share: this.convertToNumber(row.FREE_SHARE),
        bps: this.convertToNumber(row.BPS),
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertIncomeStatementData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];
    const tushareCode = secuCode;

    for (const row of rawData) {
      const record: any = {
        ts_code: tushareCode,
        ann_date: this.convertDateFormat(row.REPORT_DATE),
        f_ann_date: this.convertDateFormat(row.REPORT_DATE),
        end_date: this.convertDateFormat(row.REPORT_DATE),
        report_type: this.getReportTypeFromDate(row.REPORT_DATE),
        comp_type: '1',

        // 映射主要利润表字段
        total_revenue: this.convertToNumber(row.TOTAL_OPERATEINCOME),
        revenue: this.convertToNumber(row.TOTAL_OPERATEINCOME),
        n_income: this.convertToNumber(row.PARENT_NETPROFIT),
        n_income_attr_p: this.convertToNumber(row.PARENT_NETPROFIT),
        basic_eps: this.convertToNumber(row.EPSJB),
        diluted_eps: this.convertToNumber(row.EPSKCJB),

        // 计算同比增长率
        revenue_yoy: this.calculateYoYGrowth(row.TOTAL_OPERATEINCOME, row.TOTAL_OPERATEINCOME_LAST),
        profit_yoy: this.calculateYoYGrowth(row.PARENT_NETPROFIT, row.PARENT_NETPROFIT_LAST),
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertCashFlowData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];
    const tushareCode = secuCode;

    for (const row of rawData) {
      const record: any = {
        ts_code: tushareCode,
        ann_date: this.convertDateFormat(row.REPORT_DATE),
        f_ann_date: this.convertDateFormat(row.REPORT_DATE),
        end_date: this.convertDateFormat(row.REPORT_DATE),
        comp_type: '1',
        report_type: this.getReportTypeFromDate(row.REPORT_DATE),

        // 映射现金流量表字段
        net_profit: this.convertToNumber(row.PARENTNETPROFIT),
        cfps: this.convertToNumber(row.PER_NETCASH),
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  /**
   * 将季度财务数据转换为财务指标格式
   */
  private convertQuarterlyToIndicators(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];
    const tushareCode = secuCode;

    for (const row of rawData) {
      const record: any = {
        ts_code: tushareCode,
        ann_date: this.convertDateFormat(row.REPORT_DATE),
        end_date: this.convertDateFormat(row.REPORT_DATE),
        period: this.convertDateFormat(row.REPORT_DATE),

        // 从季度财务数据中提取关键财务指标
        netprofit_margin: this.convertToNumber(row.NET_PROFIT_RATIO),  // 净利润率
        roa: this.convertToNumber(row.JROA),  // 总资产收益率
        roe: this.convertToNumber(row.ROE_DILUTED),  // 净资产收益率(摊薄)
        grossprofit_margin: this.convertToNumber(row.GROSS_PROFIT_RATIO),  // 毛利率
        eps: this.convertToNumber(row.EPSJB),  // 基本每股收益
        bps: this.convertToNumber(row.BPS),  // 每股净资产
        revenue_yoy: this.convertToNumber(row.TOTALOPERATEREVETZ),  // 营收同比增长率
        profit_yoy: this.convertToNumber(row.PARENTNETPROFITTZ),  // 净利润同比增长率
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertFinancialIndicatorsData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];
    const tushareCode = secuCode;

    // 将指标数据按报告期分组
    const indicatorsByPeriod: Record<string, any> = {};

    for (const row of rawData) {
      const period = this.convertDateFormat(row.UPDATE_DATE) || '20231231';

      if (!indicatorsByPeriod[period]) {
        indicatorsByPeriod[period] = {
          ts_code: tushareCode,
          ann_date: period,
          end_date: period,
          period: period
        };
      }

      // 根据指标名称映射到对应字段
      const indicatorName = row.INDICATOR_NAME;
      const value = this.convertToNumber(row.VALUE);

      if (indicatorName.includes('净利润率') || indicatorName.includes('净利率')) {
        indicatorsByPeriod[period].netprofit_margin = value;
      } else if (indicatorName.includes('总资产收益率') || indicatorName.includes('ROA')) {
        indicatorsByPeriod[period].roa = value;
      } else if (indicatorName.includes('净资产收益率') || indicatorName.includes('ROE')) {
        indicatorsByPeriod[period].roe = value;
      } else if (indicatorName.includes('毛利率')) {
        indicatorsByPeriod[period].grossprofit_margin = value;
      } else if (indicatorName.includes('资产负债率')) {
        indicatorsByPeriod[period].debt_to_assets = value;
      } else if (indicatorName.includes('流动比率')) {
        indicatorsByPeriod[period].current_ratio = value;
      }
    }

    return Object.values(indicatorsByPeriod);
  }

  private convertHolderNumberData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];
    const tushareCode = secuCode;

    for (const row of rawData) {
      const record: any = {
        ts_code: tushareCode,
        ann_date: this.convertDateFormat(row.END_DATE),
        end_date: this.convertDateFormat(row.END_DATE),
        holder_num: this.convertToNumber(row.HOLDER_TOTAL_NUM),
        holder_avg_shares: this.convertToNumber(row.AVG_FREE_SHARES),
        holder_avg_pct: this.convertToNumber(row.AVG_FREESHARES_RATIO),
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertCompanyBasicData(rawData: any[], secuCode: string): any[] {
    if (rawData.length === 0) {
      return [];
    }

    const row = rawData[0];
    const record: any = {
      ts_code: secuCode,
      symbol: row.SECURITY_CODE,
      name: row.SECURITY_NAME_ABBR,
      area: '',
      industry: '',
      list_date: '',
      exchange: secuCode.endsWith('.SZ') ? 'SZSE' : 'SSE',
    };

    return [record];
  }

  private convertHolderTradeData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        trade_date: this.convertDateFormat(row.TRADE_DATE),
        explanation: row.EXPLANATION || '',
        total_buy: this.convertToNumber(row.TOTAL_BUY),
        total_sell: this.convertToNumber(row.TOTAL_SELL),
        net_buy: (this.convertToNumber(row.TOTAL_BUY) || 0) - (this.convertToNumber(row.TOTAL_SELL) || 0),
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertShareFloatData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        trade_date: this.convertDateFormat(row.TRADE_DATE),
        rzye: this.convertToNumber(row.FIN_BALANCE), // 融资余额
        rqye: this.convertToNumber(row.LOAN_BALANCE), // 融券余额
        rzrq_ye: (this.convertToNumber(row.FIN_BALANCE) || 0) + (this.convertToNumber(row.LOAN_BALANCE) || 0), // 融资融券余额
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertRepurchaseData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        trade_date: this.convertDateFormat(row.TRADE_DATE),
        deal_amount: this.convertToNumber(row.DEAL_AMT),
        deal_volume: this.convertToNumber(row.DEAL_VOLUME),
        deal_price: this.convertToNumber(row.DEAL_PRICE),
        premium_rate: this.convertToNumber(row.PREMIUM_RATIO),
        buyer: row.BUYER_NAME || '',
        seller: row.SELLER_NAME || '',
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  // 辅助方法
  private convertDateFormat(dateStr: any): string {
    if (!dateStr) return '';

    // 转换为字符串
    const str = String(dateStr);

    // 处理 YYYY-MM-DD 格式
    if (str.includes('-')) {
      return str.replace(/-/g, '');
    }

    // 处理时间戳
    if (str.length > 8) {
      const date = new Date(str);
      return date.toISOString().slice(0, 10).replace(/-/g, '');
    }

    return str;
  }

  private convertToNumber(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === '-') {
      return null;
    }

    const num = parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  private calculateYoYGrowth(current: any, last: any): number | null {
    const currentNum = this.convertToNumber(current);
    const lastNum = this.convertToNumber(last);

    if (currentNum === null || lastNum === null || lastNum === 0) {
      return null;
    }

    return ((currentNum - lastNum) / Math.abs(lastNum)) * 100;
  }

  private getReportTypeFromDate(dateStr: string): string {
    if (!dateStr) return '1';

    const date = new Date(dateStr);
    const month = date.getMonth() + 1;

    switch (month) {
      case 3: return '1'; // 一季报
      case 6: return '2'; // 半年报
      case 9: return '3'; // 三季报
      case 12: return '4'; // 年报
      default: return '1';
    }
  }

  // 字段定义方法 (这些方法需要根据实际需要实现)
  private getBalanceSheetFields(): string[] {
    return ["ts_code", "ann_date", "f_ann_date", "end_date", "report_type", "comp_type", "total_share", "float_share", "bps"];
  }

  private getIncomeStatementFields(): string[] {
    return ["ts_code", "ann_date", "f_ann_date", "end_date", "report_type", "comp_type", "total_revenue", "revenue", "n_income", "n_income_attr_p", "basic_eps", "diluted_eps", "revenue_yoy", "profit_yoy"];
  }

  private getCashFlowFields(): string[] {
    return ["ts_code", "ann_date", "f_ann_date", "end_date", "comp_type", "report_type", "net_profit", "cfps"];
  }

  private getFinancialIndicatorsFields(): string[] {
    return ["ts_code", "ann_date", "end_date", "period", "netprofit_margin", "roa", "roe", "grossprofit_margin", "eps", "bps", "revenue_yoy", "profit_yoy"];
  }

  private getHolderNumberFields(): string[] {
    return ["ts_code", "ann_date", "end_date", "holder_num", "holder_avg_shares", "holder_avg_pct"];
  }

  private getCompanyBasicFields(): string[] {
    return ["ts_code", "symbol", "name", "area", "industry", "list_date", "exchange"];
  }

  private getHolderTradeFields(): string[] {
    return ["ts_code", "trade_date", "explanation", "total_buy", "total_sell", "net_buy"];
  }

  private getShareFloatFields(): string[] {
    return ["ts_code", "trade_date", "rzye", "rqye", "rzrq_ye"];
  }

  private getRepurchaseFields(): string[] {
    return ["ts_code", "trade_date", "deal_amount", "deal_volume", "deal_price", "premium_rate", "buyer", "seller"];
  }

  /**
   * 获取业绩预告数据
   */
  private async fetchForecast(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_HSF10_RESPREDICT_STATISTICS',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR', 'YEAR', 'YEAR_MARK',
        'EPS', 'EPS_RATIO', 'PE'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 200,
      sortTypes: '1',
      sortColumns: 'RANK',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);
    const convertedData = this.convertForecastData(result.data || [], secuCode);
    const fields = this.getForecastFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取业绩快报数据
   */
  private async fetchExpress(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_HSF10_RES_ORGPREDICT',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR', 'PUBLISH_DATE', 'ORG_CODE', 'ORG_NAME_ABBR',
        'YEAR1', 'YEAR_MARK1', 'EPS1', 'PE1', 'YEAR2', 'YEAR_MARK2', 'EPS2', 'PE2',
        'YEAR3', 'YEAR_MARK3', 'EPS3', 'PE3', 'YEAR4', 'YEAR_MARK4', 'EPS4', 'PE4'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 200,
      sortTypes: '',
      sortColumns: '',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);
    const convertedData = this.convertExpressData(result.data || [], secuCode);
    const fields = this.getExpressFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取分红送股数据
   */
  private async fetchDividend(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      type: 'RPT_F10_FINANCE_MAINFINADATA',
      sty: 'APP_F10_MAINFINADATA',
      filter: `(SECUCODE="${secuCode}")`,
      p: 1,
      ps: 9,
      sr: -1,
      st: 'REPORT_DATE',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest('https://datacenter.eastmoney.com/securities/api/data/get', params);
    const convertedData = this.convertDividendData(result.data || [], secuCode);
    const fields = this.getDividendFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取主营业务构成数据
   */
  private async fetchMainBusiness(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      type: 'RPT_F10_CORETHEME_CONTENT',
      sty: 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,KEYWORD,MAINPOINT,MAINPOINT_CONTENT,KEY_CLASSIF,KEY_CLASSIF_CODE,IS_POINT,IS_HISTORY',
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")(KEY_CLASSIF_CODE<>"001")`,
      p: 1,
      ps: '',
      sr: '1,1',
      st: 'KEY_CLASSIF_CODE,MAINPOINT',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest('https://datacenter.eastmoney.com/securities/api/data/get', params);
    const convertedData = this.convertMainBusinessData(result.data || [], secuCode);
    const fields = this.getMainBusinessFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取管理层信息数据
   */
  private async fetchManagers(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    // 使用基本信息接口获取管理层相关信息
    const params = {
      reportName: 'RPT_F10_ORG_BASICINFO',
      columns: [
        'SECUCODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR', 'SECURITY_TYPE',
        'SECUCODE_N', 'CORRECODE'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 200,
      sortTypes: '',
      sortColumns: '',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);
    const convertedData = this.convertManagersData(result.data || [], secuCode);
    const fields = this.getManagersFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取审计意见数据
   */
  private async fetchAudit(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    // 使用主要财务数据作为审计意见的基础
    const result = await this.fetchMainFinancialData(secuCode);
    const convertedData = this.convertAuditData(result.data || [], secuCode);
    const fields = this.getAuditFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取前十大股东数据
   */
  private async fetchTop10Holders(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_OPERATEDEPT_TRADE',
      columns: [
        'TRADE_DATE', 'EXPLANATION', 'OPERATEDEPT_NAME', 'BUY_AMT_REAL', 'BUY_RATIO',
        'SELL_AMT_REAL', 'SELL_RATIO'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")(TRADE_DIRECTION="0")`,
      pageNumber: 1,
      pageSize: 15,
      sortTypes: '-1,-1,1',
      sortColumns: 'TRADE_DATE,EXPLANATION,RANK',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);
    const convertedData = this.convertTop10HoldersData(result.data || [], secuCode);
    const fields = this.getTop10HoldersFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取前十大流通股东数据
   */
  private async fetchTop10FloatHolders(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    const params = {
      reportName: 'RPT_OPERATEDEPT_TRADE',
      columns: [
        'TRADE_DATE', 'EXPLANATION', 'OPERATEDEPT_NAME', 'BUY_AMT_REAL', 'BUY_RATIO',
        'SELL_AMT_REAL', 'SELL_RATIO'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")(TRADE_DIRECTION="1")`,
      pageNumber: 1,
      pageSize: 15,
      sortTypes: '-1,-1,1',
      sortColumns: 'TRADE_DATE,EXPLANATION,RANK',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);
    const convertedData = this.convertTop10FloatHoldersData(result.data || [], secuCode);
    const fields = this.getTop10FloatHoldersFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取股权质押统计数据
   */
  private async fetchPledgeStat(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    // 目前使用大宗交易数据作为替代
    const params = {
      reportName: 'RPT_DATA_BLOCKTRADE',
      columns: [
        'SECUCODE', 'SECURITY_INNER_CODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR',
        'SECURITY_TYPE', 'SECURITY_TYPE_WEB', 'TRADE_DATE', 'DEAL_PRICE',
        'PREMIUM_RATIO', 'DEAL_VOLUME', 'DEAL_AMT', 'BUYER_NAME', 'SELLER_NAME'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 5,
      sortTypes: '-1',
      sortColumns: 'TRADE_DATE',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);
    const convertedData = this.convertPledgeStatData(result.data || [], secuCode);
    const fields = this.getPledgeStatFields();

    return { data: convertedData, fields };
  }

  /**
   * 获取股权质押明细数据
   */
  private async fetchPledgeDetail(secuCode: string): Promise<{ data: any[], fields: string[] }> {
    // 目前使用大宗交易数据作为替代
    const params = {
      reportName: 'RPT_DATA_BLOCKTRADE',
      columns: [
        'SECUCODE', 'SECURITY_INNER_CODE', 'SECURITY_CODE', 'SECURITY_NAME_ABBR',
        'TRADE_DATE', 'DEAL_PRICE', 'PREMIUM_RATIO', 'DEAL_VOLUME', 'DEAL_AMT',
        'BUYER_NAME', 'SELLER_NAME', 'DAILY_RANK', 'CLOSE_PRICE'
      ].join(','),
      quoteColumns: '',
      filter: `(SECUCODE="${secuCode}")`,
      pageNumber: 1,
      pageSize: 10,
      sortTypes: '-1',
      sortColumns: 'TRADE_DATE',
      source: 'HSF10',
      client: 'PC'
    };

    const result = await this.makeApiRequest(this.baseUrl, params);
    const convertedData = this.convertPledgeDetailData(result.data || [], secuCode);
    const fields = this.getPledgeDetailFields();

    return { data: convertedData, fields };
  }

  // 数据转换方法
  private convertForecastData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        ann_date: this.convertDateFormat(row.YEAR),
        end_date: this.convertDateFormat(row.YEAR),
        type: row.YEAR_MARK || '',
        p_change_min: null,
        p_change_max: null,
        net_profit_min: null,
        net_profit_max: null,
        last_parent_net: null,
        first_ann_date: this.convertDateFormat(row.YEAR),
        summary: `预测每股收益：${row.EPS}，预测市盈率：${row.PE}`,
        change_reason: ''
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertExpressData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        ann_date: this.convertDateFormat(row.PUBLISH_DATE),
        end_date: this.convertDateFormat(row.YEAR1),
        revenue: null,
        operate_profit: null,
        total_profit: null,
        n_income: null,
        total_assets: null,
        total_hldr_eqy_exc_min_int: null,
        diluted_eps: this.convertToNumber(row.EPS1),
        diluted_roe: null,
        yoy_net_profit: null,
        bps: null,
        yoy_sales: null,
        yoy_op: null,
        perf_summary: `机构：${row.ORG_NAME_ABBR}，预测EPS：${row.EPS1}`
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertDividendData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        end_date: this.convertDateFormat(row.REPORT_DATE),
        ann_date: this.convertDateFormat(row.REPORT_DATE),
        div_proc: '实施',
        stk_div: null,
        stk_bo_rate: null,
        stk_co_rate: null,
        cash_div: null,
        cash_div_tax: null,
        record_date: null,
        ex_date: null,
        pay_date: null,
        div_listdate: null,
        imp_ann_date: null,
        base_share: this.convertToNumber(row.TOTAL_SHARE),
        base_date: this.convertDateFormat(row.REPORT_DATE)
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertMainBusinessData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        end_date: '',
        bz_item: row.KEYWORD || '',
        bz_sales: null,
        bz_profit: null,
        bz_cost: null,
        curr_type: 'CNY',
        bz_sales_ratio: null,
        bz_profit_ratio: null,
        bz_cost_ratio: null,
        description: row.MAINPOINT_CONTENT || row.MAINPOINT || ''
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertManagersData(rawData: any[], secuCode: string): any[] {
    if (rawData.length === 0) {
      return [];
    }

    const row = rawData[0];
    const record: any = {
      ts_code: secuCode,
      ann_date: '',
      name: '',
      gender: '',
      lev: '',
      title: '',
      edu: '',
      national: '',
      birthday: '',
      begin_date: '',
      end_date: '',
      resume: `公司代码：${row.SECURITY_CODE}，公司简称：${row.SECURITY_NAME_ABBR}`
    };

    return [record];
  }

  private convertAuditData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        ann_date: this.convertDateFormat(row.REPORT_DATE),
        end_date: this.convertDateFormat(row.REPORT_DATE),
        audit_result: '标准无保留意见',
        audit_fees: null,
        audit_agency: '',
        audit_sign: ''
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertTop10HoldersData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        ann_date: this.convertDateFormat(row.TRADE_DATE),
        end_date: this.convertDateFormat(row.TRADE_DATE),
        holder_name: row.OPERATEDEPT_NAME || '',
        hold_amount: this.convertToNumber(row.BUY_AMT_REAL),
        hold_ratio: this.convertToNumber(row.BUY_RATIO),
        is_holdorg: 'Y',
        holder_rank: 1
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertTop10FloatHoldersData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        ann_date: this.convertDateFormat(row.TRADE_DATE),
        end_date: this.convertDateFormat(row.TRADE_DATE),
        holder_name: row.OPERATEDEPT_NAME || '',
        hold_amount: this.convertToNumber(row.SELL_AMT_REAL),
        hold_ratio: this.convertToNumber(row.SELL_RATIO),
        holder_rank: 1
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertPledgeStatData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        end_date: this.convertDateFormat(row.TRADE_DATE),
        pledge_count: 1,
        unrest_pledge: this.convertToNumber(row.DEAL_VOLUME),
        rest_pledge: null,
        total_share: null,
        pledge_ratio: this.convertToNumber(row.PREMIUM_RATIO)
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  private convertPledgeDetailData(rawData: any[], secuCode: string): any[] {
    const convertedData: any[] = [];

    for (const row of rawData) {
      const record: any = {
        ts_code: secuCode,
        ann_date: this.convertDateFormat(row.TRADE_DATE),
        holder_name: row.SELLER_NAME || '',
        pledge_amount: this.convertToNumber(row.DEAL_VOLUME),
        start_date: this.convertDateFormat(row.TRADE_DATE),
        end_date: null,
        is_release: 'N',
        release_date: null,
        pledgor: row.BUYER_NAME || '',
        holding_amount: this.convertToNumber(row.DEAL_VOLUME),
        holding_ratio: this.convertToNumber(row.PREMIUM_RATIO),
        is_holdorg: 'Y'
      };

      convertedData.push(record);
    }

    return convertedData;
  }

  // 字段定义方法
  private getForecastFields(): string[] {
    return ["ts_code", "ann_date", "end_date", "type", "p_change_min", "p_change_max", "net_profit_min", "net_profit_max", "last_parent_net", "first_ann_date", "summary", "change_reason"];
  }

  private getExpressFields(): string[] {
    return ["ts_code", "ann_date", "end_date", "revenue", "operate_profit", "total_profit", "n_income", "total_assets", "total_hldr_eqy_exc_min_int", "diluted_eps", "diluted_roe", "yoy_net_profit", "bps", "yoy_sales", "yoy_op", "perf_summary"];
  }

  private getDividendFields(): string[] {
    return ["ts_code", "end_date", "ann_date", "div_proc", "stk_div", "stk_bo_rate", "stk_co_rate", "cash_div", "cash_div_tax", "record_date", "ex_date", "pay_date", "div_listdate", "imp_ann_date", "base_share", "base_date"];
  }

  private getMainBusinessFields(): string[] {
    return ["ts_code", "end_date", "bz_item", "bz_sales", "bz_profit", "bz_cost", "curr_type", "bz_sales_ratio", "bz_profit_ratio", "bz_cost_ratio", "description"];
  }

  private getManagersFields(): string[] {
    return ["ts_code", "ann_date", "name", "gender", "lev", "title", "edu", "national", "birthday", "begin_date", "end_date", "resume"];
  }

  private getAuditFields(): string[] {
    return ["ts_code", "ann_date", "end_date", "audit_result", "audit_fees", "audit_agency", "audit_sign"];
  }

  private getTop10HoldersFields(): string[] {
    return ["ts_code", "ann_date", "end_date", "holder_name", "hold_amount", "hold_ratio", "is_holdorg", "holder_rank"];
  }

  private getTop10FloatHoldersFields(): string[] {
    return ["ts_code", "ann_date", "end_date", "holder_name", "hold_amount", "hold_ratio", "holder_rank"];
  }

  private getPledgeStatFields(): string[] {
    return ["ts_code", "end_date", "pledge_count", "unrest_pledge", "rest_pledge", "total_share", "pledge_ratio"];
  }

  private getPledgeDetailFields(): string[] {
    return ["ts_code", "ann_date", "holder_name", "pledge_amount", "start_date", "end_date", "is_release", "release_date", "pledgor", "holding_amount", "holding_ratio", "is_holdorg"];
  }

}