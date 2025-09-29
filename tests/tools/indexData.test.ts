import { indexData } from '../../build/tools/indexData.js';

async function testIndexData() {
  console.log('=== 指数数据获取测试 ===\n');

  // 测试1: 上证指数
  console.log('1. 测试上证指数 (000001.SS):');
  try {
    const result = await indexData.run({
      code: '000001.SS',
      start_date: '2025-09-20',
      end_date: '2025-09-29'
    });

    console.log('✓ 上证指数数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 显示完整内容
    console.log('=== 完整返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===\n');
  } catch (error) {
    console.error('上证指数测试失败:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试2: 深证成指
  console.log('2. 测试深证成指 (399001.SZ):');
  try {
    const result = await indexData.run({
      code: '399001.SZ',
      start_date: '2025-09-25',
      end_date: '2025-09-29'
    });

    console.log('✓ 深证成指数据获取成功');
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 显示完整内容
    console.log('=== 完整返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===');

    // 检查是否包含期间走势信息
    const content = result.content[0].text;
    if (content.includes('期间走势:')) {
      console.log('✓ 包含期间走势分析');
    }
    if (content.includes('开盘:') && content.includes('收盘:')) {
      console.log('✓ 包含详细交易数据');
    }
    console.log('');
  } catch (error) {
    console.error('深证成指测试失败:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试3: 创业板指
  console.log('3. 测试创业板指 (399006.SZ):');
  try {
    const result = await indexData.run({
      code: '399006.SZ'
      // 使用默认日期（最近一个月）
    });

    console.log('✓ 创业板指数据获取成功（使用默认日期）');
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 显示完整内容
    console.log('=== 完整返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===');

    // 提取并显示标题
    const lines = result.content[0].text.split('\n');
    const titleLine = lines.find(line => line.startsWith('# '));
    if (titleLine) {
      console.log('数据标题:', titleLine);
    }
    console.log('');
  } catch (error) {
    console.error('创业板指测试失败:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试4: 沪深300
  console.log('4. 测试沪深300 (000300.SS):');
  try {
    const result = await indexData.run({
      code: '000300.SS',
      start_date: '2025-09-27',
      end_date: '2025-09-29'
    });

    console.log('✓ 沪深300数据获取成功');

    // 显示完整内容
    console.log('=== 完整返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===');

    // 解析内容，统计交易日数量
    const content = result.content[0].text;
    const tradingDays = (content.match(/## \d{4}-\d{2}-\d{2}/g) || []).length;
    console.log(`包含 ${tradingDays} 个交易日的数据`);

    // 检查是否包含趋势分析
    if (content.includes('上涨') || content.includes('下跌') || content.includes('持平')) {
      console.log('✓ 包含趋势分析');
    }
    console.log('');
  } catch (error) {
    console.error('沪深300测试失败:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试5: 中证500
  console.log('5. 测试中证500 (000905.SS):');
  try {
    const result = await indexData.run({
      code: '000905.SS',
      start_date: '2025-09-27',
      end_date: '2025-09-29'
    });

    console.log('✓ 中证500数据获取成功');
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 显示完整内容
    console.log('=== 完整返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===');

    // 提取趋势信息
    const content = result.content[0].text;
    const trendMatch = content.match(/## 期间走势: (.+)/);
    if (trendMatch) {
      console.log('期间走势:', trendMatch[1]);
    }
    console.log('');
  } catch (error) {
    console.error('中证500测试失败:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试6: 错误的指数代码
  console.log('6. 测试错误的指数代码:');
  try {
    const result = await indexData.run({
      code: 'INVALID.CODE',
      start_date: '2025-09-27',
      end_date: '2025-09-29'
    });

    console.log('返回了错误处理结果');

    // 显示完整错误内容
    console.log('=== 完整错误返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===');

    if (result.content[0].text.includes('获取指数INVALID.CODE数据失败')) {
      console.log('✓ 正确处理了无效指数代码');
    }

    // 检查是否包含常用指数代码提示
    if (result.content[0].text.includes('常用指数代码：')) {
      console.log('✓ 提供了常用指数代码参考');
    }
    console.log('');
  } catch (error) {
    console.error('错误代码测试异常:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试7: 参数验证 - 只提供必要参数
  console.log('7. 测试最小参数集:');
  try {
    const result = await indexData.run({
      code: '000001.SS'
      // 只提供code，不提供日期
    });

    console.log('✓ 最小参数集测试成功');
    console.log('使用默认日期范围获取数据');

    // 显示完整内容
    console.log('=== 完整返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===');

    // 检查是否获取到了数据
    if (result.content[0].text.length > 100) {
      console.log('✓ 成功获取到默认日期范围的数据');
    }
    console.log('');
  } catch (error) {
    console.error('最小参数集测试失败:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试8: A股个股 - 002115三维通信
  console.log('8. 测试A股个股 002115 (三维通信):');
  try {
    const result = await indexData.run({
      code: '002115.SZ',
      start_date: '2025-09-25',
      end_date: '2025-09-29'
    });

    console.log('✓ A股个股数据获取成功');
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 显示完整内容
    console.log('=== 完整返回内容 ===');
    console.log(result.content[0].text);
    console.log('=== 内容结束 ===');

    // 检查个股特征
    const content = result.content[0].text;
    if (content.includes('SUNWAVE COMMUNICAT') || content.includes('三维通信')) {
      console.log('✓ 正确识别公司名称');
    }

    if (content.includes('成交量:')) {
      console.log('✓ 包含成交量数据');
    }

    // 提取股价信息
    const priceMatch = content.match(/收盘: ([\d.]+)/);
    if (priceMatch) {
      console.log('最新收盘价:', priceMatch[1], '元');
    }

    console.log('');
  } catch (error) {
    console.error('A股个股测试失败:', error.message);
  }

  console.log('测试完成!');
}

testIndexData().catch(console.error);