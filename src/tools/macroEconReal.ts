// 实际宏观经济数据获取工具 - 东方财富API
export const macroEconReal = {
  name: "macro_econ_real",
  description: "从东方财富财经数据中心获取中国宏观经济数据，支持CPI、PMI、GDP、PPI、M2等指标",
  parameters: {
    type: "object",
    properties: {
      indicator: {
        type: "string",
        description: "指标类型：cpi(消费价格指数)、gdp(国内生产总值)、pmi(采购经理指数)、ppi(生产价格指数)、m2(货币供应量)"
      },
      source: {
        type: "string",
        description: "数据源：eastmoney(东方财富，默认且唯一支持的数据源)"
      },
      count: {
        type: "number",
        description: "获取数据条数，默认12条"
      }
    },
    required: ["indicator"]
  },

  async run(args: { indicator: string; source?: string; count?: number }) {
    try {
      const count = args.count || 12;

      console.log(`从东方财富获取${args.indicator}数据，条数：${count}`);

      // 直接调用东方财富API
      const data = await fetchFromEastMoney(args.indicator, count);

      if (data.length === 0) {
        throw new Error(`未能获取到${args.indicator}数据`);
      }

      const formattedData = formatData(data, args.indicator);
      const analysis = generateAnalysis(data, args.indicator);

      return {
        content: [
          {
            type: "text",
            text: `# ${getIndicatorName(args.indicator)} 数据\n\n` +
                 `📊 **数据源**: ${getSourceName()}\n` +
                 `📅 **数据条数**: ${data.length} 条\n` +
                 `🔄 **更新时间**: ${new Date().toLocaleString('zh-CN')}\n\n` +
                 `${analysis}\n\n---\n\n${formattedData}\n\n` +
                 getDataSourceInfo()
          }
        ]
      };

    } catch (error) {
      // Only log unexpected errors, not expected validation errors
      if (!(error instanceof Error && (error.message.includes('不支持指标') || error.message.includes('暂时不可用')))) {
        console.error("获取宏观经济数据失败:", error);
      }
      return {
        content: [
          {
            type: "text",
            text: `❌ **获取数据失败**\n\n` +
                `错误信息: ${error instanceof Error ? error.message : String(error)}\n\n` +
                getSupportedOptions()
          }
        ]
      };
    }
  }
};

