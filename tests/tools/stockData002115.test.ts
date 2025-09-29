import { stockData } from '../../src/tools/stockData.js';

/**
 * 集成测试：测试 002115 三维通信股票数据获取
 * 包含 Yahoo Finance 和技术指标功能测试
 */

async function test002115StockData() {
  console.log('=== 002115 三维通信股票数据获取测试 ===\n');

  // 测试1: 基础股票数据获取
  console.log('1. 测试基础股票数据获取:');
  try {
    const result = await stockData.run({
      code: '002115.SZ',
      market_type: 'cn',
      start_date: '20250920',
      end_date: '20250929'
    });

    console.log('✓ 002115 股票数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 检查内容是否包含预期字段
    const content = result.content[0].text;
    if (content.includes('002115')) {
      console.log('✓ 包含股票代码');
    }
    if (content.includes('A股')) {
      console.log('✓ 正确识别为A股市场');
    }
    if (content.includes('交易日期') && content.includes('开盘') && content.includes('收盘')) {
      console.log('✓ 包含基础交易数据字段');
    }

    // 显示完整内容
    console.log('\n=== 完整返回内容 ===');
    console.log(content);
    console.log('=== 完整内容结束 ===\n');

  } catch (error) {
    console.error('002115 基础数据测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试2: 带技术指标的数据获取
  console.log('2. 测试带技术指标的数据获取:');
  try {
    const result = await stockData.run({
      code: '002115.SZ',
      market_type: 'cn',
      start_date: '20250901',
      end_date: '20250929',
      indicators: 'ma(5) ma(10) rsi(14) macd(12,26,9)'
    });

    console.log('✓ 002115 带技术指标数据获取成功');

    const content = result.content[0].text;

    // 检查技术指标
    if (content.includes('MA5')) {
      console.log('✓ 包含 MA5 移动平均线');
    }
    if (content.includes('MA10')) {
      console.log('✓ 包含 MA10 移动平均线');
    }
    if (content.includes('RSI')) {
      console.log('✓ 包含 RSI 相对强弱指标');
    }
    if (content.includes('MACD')) {
      console.log('✓ 包含 MACD 指标');
    }

    // 检查技术指标说明
    if (content.includes('技术指标说明')) {
      console.log('✓ 包含技术指标说明');
    }

    // 检查数据行数
    const dataRows = content.split('\n').filter(line =>
      line.includes('|') && line.match(/\d{8}/) // 包含日期格式的行
    );
    console.log(`✓ 包含 ${dataRows.length} 条交易数据`);

    console.log('\n=== 完整技术指标返回内容 ===');
    console.log(content);
    console.log('=== 技术指标完整内容结束 ===\n');

  } catch (error) {
    console.error('002115 技术指标测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试3: 测试股票代码解析和说明
  console.log('3. 测试股票代码解析功能:');
  try {
    const result = await stockData.run({
      code: '002115',  // 不带后缀测试
      market_type: 'cn'
      // 使用默认日期
    });

    console.log('✓ 002115 不带后缀代码解析成功');

    const content = result.content[0].text;

    // 检查是否包含公司信息
    if (content.includes('三维通信') || content.includes('SUNWAVE')) {
      console.log('✓ 正确解析公司名称');
    }

    // 检查股票说明部分
    if (content.includes('股票代码说明') || content.includes('002115')) {
      console.log('✓ 包含股票代码说明');
    }

    console.log('\n=== 完整股票代码解析内容 ===');
    console.log(content);
    console.log('=== 股票代码解析完整内容结束 ===\n');

  } catch (error) {
    console.error('002115 代码解析测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试4: 错误处理测试
  console.log('4. 测试错误处理:');
  try {
    const result = await stockData.run({
      code: '002115.SZ',
      market_type: 'fx',  // 使用不支持的市场类型
      start_date: '20250920',
      end_date: '20250929'
    });

    console.log('返回了错误处理结果');

    const content = result.content[0].text;
    if (content.includes('需要配置 Tushare API')) {
      console.log('✓ 正确提示需要 Tushare API 配置');
    }
    if (content.includes('支持的免费数据源')) {
      console.log('✓ 提供了替代方案提示');
    }

    console.log('\n=== 完整错误处理内容 ===');
    console.log(content);
    console.log('=== 错误处理完整内容结束 ===\n');

  } catch (error) {
    console.error('错误处理测试异常:', error);
  }

  console.log('----------------------------------------\n');

  // 测试5: 数据提供者切换测试
  console.log('5. 测试数据提供者功能:');
  try {
    const result = await stockData.run({
      code: '002115.SZ',
      market_type: 'cn',
      start_date: '20250925',
      end_date: '20250929'
    });

    console.log('✓ 数据提供者切换测试成功');

    const content = result.content[0].text;

    // 检查是否使用了 Yahoo Finance 或提供了降级提示
    console.log('数据获取方式: 通过智能数据提供者选择');

    // 检查数据完整性
    if (content.includes('成交量') && content.includes('成交额')) {
      console.log('✓ 数据字段完整');
    }

    // 统计数据行数
    const tableRows = content.split('\n').filter(line =>
      line.startsWith('|') && line.includes('2025')
    );
    console.log(`✓ 获取到 ${tableRows.length} 条有效数据`);

    console.log('\n=== 完整数据提供者测试内容 ===');
    console.log(content);
    console.log('=== 数据提供者测试完整内容结束 ===\n');

  } catch (error) {
    console.error('数据提供者测试失败:', error);
  }

  console.log('----------------------------------------\n');
  console.log('002115 三维通信股票数据测试完成!');
}

// 运行测试
test002115StockData().catch(console.error);