import { marginTrade } from '../../src/tools/marginTrade.js';

/**
 * 集成测试：测试融资融券数据工具（东方财富API）
 * 包含API数据获取和错误处理功能测试
 */

async function testMarginTrade() {
  console.log('=== 融资融券数据测试（东方财富API） ===\n');

  // 测试1: 融资融券标的股票
  console.log('1. 测试融资融券标的股票:');
  try {
    const result = await marginTrade.run({
      data_type: 'margin_secs',
      start_date: '20250930',
      exchange: 'SSE'
    });

    console.log('✓ 数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    const content = result.content[0].text;
    if (content.includes('融资融券标的股票列表')) {
      console.log('✓ 包含标的列表标题');
    }
    if (content.includes('上交所')) {
      console.log('✓ 包含交易所信息');
    }

    console.log('\n=== 融资融券标的完整内容 ===');
    console.log(content);
    console.log('=== 完整内容结束 ===\n');

  } catch (error) {
    console.error('融资融券标的测试失败:', error);
  }

  // 测试2: 融资融券交易汇总（个股）
  console.log('2. 测试融资融券交易汇总（个股明细）:');
  try {
    const result = await marginTrade.run({
      data_type: 'margin',
      ts_code: '600000.SH',
      start_date: '20250901',
      end_date: '20250930'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;

    if (content.includes('融资融券交易汇总')) {
      console.log('✓ 包含交易汇总标题');
    }
    if (content.includes('融资余额')) {
      console.log('✓ 包含融资余额数据');
    }

    console.log('\n=== 融资融券交易汇总完整内容 ===');
    console.log(content);
    console.log('=== 完整内容结束 ===\n');

  } catch (error) {
    console.error('融资融券交易汇总测试失败:', error);
  }

  // 测试3: 融资融券交易明细
  console.log('3. 测试融资融券交易明细:');
  try {
    const result = await marginTrade.run({
      data_type: 'margin_detail',
      ts_code: '600000.SH',
      start_date: '20250901',
      end_date: '20250930'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;

    if (content.includes('融资融券交易明细')) {
      console.log('✓ 包含交易明细标题');
    }

    console.log('\n=== 融资融券交易明细完整内容 ===');
    console.log(content);
    console.log('=== 完整内容结束 ===\n');

  } catch (error) {
    console.error('融资融券交易明细测试失败:', error);
  }

  // 测试4: 市场历史对比
  console.log('4. 测试市场历史对比:');
  try {
    const result = await marginTrade.run({
      data_type: 'slb_len_mm',
      start_date: '20250901',
      end_date: '20250930'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;

    if (content.includes('融资融券市场历史对比')) {
      console.log('✓ 包含市场对比标题');
    }
    if (content.includes('上海市场') || content.includes('深圳市场')) {
      console.log('✓ 包含市场数据');
    }

    console.log('\n=== 市场历史对比完整内容 ===');
    console.log(content);
    console.log('=== 完整内容结束 ===\n');

  } catch (error) {
    console.error('市场历史对比测试失败:', error);
  }

  // 测试5: 错误处理（缺少必要参数）
  console.log('5. 测试错误处理（缺少股票代码）:');
  try {
    const result = await marginTrade.run({
      data_type: 'margin',
      start_date: '20250930'
      // 缺少 ts_code
    } as any);

    const content = result.content[0].text;
    if (content.includes('错误') || content.includes('需要提供股票代码')) {
      console.log('✓ 正确处理错误情况');
    }
  } catch (error) {
    console.error('错误处理测试失败:', error);
  }

  console.log('测试完成!');
}

// 运行测试
testMarginTrade().catch(console.error);
