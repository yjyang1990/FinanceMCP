import { stockData } from '../../src/tools/stockData.js';

/**
 * 集成测试：测试东方财富数据源的股票历史行情工具
 * 验证东方财富API作为A股数据的主要提供者
 */

async function testStockDataWithEastMoney() {
  console.log('=== 东方财富数据源测试 ===\n');

  // 测试1: A股深圳市场 - 平安银行
  console.log('1. 测试A股深圳市场 - 平安银行 (000001.SZ):');
  try {
    const result = await stockData.run({
      code: '000001.SZ',
      market_type: 'cn',
      start_date: '20241201',
      end_date: '20241231'
    });

    console.log('✓ 数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    const content = result.content[0].text;
    if (content.includes('平安银行')) {
      console.log('✓ 包含股票名称');
    }
    if (content.includes('前复权')) {
      console.log('✓ 显示前复权标识');
    }
    if (content.includes('东方财富') || content.includes('成功使用')) {
      console.log('✓ 使用东方财富数据源');
    }

    console.log('\n=== 数据样例 ===');
    const lines = content.split('\n').slice(0, 15);
    console.log(lines.join('\n'));
    console.log('...\n');

  } catch (error) {
    console.error('✗ 测试失败:', error);
  }

  // 测试2: A股上海市场 - 贵州茅台
  console.log('\n2. 测试A股上海市场 - 贵州茅台 (600519.SH):');
  try {
    const result = await stockData.run({
      code: '600519.SH',
      market_type: 'cn',
      start_date: '20241201',
      end_date: '20241231'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;
    if (content.includes('贵州茅台')) {
      console.log('✓ 包含股票名称');
    }

  } catch (error) {
    console.error('✗ 测试失败:', error);
  }

  // 测试3: 带技术指标的查询
  console.log('\n3. 测试带技术指标的查询 (MACD + RSI):');
  try {
    const result = await stockData.run({
      code: '000001.SZ',
      market_type: 'cn',
      start_date: '20241101',
      end_date: '20241231',
      indicators: 'macd(12,26,9) rsi(14)'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;

    if (content.includes('MACD')) {
      console.log('✓ 包含MACD指标');
    }
    if (content.includes('RSI')) {
      console.log('✓ 包含RSI指标');
    }
    if (content.includes('DIF') || content.includes('DEA')) {
      console.log('✓ 包含MACD详细数据');
    }

  } catch (error) {
    console.error('✗ 测试失败:', error);
  }

  // 测试4: 测试错误处理 - 无效股票代码
  console.log('\n4. 测试错误处理 - 无效股票代码:');
  try {
    const result = await stockData.run({
      code: '999999.SZ',
      market_type: 'cn',
      start_date: '20241201',
      end_date: '20241231'
    });

    const content = result.content[0].text;
    if (content.includes('失败') || content.includes('错误') || content.includes('未找到')) {
      console.log('✓ 正确处理无效股票代码');
    }

  } catch (error) {
    console.log('✓ 正确抛出异常');
  }

  // 测试5: 测试不同日期范围
  console.log('\n5. 测试较长日期范围 (90天):');
  try {
    const result = await stockData.run({
      code: '000001.SZ',
      market_type: 'cn',
      start_date: '20241001',
      end_date: '20241231'
    });

    console.log('✓ 数据获取成功');
    const content = result.content[0].text;
    const dataLines = content.split('\n').filter(line =>
      /^\d{8}/.test(line.trim())
    );
    console.log(`  获取到约 ${dataLines.length} 个交易日的数据`);

  } catch (error) {
    console.error('✗ 测试失败:', error);
  }

  console.log('\n=== 测试完成! ===');
}

// 运行测试
testStockDataWithEastMoney().catch(console.error);
