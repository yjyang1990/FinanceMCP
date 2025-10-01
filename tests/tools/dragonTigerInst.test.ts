import { dragonTigerInst } from '../../src/tools/dragonTigerInst.js';

/**
 * 集成测试：龙虎榜机构成交明细（使用东方财富API）
 * 测试API数据获取和错误处理功能
 */

async function testDragonTigerInst() {
  console.log('=== 龙虎榜机构成交明细测试（东方财富API）===\n');

  // 测试1: 查询指定日期的机构数据
  console.log('1. 测试查询2025-09-30机构数据:');
  try {
    const result = await dragonTigerInst.run({
      trade_date: '20250930'
    });

    console.log('✓ 数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    const content = result.content[0].text;
    if (content.includes('龙虎榜机构明细')) {
      console.log('✓ 包含标题');
    }
    if (content.includes('股票代码')) {
      console.log('✓ 包含表头');
    }
    if (content.includes('买入额合计')) {
      console.log('✓ 包含统计信息');
    }

    console.log('\n=== 完整返回内容 ===');
    console.log(content);
    console.log('=== 完整内容结束 ===\n');

  } catch (error) {
    console.error('❌ 数据获取测试失败:', error);
  }

  // 测试2: 查询指定股票的机构数据
  console.log('2. 测试查询特定股票(688448.SH)的机构数据:');
  try {
    const result = await dragonTigerInst.run({
      trade_date: '20250930',
      ts_code: '688448.SH'
    });

    const content = result.content[0].text;
    if (content.includes('688448')) {
      console.log('✓ 包含指定股票代码');
    }

    console.log('\n=== 特定股票返回内容 ===');
    console.log(content);
    console.log('=== 特定股票内容结束 ===\n');

  } catch (error) {
    console.error('❌ 特定股票查询失败:', error);
  }

  // 测试3: 测试日期格式兼容性（YYYY-MM-DD）
  console.log('3. 测试日期格式YYYY-MM-DD:');
  try {
    const result = await dragonTigerInst.run({
      trade_date: '2025-09-30'
    });

    console.log('✓ 支持YYYY-MM-DD格式');

  } catch (error) {
    console.error('❌ 日期格式测试失败:', error);
  }

  // 测试4: 测试无数据情况
  console.log('4. 测试无数据日期（假期）:');
  try {
    const result = await dragonTigerInst.run({
      trade_date: '20250101'
    });

    const content = result.content[0].text;
    if (content.includes('暂无') || content.includes('数据条数: 0')) {
      console.log('✓ 正确处理无数据情况');
    }

  } catch (error) {
    console.error('❌ 无数据测试失败:', error);
  }

  // 测试5: 错误处理 - 无效日期格式
  console.log('5. 测试错误处理（无效日期）:');
  try {
    const result = await dragonTigerInst.run({
      trade_date: '202509'
    });

    const content = result.content[0].text;
    if (content.includes('❌') || content.includes('错误')) {
      console.log('✓ 正确处理错误日期格式');
    }
  } catch (error) {
    console.log('✓ 抛出异常，错误处理正常');
  }

  console.log('\n测试完成!');
}

// 运行测试
testDragonTigerInst().catch(console.error);
