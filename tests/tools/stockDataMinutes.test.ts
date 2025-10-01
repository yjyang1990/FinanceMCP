import { stockDataMinutes } from '../../src/tools/stockDataMinutes.js';

/**
 * 集成测试：测试stockDataMinutes工具（东方财富API版本）
 * 包含不同时间周期、股票代码转换和时间范围查询测试
 */

async function testStockDataMinutes() {
  console.log('=== stockDataMinutes 集成测试（东方财富API）===\n');

  // 测试1: 1分钟K线（上交所）
  console.log('1. 测试1分钟K线（上交所 - 600519.SH）:');
  try {
    const result = await stockDataMinutes.run({
      code: '600519.SH',
      market_type: 'cn',
      start_datetime: '20250930',
      end_datetime: '20251001',
      freq: '1min'
    });

    console.log('✓ 数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    const content = result.content[0].text;
    if (content.includes('600519') && content.includes('分钟K线')) {
      console.log('✓ 包含预期内容');
    }

    // 显示前500字符
    console.log('\n=== 部分返回内容 ===');
    console.log(content.substring(0, 500));
    console.log('...\n');
  } catch (error) {
    console.error('✗ 1分钟K线测试失败:', error);
  }

  // 测试2: 5分钟K线（深交所）
  console.log('2. 测试5分钟K线（深交所 - 000001.SZ）:');
  try {
    const result = await stockDataMinutes.run({
      code: '000001.SZ',
      market_type: 'cn',
      start_datetime: '2025-09-30',
      end_datetime: '2025-10-01',
      freq: '5MIN'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;
    if (content.includes('000001') && content.includes('5min')) {
      console.log('✓ 5分钟周期转换正确');
    }

    console.log('\n=== 部分返回内容 ===');
    console.log(content.substring(0, 500));
    console.log('...\n');
  } catch (error) {
    console.error('✗ 5分钟K线测试失败:', error);
  }

  // 测试3: 15分钟K线
  console.log('3. 测试15分钟K线:');
  try {
    const result = await stockDataMinutes.run({
      code: '600519.SH',
      market_type: 'cn',
      start_datetime: '20250930 09:30:00',
      end_datetime: '20250930 15:00:00',
      freq: '15m'
    });

    console.log('✓ 15分钟K线获取成功');
    const content = result.content[0].text;
    if (content.includes('15min')) {
      console.log('✓ 15分钟周期正确');
    }
  } catch (error) {
    console.error('✗ 15分钟K线测试失败:', error);
  }

  // 测试4: 30分钟K线
  console.log('\n4. 测试30分钟K线:');
  try {
    const result = await stockDataMinutes.run({
      code: '600519.SH',
      market_type: 'cn',
      start_datetime: '20250930',
      end_datetime: '20251001',
      freq: '30min'
    });

    console.log('✓ 30分钟K线获取成功');
    const content = result.content[0].text;
    if (content.includes('30min')) {
      console.log('✓ 30分钟周期正确');
    }
  } catch (error) {
    console.error('✗ 30分钟K线测试失败:', error);
  }

  // 测试5: 60分钟K线
  console.log('\n5. 测试60分钟K线:');
  try {
    const result = await stockDataMinutes.run({
      code: '000001.SZ',
      market_type: 'cn',
      start_datetime: '20250930',
      end_datetime: '20251001',
      freq: '60MIN'
    });

    console.log('✓ 60分钟K线获取成功');
    const content = result.content[0].text;
    if (content.includes('60min')) {
      console.log('✓ 60分钟周期正确');
    }
  } catch (error) {
    console.error('✗ 60分钟K线测试失败:', error);
  }

  // 测试6: 错误处理 - 无效股票代码格式
  console.log('\n6. 测试错误处理（无效股票代码）:');
  try {
    const result = await stockDataMinutes.run({
      code: 'INVALID',
      market_type: 'cn',
      start_datetime: '20250930',
      end_datetime: '20251001',
      freq: '1min'
    });

    const content = result.content[0].text;
    if (content.includes('失败') || content.includes('错误')) {
      console.log('✓ 正确处理无效股票代码');
    }
  } catch (error) {
    console.log('✓ 捕获到预期错误');
  }

  // 测试7: 错误处理 - 不支持的频率
  console.log('\n7. 测试错误处理（不支持的频率）:');
  try {
    const result = await stockDataMinutes.run({
      code: '600519.SH',
      market_type: 'cn',
      start_datetime: '20250930',
      end_datetime: '20251001',
      freq: '2min'
    });

    const content = result.content[0].text;
    if (content.includes('失败') || content.includes('错误')) {
      console.log('✓ 正确处理不支持的频率');
    }
  } catch (error) {
    console.log('✓ 捕获到预期错误');
  }

  // 测试8: Crypto分支（确保不影响）
  console.log('\n8. 测试Crypto分支（Binance）:');
  try {
    const result = await stockDataMinutes.run({
      code: 'BTCUSDT',
      market_type: 'crypto',
      start_datetime: '20250930',
      end_datetime: '20251001',
      freq: '1min'
    });

    console.log('✓ Crypto分支正常工作');
    const content = result.content[0].text;
    if (content.includes('Binance')) {
      console.log('✓ 使用Binance API');
    }
  } catch (error) {
    console.log('ℹ Crypto测试可能需要网络连接:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testStockDataMinutes().catch(console.error);
