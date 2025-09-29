import { parseIndicatorParams, formatIndicatorParams } from '../index.js';

export interface IndicatorDataParams {
  indicators: Record<string, any>;
  requestedIndicators: string[];
}

export function formatIndicatorExplanation(params: IndicatorDataParams): string {
  const { indicators, requestedIndicators } = params;

  if (Object.keys(indicators).length === 0) {
    return '';
  }

  let indicatorData = `\n\n## 📊 技术指标说明\n`;

  // 记录实际使用的参数，用于说明中显示
  const indicatorParams: Record<string, string> = {};
  for (const indicator of requestedIndicators) {
    try {
      const { name, params } = parseIndicatorParams(indicator);
      indicatorParams[name] = formatIndicatorParams(name, params);
    } catch {
      // 忽略解析错误，继续处理其他指标
    }
  }

  if (indicators.macd) {
    const params = indicatorParams.macd || '(参数未知)';
    indicatorData += `- **MACD${params}**: DIF(快线)、DEA(慢线)、MACD(柱状图)\n`;
  }
  if (indicators.rsi) {
    const params = indicatorParams.rsi || '(参数未知)';
    indicatorData += `- **RSI${params}**: 相对强弱指标，范围0-100，>70超买，<30超卖\n`;
  }
  if (indicators.kdj) {
    const params = indicatorParams.kdj || '(参数未知)';
    indicatorData += `- **KDJ${params}**: 随机指标，K线、D线、J线，>80超买，<20超卖\n`;
  }
  if (indicators.boll) {
    const params = indicatorParams.boll || '(参数未知)';
    indicatorData += `- **BOLL${params}**: 布林带，上轨、中轨、下轨\n`;
  }

  // 处理各种MA指标，过滤掉非MA指标
  const maIndicators = Object.keys(indicators).filter(key => key.startsWith('ma') && key !== 'macd');
  if (maIndicators.length > 0) {
    maIndicators.forEach(ma => {
      const period = ma.replace('ma', '');
      indicatorData += `- **${ma.toUpperCase()}(${period})**: 移动平均线，常用判断趋势方向\n`;
    });
  }

  return indicatorData;
}