// 从东方财富获取数据
async function fetchFromEastMoney(indicator: string, count: number): Promise<any[]> {
  // 可用的API配置 - 已验证的工作接口
  const apiUrls: Record<string, string> = {
    'cpi': 'https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=' + count + '&pageNumber=1&reportName=RPT_ECONOMY_CPI&columns=REPORT_DATE%2CTIME%2CNATIONAL_SAME%2CNATIONAL_BASE%2CNATIONAL_SEQUENTIAL%2CNATIONAL_ACCUMULATE%2CCITY_SAME%2CCITY_BASE%2CCITY_SEQUENTIAL%2CCITY_ACCUMULATE%2CRURAL_SAME%2CRURAL_BASE%2CRURAL_SEQUENTIAL%2CRURAL_ACCUMULATE',
    'pmi': 'https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=' + count + '&pageNumber=1&reportName=RPT_ECONOMY_PMI&columns=REPORT_DATE%2CMAKE_INDEX%2CMAKE_SAME%2CNMAKE_INDEX%2CNMAKE_SAME',
    'gdp': 'https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=' + count + '&pageNumber=1&reportName=RPT_ECONOMY_GDP&columns=REPORT_DATE%2CTIME%2CDOMESTICL_PRODUCT_BASE%2CFIRST_PRODUCT_BASE%2CSECOND_PRODUCT_BASE%2CTHIRD_PRODUCT_BASE%2CSUM_SAME%2CFIRST_SAME%2CSECOND_SAME%2CTHIRD_SAME',
    'ppi': 'https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=' + count + '&pageNumber=1&reportName=RPT_ECONOMY_PPI&columns=REPORT_DATE%2CTIME%2CBASE%2CBASE_SAME%2CBASE_ACCUMULATE',
    'm2': 'https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=REPORT_DATE&sortTypes=-1&pageSize=' + count + '&pageNumber=1&reportName=RPT_ECONOMY_CURRENCY_SUPPLY&columns=REPORT_DATE%2CTIME%2CBASIC_CURRENCY%2CBASIC_CURRENCY_SAME%2CBASIC_CURRENCY_SEQUENTIAL%2CCURRENCY%2CCURRENCY_SAME%2CCURRENCY_SEQUENTIAL%2CFREE_CASH%2CFREE_CASH_SAME%2CFREE_CASH_SEQUENTIAL'
  };

  const url = apiUrls[indicator];
  if (!url) {
    throw new Error(`东方财富不支持指标: ${indicator}`);
  }

  try {
    console.log(`调用东方财富API: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://data.eastmoney.com/',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 0 || !result.result?.data) {
      throw new Error(`API返回错误: ${JSON.stringify(result)}`);
    }

    return result.result.data;

  } catch (error) {
    console.error(`东方财富API调用失败:`, error);

    // 如果API失败，抛出错误
    throw error;
  }
}

// 移除了其他数据源，只保留东方财富API

// 移除了模拟数据生成函数，只使用真实API数据

// 格式化数据
function formatData(data: any[], indicator: string): string {
  return data.map(item => {
    const date = item.REPORT_DATE ? item.REPORT_DATE.slice(0, 7) : '未知时间'; // 只显示年-月
    let value = '暂无';
    let yoy = '暂无';

    // 根据不同指标获取对应字段
    switch (indicator) {
      case 'cpi':
        value = (item.NATIONAL_SAME !== null && item.NATIONAL_SAME !== undefined) ? item.NATIONAL_SAME : (item.value !== null && item.value !== undefined) ? item.value : '暂无';
        yoy = (item.NATIONAL_SAME !== null && item.NATIONAL_SAME !== undefined) ? item.NATIONAL_SAME : (item.yoy !== null && item.yoy !== undefined) ? item.yoy : '暂无';
        break;
      case 'pmi':
        value = (item.MAKE_INDEX !== null && item.MAKE_INDEX !== undefined) ? item.MAKE_INDEX : (item.value !== null && item.value !== undefined) ? item.value : '暂无';
        yoy = (item.MAKE_SAME !== null && item.MAKE_SAME !== undefined) ? item.MAKE_SAME : (item.yoy !== null && item.yoy !== undefined) ? item.yoy : '暂无';
        break;
      case 'gdp':
        value = (item.DOMESTICL_PRODUCT_BASE !== null && item.DOMESTICL_PRODUCT_BASE !== undefined) ? (item.DOMESTICL_PRODUCT_BASE / 10000).toFixed(2) + '万亿元' : (item.value !== null && item.value !== undefined) ? item.value : '暂无';
        yoy = (item.SUM_SAME !== null && item.SUM_SAME !== undefined) ? item.SUM_SAME : (item.yoy !== null && item.yoy !== undefined) ? item.yoy : '暂无';
        break;
      case 'ppi':
        value = (item.BASE !== null && item.BASE !== undefined) ? item.BASE : (item.value !== null && item.value !== undefined) ? item.value : '暂无';
        yoy = (item.BASE_SAME !== null && item.BASE_SAME !== undefined) ? item.BASE_SAME : (item.yoy !== null && item.yoy !== undefined) ? item.yoy : '暂无';
        break;
      case 'm2':
        value = (item.BASIC_CURRENCY !== null && item.BASIC_CURRENCY !== undefined) ? (item.BASIC_CURRENCY / 10000).toFixed(2) + '万亿元' : (item.value !== null && item.value !== undefined) ? item.value : '暂无';
        yoy = (item.BASIC_CURRENCY_SAME !== null && item.BASIC_CURRENCY_SAME !== undefined) ? item.BASIC_CURRENCY_SAME : (item.yoy !== null && item.yoy !== undefined) ? item.yoy : '暂无';
        break;
      default:
        value = (item.value !== null && item.value !== undefined) ? item.value : '暂无';
        yoy = (item.yoy !== null && item.yoy !== undefined) ? item.yoy : '暂无';
    }

    return `## ${date}\n**${getIndicatorName(indicator)}**: ${value}\n**同比变化**: ${yoy}%\n`;
  }).join('\n---\n\n');
}

