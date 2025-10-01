import { moneyFlow } from '../../src/tools/moneyFlow.js';

/**
 * 集成测试：测试资金流向数据工具（东方财富API）
 * 包含API数据获取和错误处理功能测试
 */

async function testMoneyFlow() {
  console.log('=== 资金流向数据工具测试（东方财富API）===\n');

  // 测试1: 正常获取平安银行资金流向数据
  console.log('1. 测试获取平安银行（000001.SZ）资金流向数据:');
  try {
    const result = await moneyFlow.run({
      ts_code: '000001.SZ',
      start_date: '20240901',
      end_date: '20240930'
    });

    console.log('✓ 数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 验证返回内容
    const content = result.content[0].text;
    if (content.includes('资金流向数据')) {
      console.log('✓ 包含资金流向数据标题');
    }
    if (content.includes('统计摘要')) {
      console.log('✓ 包含统计摘要');
    }
    if (content.includes('主力净流入')) {
      console.log('✓ 包含主力资金流向信息');
    }

    // 显示部分内容
    console.log('\n=== 返回内容预览（前500字符）===');
    console.log(content.substring(0, 500));
    console.log('...\n');

  } catch (error) {
    console.error('❌ 平安银行数据获取失败:', error);
  }

  // 测试2: 测试其他股票（中国平安）
  console.log('2. 测试获取中国平安（601318.SH）资金流向数据:');
  try {
    const result = await moneyFlow.run({
      ts_code: '601318.SH',
      start_date: '20240915',
      end_date: '20240930'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;
    if (content.includes('601318.SH')) {
      console.log('✓ 包含正确的股票代码');
    }

  } catch (error) {
    console.error('❌ 中国平安数据获取失败:', error);
  }

  // 测试3: 错误处理 - 无效的股票代码
  console.log('\n3. 测试错误处理 - 无效的股票代码:');
  try {
    const result = await moneyFlow.run({
      ts_code: 'INVALID',
      start_date: '20240901',
      end_date: '20240930'
    });

    const content = result.content[0].text;
    if (content.includes('错误')) {
      console.log('✓ 正确处理无效股票代码');
      console.log('错误信息:', content);
    }
  } catch (error) {
    console.log('✓ 捕获到预期的错误:', error);
  }

  // 测试4: 测试日期范围
  console.log('\n4. 测试不同的日期范围:');
  try {
    const result = await moneyFlow.run({
      ts_code: '000002.SZ',
      start_date: '20241001',
      end_date: '20241010'
    });

    console.log('✓ 近期日期范围查询成功');
    const content = result.content[0].text;
    const hasData = content.includes('交易天数') && !content.includes('0 天');
    console.log(hasData ? '✓ 返回有效数据' : '⚠ 可能没有数据（非交易日）');

  } catch (error) {
    console.error('❌ 日期范围测试失败:', error);
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testMoneyFlow().catch(console.error);