import { EastMoneyApiAdapter } from '../adapters/eastmoneyApiAdapter.js';
import {
  formatBasicBalance,
  formatAllBalance
} from './companyPerformanceDetail/balanceFormatters.js';
import {
  formatBasicCashFlow,
  formatCashflowAll
} from './companyPerformanceDetail/cashflowFormatters.js';
import {
  formatBasicIncome,
  formatAllIncome
} from './companyPerformanceDetail/incomeFormatters.js';
import {
  formatIndicators
} from './companyPerformanceDetail/indicatorsFormatters.js';
import { formatForecast, formatExpress } from './companyPerformanceDetail/forecastExpressFormatters.js';
import { formatDividend } from './companyPerformanceDetail/dividendFormatters.js';
import { formatMainBusiness, formatMainBusinessCombined } from './companyPerformanceDetail/businessFormatters.js';
import { formatHolderNumber, formatHolderTrade } from './companyPerformanceDetail/holderFormatters.js';
import { formatGenericData } from './companyPerformanceDetail/genericFormatters.js';
import { formatAudit } from './companyPerformanceDetail/auditFormatters.js';
import { formatManagement } from './companyPerformanceDetail/managementFormatters.js';
import { formatCompanyBasic } from './companyPerformanceDetail/companyBasicFormatters.js';
import { formatShareFloat } from './companyPerformanceDetail/shareFloatFormatters.js';
import { formatRepurchase } from './companyPerformanceDetail/repurchaseFormatters.js';
import { formatTop10Holders, formatTop10FloatHolders } from './companyPerformanceDetail/top10HoldersFormatters.js';
import { formatPledgeStat, formatPledgeDetail } from './companyPerformanceDetail/pledgeFormatters.js';

export const companyPerformance = {
  name: "company_performance",
  description: "获取上市公司财务数据，基于东方财富API提供财务指标、公司基本信息、三大财务报表(资产负债表、现金流量表、利润表)、股东人数、龙虎榜数据、融资融券数据、大宗交易数据等",
  parameters: {
    type: "object",
    properties: {
      ts_code: {
        type: "string",
        description: "股票代码，如'000001.SZ'表示平安银行，'600000.SH'表示浦发银行"
      },
      data_type: {
        type: "string",
        description: "数据类型：indicators(财务指标)、company_basic(公司基本信息)、balance_basic(核心资产负债表)、balance_all(完整资产负债表)、cashflow_basic(基础现金流)、cashflow_all(完整现金流)、income_basic(核心利润表)、income_all(完整利润表)、forecast(业绩预告)、express(业绩快报)、dividend(分红送股)、mainbz(主营业务构成)、managers(管理层信息)、audit(审计意见)、holder_number(股东人数)、holder_trade(龙虎榜数据)、top10_holders(前十大股东)、top10_floatholders(前十大流通股东)、pledge_stat(股权质押统计)、pledge_detail(股权质押明细)、share_float(融资融券数据)、repurchase(大宗交易数据)。注：基于东方财富API实现，全面支持各类财务数据",
        enum: ["indicators", "company_basic", "balance_basic", "balance_all", "cashflow_basic", "cashflow_all", "income_basic", "income_all", "forecast", "express", "dividend", "mainbz", "managers", "audit", "holder_number", "holder_trade", "top10_holders", "top10_floatholders", "pledge_stat", "pledge_detail", "share_float", "repurchase"]
      },
      start_date: {
        type: "string",
        description: "起始日期，格式为YYYYMMDD，如'20230101'"
      },
      end_date: {
        type: "string",
        description: "结束日期，格式为YYYYMMDD，如'20231231'"
      },
      period: {
        type: "string",
        description: "特定报告期，格式为YYYYMMDD，如'20231231'表示2023年年报。指定此参数时将忽略start_date和end_date"
      }
    },
    required: ["ts_code", "data_type", "start_date", "end_date"]
  },
  async run(args: {
    ts_code: string;
    data_type: string;
    start_date: string;
    end_date: string;
    period?: string;
  }) {
    try {
      console.log('公司综合表现查询参数:', args);

      // 使用东方财富API适配器获取数据
      console.log('使用东方财富API数据源获取数据...');
      const adapter = new EastMoneyApiAdapter();

      const result = await adapter.fetchFinancialData(
        args.data_type,
        args.ts_code,
        args.period,
        args.start_date,
        args.end_date
      );

      // 准备结果数组
      const results = [{
        type: args.data_type,
        data: result.data,
        fields: result.fields
      }];

      // 如果没有获取到数据，添加提示信息
      if (!result.data || result.data.length === 0) {
        results[0] = {
          type: args.data_type,
          data: [],
          fields: result.fields
        };
      } else {
        console.log(`成功从东方财富API获取到${result.data.length}条数据`);
      }

      // 格式化输出
      const formattedOutput = formatFinancialData(results, args.ts_code);

      return {
        content: [{ type: "text", text: formattedOutput }]
      };

    } catch (error) {
      console.error('公司综合表现查询错误:', error);
      return {
        content: [{
          type: "text",
          text: `查询公司综合表现数据时发生错误: ${error instanceof Error ? error.message : '未知错误'}`
        }]
      };
    }
  }
};