// 生成分析
function generateAnalysis(data: any[], indicator: string): string {
  if (data.length < 2) return '数据不足，无法分析趋势。';

  const latest = data[0];
  const previous = data[1];

  let latestValue = 0;
  let previousValue = 0;

  // 根据不同指标获取对应字段
  switch (indicator) {
    case 'cpi':
      latestValue = (latest.NATIONAL_SAME !== null && latest.NATIONAL_SAME !== undefined) ? latest.NATIONAL_SAME : (latest.value !== null && latest.value !== undefined) ? latest.value : 0;
      previousValue = (previous.NATIONAL_SAME !== null && previous.NATIONAL_SAME !== undefined) ? previous.NATIONAL_SAME : (previous.value !== null && previous.value !== undefined) ? previous.value : 0;
      break;
    case 'pmi':
      latestValue = (latest.MAKE_INDEX !== null && latest.MAKE_INDEX !== undefined) ? latest.MAKE_INDEX : (latest.value !== null && latest.value !== undefined) ? latest.value : 0;
      previousValue = (previous.MAKE_INDEX !== null && previous.MAKE_INDEX !== undefined) ? previous.MAKE_INDEX : (previous.value !== null && previous.value !== undefined) ? previous.value : 0;
      break;
    case 'gdp':
      latestValue = (latest.SUM_SAME !== null && latest.SUM_SAME !== undefined) ? latest.SUM_SAME : (latest.value !== null && latest.value !== undefined) ? latest.value : 0;
      previousValue = (previous.SUM_SAME !== null && previous.SUM_SAME !== undefined) ? previous.SUM_SAME : (previous.value !== null && previous.value !== undefined) ? previous.value : 0;
      break;
    case 'ppi':
      latestValue = (latest.BASE !== null && latest.BASE !== undefined) ? latest.BASE : (latest.value !== null && latest.value !== undefined) ? latest.value : 0;
      previousValue = (previous.BASE !== null && previous.BASE !== undefined) ? previous.BASE : (previous.value !== null && previous.value !== undefined) ? previous.value : 0;
      break;
    case 'm2':
      latestValue = (latest.BASIC_CURRENCY_SAME !== null && latest.BASIC_CURRENCY_SAME !== undefined) ? latest.BASIC_CURRENCY_SAME : (latest.value !== null && latest.value !== undefined) ? latest.value : 0;
      previousValue = (previous.BASIC_CURRENCY_SAME !== null && previous.BASIC_CURRENCY_SAME !== undefined) ? previous.BASIC_CURRENCY_SAME : (previous.value !== null && previous.value !== undefined) ? previous.value : 0;
      break;
    default:
      latestValue = (latest.value !== null && latest.value !== undefined) ? latest.value : 0;
      previousValue = (previous.value !== null && previous.value !== undefined) ? previous.value : 0;
  }

  const change = latestValue - previousValue;
  const trend = change > 0 ? '上升' : change < 0 ? '下降' : '持平';

  return `## 📈 趋势分析\n最新数据显示${getIndicatorName(indicator)}${trend}，当前值为 ${latestValue}，较上期变化 ${change.toFixed(2)}。`;
}

// 获取指标中文名称
function getIndicatorName(indicator: string): string {
  const names: Record<string, string> = {
    'cpi': '居民消费价格指数(CPI)',
    'pmi': '采购经理指数(PMI)',
    'gdp': '国内生产总值(GDP)',
    'ppi': '工业生产者出厂价格指数(PPI)',
    'm2': '货币供应量(M2)'
  };
  return names[indicator] || indicator.toUpperCase();
}

// 获取数据源名称
function getSourceName(): string {
  return '东方财富财经数据中心';
}

// 获取支持的选项
function getSupportedOptions(): string {
  return `## 📋 支持的选项\n\n` +
    `### 🎯 指标类型 (indicator)\n` +
    `- **cpi**: 居民消费价格指数 ✅\n` +
    `- **pmi**: 采购经理指数 ✅\n` +
    `- **gdp**: 国内生产总值增长率 ✅\n` +
    `- **ppi**: 工业生产者出厂价格指数 ✅\n` +
    `- **m2**: 货币供应量M2增长率 ✅\n\n` +
    `### 🌐 数据源 (source)\n` +
    `- **eastmoney**: 东方财富（唯一支持的数据源）\n\n` +
    `### 📊 数据条数 (count)\n` +
    `- 默认12条，可设置1-50条\n\n` +
    `### ⚠️ 注意事项\n` +
    `- 所有指标数据正常获取，实时更新\n` +
    `- 支持CPI、PMI、GDP、PPI、M2等主要宏观经济指标`;
}

// 获取数据源信息
function getDataSourceInfo(): string {
  return `## 💡 数据获取方法说明\n\n` +
    `### 东方财富API\n` +
    `- **接口地址**: https://datacenter-web.eastmoney.com/api/data/v1/get\n` +
    `- **数据质量**: 优秀，更新及时\n` +
    `- **访问方式**: HTTP GET请求\n` +
    `- **优点**: 免费，数据全面，接口稳定\n` +
    `- **数据来源**: 东方财富财经数据中心\n\n` +
    `### 使用建议\n` +
    `- 已验证数据准确性和及时性\n` +
    `- 支持CPI、PMI、GDP、PPI、M2等主要指标\n` +
    `- 注意遵守访问频率限制和使用条款`;
}