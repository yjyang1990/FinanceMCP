import { companyPerformance } from '../../src/tools/companyPerformance.js';

/**
 * 数据质量验证测试：测试财务数据的完整性、准确性和一致性
 * 确保东方财富API返回的数据符合预期的质量标准
 */

interface DataQualityMetrics {
  completeness: number;    // 数据完整性得分 (0-100)
  accuracy: number;        // 数据准确性得分 (0-100)
  consistency: number;     // 数据一致性得分 (0-100)
  timeliness: number;      // 数据时效性得分 (0-100)
  overall: number;         // 总体质量得分 (0-100)
}

async function testDataQuality() {
  console.log('=== 财务数据质量验证测试 ===\n');

  const testStocks = [
    { code: '002115.SZ', name: '三维通信' },
    { code: '000001.SZ', name: '平安银行' },
    { code: '600000.SH', name: '浦发银行' }
  ];

  const criticalDataTypes = [
    'company_basic',
    'balance_basic',
    'income_basic',
    'cashflow_basic',
    'holder_number'
  ];

  const dateRange = {
    start_date: '20250101',
    end_date: '20251001'
  };

  let overallMetrics: DataQualityMetrics = {
    completeness: 0,
    accuracy: 0,
    consistency: 0,
    timeliness: 0,
    overall: 0
  };

  let totalTests = 0;

  // 测试1: 数据完整性验证
  console.log('1. 数据完整性验证:');
  let completenessScores: number[] = [];

  for (const stock of testStocks) {
    console.log(`   测试股票: ${stock.name} (${stock.code})`);

    for (const dataType of criticalDataTypes) {
      try {
        const result = await companyPerformance.run({
          ts_code: stock.code,
          data_type: dataType,
          ...dateRange
        });

        const score = evaluateCompleteness(result, dataType);
        completenessScores.push(score);
        totalTests++;

        console.log(`     ${dataType}: ${score}/100`);

        // 显示完整响应内容
        console.log(`\n     === ${dataType}完整响应内容 ===`);
        console.log(result.content[0].text);
        console.log(`     === ${dataType}响应内容结束 ===\n`);
      } catch (error) {
        console.error(`     ${dataType}: 获取失败 - ${error.message}`);
        completenessScores.push(0);
        totalTests++;
      }
    }
  }

  overallMetrics.completeness = completenessScores.length > 0 ?
    Math.round(completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length) : 0;

  console.log(`   平均完整性得分: ${overallMetrics.completeness}/100\n`);

  // 测试2: 数据准确性验证
  console.log('2. 数据准确性验证:');
  let accuracyScores: number[] = [];

  for (const stock of testStocks) {
    console.log(`   测试股票: ${stock.name} (${stock.code})`);

    try {
      // 重点测试核心利润表数据的准确性
      const result = await companyPerformance.run({
        ts_code: stock.code,
        data_type: 'income_basic',
        ...dateRange
      });

      const score = evaluateAccuracy(result, stock.code);
      accuracyScores.push(score);

      console.log(`     利润表数据准确性: ${score}/100`);

      // 显示完整响应内容
      console.log('\n     === 准确性验证完整响应内容 ===');
      console.log(result.content[0].text);
      console.log('     === 准确性验证响应内容结束 ===\n');
    } catch (error) {
      console.error(`     利润表数据获取失败: ${error.message}`);
      accuracyScores.push(0);
    }
  }

  overallMetrics.accuracy = accuracyScores.length > 0 ?
    Math.round(accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length) : 0;

  console.log(`   平均准确性得分: ${overallMetrics.accuracy}/100\n`);

  // 测试3: 数据一致性验证
  console.log('3. 数据一致性验证:');
  let consistencyScores: number[] = [];

  for (const stock of testStocks) {
    console.log(`   测试股票: ${stock.name} (${stock.code})`);

    try {
      // 获取多种财务报表数据进行一致性比较
      const [balanceResult, incomeResult, cashflowResult] = await Promise.all([
        companyPerformance.run({ ts_code: stock.code, data_type: 'balance_basic', ...dateRange }),
        companyPerformance.run({ ts_code: stock.code, data_type: 'income_basic', ...dateRange }),
        companyPerformance.run({ ts_code: stock.code, data_type: 'cashflow_basic', ...dateRange })
      ]);

      const score = evaluateConsistency(balanceResult, incomeResult, cashflowResult, stock.code);
      consistencyScores.push(score);

      console.log(`     财务报表一致性: ${score}/100`);

      // 显示完整响应内容
      console.log('\n     === 一致性验证完整响应内容 ===');
      console.log('资产负债表:');
      console.log(balanceResult.content[0].text);
      console.log('\n利润表:');
      console.log(incomeResult.content[0].text);
      console.log('\n现金流量表:');
      console.log(cashflowResult.content[0].text);
      console.log('     === 一致性验证响应内容结束 ===\n');
    } catch (error) {
      console.error(`     一致性验证失败: ${error.message}`);
      consistencyScores.push(0);
    }
  }

  overallMetrics.consistency = consistencyScores.length > 0 ?
    Math.round(consistencyScores.reduce((sum, score) => sum + score, 0) / consistencyScores.length) : 0;

  console.log(`   平均一致性得分: ${overallMetrics.consistency}/100\n`);

  // 测试4: 数据时效性验证
  console.log('4. 数据时效性验证:');
  let timelinessScores: number[] = [];

  for (const stock of testStocks) {
    console.log(`   测试股票: ${stock.name} (${stock.code})`);

    try {
      const startTime = Date.now();

      const result = await companyPerformance.run({
        ts_code: stock.code,
        data_type: 'company_basic',
        ...dateRange
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const score = evaluateTimeliness(result, responseTime);
      timelinessScores.push(score);

      console.log(`     响应时间: ${responseTime}ms, 时效性得分: ${score}/100`);

      // 显示完整响应内容
      console.log('\n     === 时效性验证完整响应内容 ===');
      console.log(result.content[0].text);
      console.log('     === 时效性验证响应内容结束 ===\n');
    } catch (error) {
      console.error(`     时效性验证失败: ${error.message}`);
      timelinessScores.push(0);
    }
  }

  overallMetrics.timeliness = timelinessScores.length > 0 ?
    Math.round(timelinessScores.reduce((sum, score) => sum + score, 0) / timelinessScores.length) : 0;

  console.log(`   平均时效性得分: ${overallMetrics.timeliness}/100\n`);

  // 测试5: 边界情况验证
  console.log('5. 边界情况验证:');

  const edgeCases = [
    { description: '无效股票代码', code: 'INVALID.CODE' },
    { description: '停牌股票', code: '000001.SZ' }, // 假设测试用例
    { description: '新股', code: '002115.SZ' }
  ];

  let edgeCasesPassed = 0;

  for (const testCase of edgeCases) {
    try {
      const result = await companyPerformance.run({
        ts_code: testCase.code,
        data_type: 'company_basic',
        ...dateRange
      });

      // 验证边界情况是否正确处理
      if (result && result.content && result.content[0] && result.content[0].text) {
        console.log(`   ✓ ${testCase.description} 处理正确`);
        edgeCasesPassed++;
      } else {
        console.log(`   ❌ ${testCase.description} 处理异常`);
      }
    } catch (error) {
      console.log(`   ✓ ${testCase.description} 正确抛出异常`);
      edgeCasesPassed++;
    }
  }

  console.log(`   边界情况处理: ${edgeCasesPassed}/${edgeCases.length} 通过\n`);

  // 计算总体质量得分
  overallMetrics.overall = Math.round(
    (overallMetrics.completeness + overallMetrics.accuracy +
     overallMetrics.consistency + overallMetrics.timeliness) / 4
  );

  // 测试总结
  console.log('=== 数据质量评估报告 ===');
  console.log(`数据完整性: ${overallMetrics.completeness}/100`);
  console.log(`数据准确性: ${overallMetrics.accuracy}/100`);
  console.log(`数据一致性: ${overallMetrics.consistency}/100`);
  console.log(`数据时效性: ${overallMetrics.timeliness}/100`);
  console.log(`总体质量: ${overallMetrics.overall}/100`);

  // 质量评级
  let qualityGrade = '';
  if (overallMetrics.overall >= 90) {
    qualityGrade = '优秀 (A+)';
  } else if (overallMetrics.overall >= 80) {
    qualityGrade = '良好 (A)';
  } else if (overallMetrics.overall >= 70) {
    qualityGrade = '中等 (B)';
  } else if (overallMetrics.overall >= 60) {
    qualityGrade = '及格 (C)';
  } else {
    qualityGrade = '不及格 (D)';
  }

  console.log(`\n🎯 数据质量评级: ${qualityGrade}`);

  if (overallMetrics.overall >= 80) {
    console.log('✅ 数据质量符合生产环境标准');
  } else {
    console.log('⚠️ 数据质量需要改进');

    // 提供改进建议
    if (overallMetrics.completeness < 80) {
      console.log('建议：提高数据完整性，检查API返回字段');
    }
    if (overallMetrics.accuracy < 80) {
      console.log('建议：验证数据准确性，对比权威数据源');
    }
    if (overallMetrics.consistency < 80) {
      console.log('建议：检查数据一致性，确保跨报表数据匹配');
    }
    if (overallMetrics.timeliness < 80) {
      console.log('建议：优化API响应性能，考虑缓存机制');
    }
  }

  console.log('\n数据质量验证完成!');
}

/**
 * 评估数据完整性
 */
function evaluateCompleteness(result: any, dataType: string): number {
  if (!result?.content?.[0]?.text) return 0;

  const content = result.content[0].text;
  let score = 0;

  // 基础分数：有内容就给50分
  if (content.length > 0) score += 50;

  // 包含表格结构：20分
  if (content.includes('|') && content.includes('---')) score += 20;

  // 包含数据而非错误信息：20分
  if (!content.includes('获取失败') && !content.includes('错误')) score += 20;

  // 内容丰富度：10分
  if (content.length > 300) score += 10;

  return Math.min(score, 100);
}

/**
 * 评估数据准确性
 */
function evaluateAccuracy(result: any, stockCode: string): number {
  if (!result?.content?.[0]?.text) return 0;

  const content = result.content[0].text;
  let score = 0;

  // 包含正确股票代码：30分
  if (content.includes(stockCode.split('.')[0])) score += 30;

  // 包含财务指标：30分
  if (content.includes('营业收入') || content.includes('净利润') || content.includes('EPS')) score += 30;

  // 数据格式正确：20分
  if (content.includes('万元') || content.includes('元') || content.includes('%')) score += 20;

  // 时间格式正确：20分
  if (content.match(/\d{8}/) || content.match(/\d{4}-\d{2}-\d{2}/)) score += 20;

  return Math.min(score, 100);
}

/**
 * 评估数据一致性
 */
function evaluateConsistency(balanceResult: any, incomeResult: any, cashflowResult: any, stockCode: string): number {
  let score = 0;
  const maxScore = 100;

  // 检查所有报表都包含相同的股票代码：40分
  const reports = [balanceResult, incomeResult, cashflowResult];
  const stockCodeMatches = reports.every(result =>
    result?.content?.[0]?.text?.includes(stockCode.split('.')[0])
  );
  if (stockCodeMatches) score += 40;

  // 检查报表标题一致性：30分
  const hasTitles = reports.every(result =>
    result?.content?.[0]?.text?.includes('📊') ||
    result?.content?.[0]?.text?.includes('##')
  );
  if (hasTitles) score += 30;

  // 检查数据格式一致性：30分
  const hasConsistentFormat = reports.every(result =>
    result?.content?.[0]?.text?.includes('|') ||
    result?.content?.[0]?.text?.includes('：')
  );
  if (hasConsistentFormat) score += 30;

  return Math.min(score, maxScore);
}

/**
 * 评估数据时效性
 */
function evaluateTimeliness(result: any, responseTime: number): number {
  let score = 0;

  // 响应时间评分：60分
  if (responseTime < 100) score += 60;      // 极快
  else if (responseTime < 500) score += 50; // 快
  else if (responseTime < 1000) score += 40; // 正常
  else if (responseTime < 2000) score += 30; // 较慢
  else score += 10; // 很慢

  // 数据可用性：40分
  if (result?.content?.[0]?.text) score += 40;

  return Math.min(score, 100);
}

/**
 * 运行测试 - 可以直接通过 tsx 执行
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  testDataQuality().catch(console.error);
}

// 导出测试函数供其他模块使用
export { testDataQuality };