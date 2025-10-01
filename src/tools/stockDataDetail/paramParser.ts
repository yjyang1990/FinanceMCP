// 技术指标参数解析器模块

export interface IndicatorParams {
  name: string;
  params: number[];
}

/**
 * 解析技术指标参数
 * @param indicator 指标字符串，例如 "macd(12,26,9)" 或 "rsi"
 * @returns 解析后的指标名称和参数
 */
export function parseIndicatorParams(indicator: string): IndicatorParams {
  const match = indicator.match(/^([a-zA-Z]+\d*)(\(([^)]+)\))?$/);
  if (!match) {
    throw new Error(`无效的技术指标格式: ${indicator}`);
  }
  
  const name = match[1].toLowerCase();
  const paramsStr = match[3];
  
  let params: number[] = [];
  if (paramsStr) {
    params = paramsStr.split(',').map(p => {
      const num = parseFloat(p.trim());
      if (isNaN(num)) {
        throw new Error(`技术指标${name}的参数必须是数字: ${p}`);
      }
      return num;
    });
  }
  
  return { name, params };
}

/**
 * 格式化指标参数用于显示
 * @param name 指标名称
 * @param params 参数数组
 * @returns 格式化的参数字符串
 */
export function formatIndicatorParams(name: string, params: number[]): string {
  return params.length > 0 ? `(${params.join(',')})` : '(默认)';
}

/**
 * 预处理技术指标数组，将多参数MA扩展为多个单参数MA
 * @param indicators 原始指标数组，如 ["ma(5,10,20)", "macd(12,26,9)"]
 * @returns 扩展后的指标数组，如 ["ma(5)", "ma(10)", "ma(20)", "macd(12,26,9)"]
 */
export function expandIndicators(indicators: string[]): string[] {
  const expanded: string[] = [];

  for (const indicator of indicators) {
    const { name, params } = parseIndicatorParams(indicator);

    // 如果是MA且有多个参数，则展开为多个单参数MA
    if (name === 'ma' && params.length > 1) {
      for (const period of params) {
        expanded.push(`ma(${period})`);
      }
    } else {
      // 其他指标保持原样
      expanded.push(indicator);
    }
  }

  return expanded;
} 