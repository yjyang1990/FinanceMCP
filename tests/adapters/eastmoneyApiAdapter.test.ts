import { EastMoneyApiAdapter } from '../../src/adapters/eastmoneyApiAdapter.js';

/**
 * 单元测试：测试东方财富API适配器
 * 包含数据获取、格式转换、错误处理等功能测试
 */

async function testEastMoneyApiAdapter() {
  console.log('=== 东方财富API适配器单元测试 ===\n');

  const adapter = new EastMoneyApiAdapter();
  const testStock = '002115.SZ';

  let testsPassed = 0;
  let testsFailed = 0;

  // 测试1: 基本财务数据获取
  console.log('1. 测试基本财务数据获取:');
  const basicDataTypes = [
    'balance_basic',
    'income_basic',
    'cashflow_basic',
    'indicators',
    'company_basic'
  ];

  for (const dataType of basicDataTypes) {
    try {
      const result = await adapter.fetchFinancialData(
        dataType,
        testStock,
        undefined, // period
        '20250101', // startDate
        '20251001'  // endDate
      );

      if (validateAdapterResponse(result)) {
        console.log(`   ✓ ${dataType} 数据获取成功`);
        console.log(`     - 数据条数: ${result.data?.length || 0}`);
        console.log(`     - 字段数量: ${result.fields?.length || 0}`);

        console.log(`\n   === ${dataType}完整返回结果 ===`);
        console.log('   数据格式:', JSON.stringify(result, null, 2));
        console.log(`   === ${dataType}完整结果结束 ===\n`);

        testsPassed++;
      } else {
        console.log(`   ❌ ${dataType} 响应格式异常`);
        testsFailed++;
      }
    } catch (error) {
      console.error(`   ❌ ${dataType} 获取失败:`, error.message);
      testsFailed++;
    }
  }

  console.log('----------------------------------------\n');

  // 测试2: 高级财务数据获取
  console.log('2. 测试高级财务数据获取:');
  const advancedDataTypes = [
    'forecast',
    'express',
    'dividend',
    'mainbz',
    'managers',
    'audit'
  ];

  for (const dataType of advancedDataTypes) {
    try {
      const result = await adapter.fetchFinancialData(
        dataType,
        testStock,
        undefined,
        '20250101',
        '20251001'
      );

      if (validateAdapterResponse(result)) {
        console.log(`   ✓ ${dataType} 数据获取成功`);
        console.log(`     - 数据条数: ${result.data?.length || 0}`);
        testsPassed++;
      } else {
        console.log(`   ❌ ${dataType} 响应格式异常`);
        testsFailed++;
      }
    } catch (error) {
      console.error(`   ❌ ${dataType} 获取失败:`, error.message);
      testsFailed++;
    }
  }

  console.log('----------------------------------------\n');

  // 测试3: 股东持股数据获取
  console.log('3. 测试股东持股数据获取:');
  const holderDataTypes = [
    'holder_number',
    'holder_trade',
    'top10_holders',
    'top10_floatholders'
  ];

  for (const dataType of holderDataTypes) {
    try {
      const result = await adapter.fetchFinancialData(
        dataType,
        testStock,
        undefined,
        '20250101',
        '20251001'
      );

      if (validateAdapterResponse(result)) {
        console.log(`   ✓ ${dataType} 数据获取成功`);
        console.log(`     - 数据条数: ${result.data?.length || 0}`);
        testsPassed++;
      } else {
        console.log(`   ❌ ${dataType} 响应格式异常`);
        testsFailed++;
      }
    } catch (error) {
      console.error(`   ❌ ${dataType} 获取失败:`, error.message);
      testsFailed++;
    }
  }

  console.log('----------------------------------------\n');

  // 测试4: 交易质押数据获取
  console.log('4. 测试交易质押数据获取:');
  const tradeDataTypes = [
    'share_float',
    'repurchase',
    'pledge_stat',
    'pledge_detail'
  ];

  for (const dataType of tradeDataTypes) {
    try {
      const result = await adapter.fetchFinancialData(
        dataType,
        testStock,
        undefined,
        '20250101',
        '20251001'
      );

      if (validateAdapterResponse(result)) {
        console.log(`   ✓ ${dataType} 数据获取成功`);
        console.log(`     - 数据条数: ${result.data?.length || 0}`);
        testsPassed++;
      } else {
        console.log(`   ❌ ${dataType} 响应格式异常`);
        testsFailed++;
      }
    } catch (error) {
      console.error(`   ❌ ${dataType} 获取失败:`, error.message);
      testsFailed++;
    }
  }

  console.log('----------------------------------------\n');

  // 测试5: 数据格式转换验证
  console.log('5. 测试数据格式转换验证:');
  try {
    const result = await adapter.fetchFinancialData(
      'income_basic',
      testStock,
      undefined,
      '20250101',
      '20251001'
    );

    if (result.data && result.data.length > 0) {
      const record = result.data[0];

      // 检查关键字段是否存在
      const requiredFields = ['ts_code', 'ann_date', 'end_date'];
      let fieldsValid = true;

      for (const field of requiredFields) {
        if (!(field in record)) {
          console.log(`   ❌ 缺少必需字段: ${field}`);
          fieldsValid = false;
        }
      }

      if (fieldsValid) {
        console.log('   ✓ 数据格式转换正确');
        console.log(`     - 股票代码: ${record.ts_code}`);
        console.log(`     - 报告期: ${record.end_date}`);
        testsPassed++;
      } else {
        console.log('   ❌ 数据格式转换异常');
        testsFailed++;
      }
    } else {
      console.log('   ℹ️ 无数据返回，跳过格式验证');
      testsPassed++;
    }
  } catch (error) {
    console.error('   ❌ 数据格式转换测试失败:', error.message);
    testsFailed++;
  }

  console.log('----------------------------------------\n');

  // 测试6: 错误处理验证
  console.log('6. 测试错误处理验证:');

  // 测试无效数据类型
  try {
    await adapter.fetchFinancialData(
      'invalid_type',
      testStock,
      undefined,
      '20250101',
      '20251001'
    );
    console.log('   ❌ 应该抛出无效数据类型错误');
    testsFailed++;
  } catch (error) {
    if (error.message.includes('不支持的数据类型')) {
      console.log('   ✓ 无效数据类型错误处理正确');
      testsPassed++;
    } else {
      console.log('   ❌ 错误类型不符合预期:', error.message);
      testsFailed++;
    }
  }

  // 测试无效股票代码
  try {
    const result = await adapter.fetchFinancialData(
      'company_basic',
      'INVALID.CODE',
      undefined,
      '20250101',
      '20251001'
    );

    // 应该返回空数据，不抛出异常
    if (validateAdapterResponse(result)) {
      console.log('   ✓ 无效股票代码处理正确（返回空数据）');
      testsPassed++;
    } else {
      console.log('   ❌ 无效股票代码处理异常');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ✓ 无效股票代码正确抛出异常:', error.message);
    testsPassed++;
  }

  console.log('----------------------------------------\n');

  // 测试7: 性能测试
  console.log('7. 测试API响应性能:');
  try {
    const startTime = Date.now();

    await adapter.fetchFinancialData(
      'company_basic',
      testStock,
      undefined,
      '20250101',
      '20251001'
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (duration < 3000) { // 3秒内响应
      console.log(`   ✓ API响应性能良好 (${duration}ms)`);
      testsPassed++;
    } else {
      console.log(`   ⚠️ API响应较慢 (${duration}ms)`);
      testsFailed++;
    }
  } catch (error) {
    console.error('   ❌ 性能测试失败:', error.message);
    testsFailed++;
  }

  console.log('----------------------------------------\n');

  // 测试总结
  const totalTests = testsPassed + testsFailed;
  const successRate = ((testsPassed / totalTests) * 100).toFixed(1);

  console.log('=== 东方财富API适配器测试总结 ===');
  console.log(`总测试数: ${totalTests}`);
  console.log(`通过测试: ${testsPassed} ✓`);
  console.log(`失败测试: ${testsFailed} ✗`);
  console.log(`成功率: ${successRate}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 所有适配器测试通过！');
    console.log('✅ API接口调用正常');
    console.log('✅ 数据格式转换正确');
    console.log('✅ 错误处理机制完善');
    console.log('✅ 响应性能良好');
  } else {
    console.log(`\n⚠️ 有 ${testsFailed} 个测试失败，需要进一步检查适配器实现。`);
  }

  console.log('\n测试完成!');
}

/**
 * 验证适配器响应格式
 */
function validateAdapterResponse(result: any): boolean {
  // 检查基本响应结构
  if (!result || typeof result !== 'object') {
    return false;
  }

  // 检查必需属性
  if (!('data' in result) || !('fields' in result)) {
    return false;
  }

  // 检查数据类型
  if (!Array.isArray(result.data) || !Array.isArray(result.fields)) {
    return false;
  }

  return true;
}

/**
 * 运行测试 - 可以直接通过 tsx 执行
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  testEastMoneyApiAdapter().catch(console.error);
}

// 导出测试函数供其他模块使用
export { testEastMoneyApiAdapter };