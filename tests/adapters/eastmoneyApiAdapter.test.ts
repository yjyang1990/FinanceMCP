import { EastMoneyApiAdapter } from '../../src/adapters/eastmoneyApiAdapter.js';

/**
 * 集成测试：测试东方财富API适配器
 * 包含API数据获取和错误处理功能测试
 */

async function testEastMoneyApiAdapter() {
  console.log('=== 东方财富API适配器测试 ===\n');

  const adapter = new EastMoneyApiAdapter();
  const testStockCode = '002115.SZ'; // 三维通信

  // 测试1: 获取财务指标数据
  console.log('1. 测试财务指标数据获取:');
  try {
    const result = await adapter.fetchFinancialData(
      'indicators',
      testStockCode,
      undefined,
      '20230101',
      '20231231'
    );

    console.log('✓ 财务指标数据获取成功');
    console.log('数据条数:', result.data.length);
    console.log('字段列表:', result.fields);
    if (result.data.length > 0) {
      console.log('示例数据:', JSON.stringify(result.data[0], null, 2));
    }
    console.log('');

  } catch (error) {
    console.error('财务指标数据获取失败:', error);
  }

  // 测试2: 获取收入数据
  console.log('2. 测试利润表数据获取:');
  try {
    const result = await adapter.fetchFinancialData(
      'income_basic',
      testStockCode,
      undefined,
      '20230101',
      '20231231'
    );

    console.log('✓ 利润表数据获取成功');
    console.log('数据条数:', result.data.length);
    console.log('字段列表:', result.fields);
    if (result.data.length > 0) {
      console.log('示例数据:', JSON.stringify(result.data[0], null, 2));
    }
    console.log('');

  } catch (error) {
    console.error('利润表数据获取失败:', error);
  }

  // 测试3: 获取资产负债表数据
  console.log('3. 测试资产负债表数据获取:');
  try {
    const result = await adapter.fetchFinancialData(
      'balance_basic',
      testStockCode,
      undefined,
      '20230101',
      '20231231'
    );

    console.log('✓ 资产负债表数据获取成功');
    console.log('数据条数:', result.data.length);
    console.log('字段列表:', result.fields);
    if (result.data.length > 0) {
      console.log('示例数据:', JSON.stringify(result.data[0], null, 2));
    }
    console.log('');

  } catch (error) {
    console.error('资产负债表数据获取失败:', error);
  }

  // 测试4: 获取现金流数据
  console.log('4. 测试现金流量表数据获取:');
  try {
    const result = await adapter.fetchFinancialData(
      'cashflow_basic',
      testStockCode,
      undefined,
      '20230101',
      '20231231'
    );

    console.log('✓ 现金流量表数据获取成功');
    console.log('数据条数:', result.data.length);
    console.log('字段列表:', result.fields);
    if (result.data.length > 0) {
      console.log('示例数据:', JSON.stringify(result.data[0], null, 2));
    }
    console.log('');

  } catch (error) {
    console.error('现金流量表数据获取失败:', error);
  }

  // 测试5: 获取股东人数数据
  console.log('5. 测试股东人数数据获取:');
  try {
    const result = await adapter.fetchFinancialData(
      'holder_number',
      testStockCode,
      undefined,
      '20230101',
      '20231231'
    );

    console.log('✓ 股东人数数据获取成功');
    console.log('数据条数:', result.data.length);
    console.log('字段列表:', result.fields);
    if (result.data.length > 0) {
      console.log('示例数据:', JSON.stringify(result.data[0], null, 2));
    }
    console.log('');

  } catch (error) {
    console.error('股东人数数据获取失败:', error);
  }

  // 测试6: 获取公司基本信息
  console.log('6. 测试公司基本信息获取:');
  try {
    const result = await adapter.fetchFinancialData(
      'company_basic',
      testStockCode,
      undefined,
      '20230101',
      '20231231'
    );

    console.log('✓ 公司基本信息获取成功');
    console.log('数据条数:', result.data.length);
    console.log('字段列表:', result.fields);
    if (result.data.length > 0) {
      console.log('示例数据:', JSON.stringify(result.data[0], null, 2));
    }
    console.log('');

  } catch (error) {
    console.error('公司基本信息获取失败:', error);
  }

  // 测试7: 错误处理
  console.log('7. 测试错误处理:');
  try {
    const result = await adapter.fetchFinancialData(
      'invalid_type',
      testStockCode,
      undefined,
      '20230101',
      '20231231'
    );

    console.log('错误处理测试失败 - 应该抛出异常');
  } catch (error) {
    console.log('✓ 正确处理了无效的数据类型错误');
    console.log('错误信息:', error.message);
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testEastMoneyApiAdapter().catch(console.error);