// 格式化财务数据输出
function formatFinancialData(results: any[], tsCode: string): string {
  let output = `# 📊 ${tsCode} 公司财务表现分析\n\n`;

  const dataTypeNames: Record<string, string> = {
    forecast: '🔮 业绩预告',
    express: '⚡ 业绩快报',
    indicators: '📊 财务指标',
    dividend: '💵 分红送股',
    mainbz: '🏭 主营业务构成(融合版)',
    holder_number: '👥 股东人数',
    holder_trade: '📊 股东增减持',
    managers: '👔 管理层信息',
    audit: '🔍 财务审计意见',
    company_basic: '🏢 上市公司基本信息',
    balance_basic: '⚖️ 核心资产负债表',
    balance_all: '⚖️ 完整资产负债表',
    cashflow_basic: '💰 基础现金流量表',
    cashflow_all: '💰 完整现金流量表',
    income_basic: '💹 核心利润表',
    income_all: '💹 完整利润表',
    share_float: '🔓 限售股解禁',
    repurchase: '🔄 股票回购',
    top10_holders: '👥 前十大股东',
    top10_floatholders: '🌊 前十大流通股东',
    pledge_stat: '📊 股权质押统计',
    pledge_detail: '📋 股权质押明细'
  };

  for (const result of results) {
    const typeName = dataTypeNames[result.type] || result.type;
    output += `## ${typeName}\n\n`;

    if (result.error) {
      output += `❌ 获取失败: ${result.error}\n\n`;
      continue;
    }

    if (!result.data || result.data.length === 0) {
      output += `ℹ️ 暂无数据\n\n`;
      continue;
    }

    // 根据不同数据类型格式化输出
    switch (result.type) {
      case 'forecast':
        output += formatForecast(result.data);
        break;
      case 'express':
        output += formatExpress(result.data);
        break;
      case 'indicators':
        output += formatIndicators(result.data);
        break;
      case 'dividend':
        output += formatDividend(result.data);
        break;
      case 'mainbz':
        output += formatMainBusinessCombined(result.data);
        break;
      case 'holder_number':
        output += formatHolderNumber(result.data);
        break;
      case 'holder_trade':
        output += formatHolderTrade(result.data);
        break;
      case 'managers':
        output += formatManagement(result.data);
        break;
      case 'audit':
        output += formatAudit(result.data);
        break;
      case 'company_basic':
        output += formatCompanyBasic(result.data);
        break;
      case 'balance_basic':
        output += formatBasicBalance(result.data);
        break;
      case 'balance_all':
        output += formatAllBalance(result.data);
        break;
      case 'cashflow_basic':
        output += formatBasicCashFlow(result.data);
        break;
      case 'cashflow_all':
        output += formatCashflowAll(result.data);
        break;
      case 'income_basic':
        output += formatBasicIncome(result.data);
        break;
      case 'income_all':
        output += formatAllIncome(result.data);
        break;
      case 'share_float':
        output += formatShareFloat(result.data);
        break;
      case 'repurchase':
        output += formatRepurchase(result.data);
        break;
      case 'top10_holders':
        output += formatTop10Holders(result.data);
        break;
      case 'top10_floatholders':
        output += formatTop10FloatHolders(result.data);
        break;
      case 'pledge_stat':
        output += formatPledgeStat(result.data);
        break;
      case 'pledge_detail':
        output += formatPledgeDetail(result.data);
        break;
      default:
        output += formatGenericData(result.data, result.fields);
    }

    output += '\n---\n\n';
  }

  return output;
}









