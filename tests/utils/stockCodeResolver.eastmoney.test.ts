import { resolveStockCodes, extractStockCodes } from '../../src/utils/stockCodeResolver.eastmoney.js';

/**
 * 测试东方财富版本的股票代码解析器
 */

async function testStockCodeResolver() {
  console.log('=== 东方财富股票代码解析器测试 ===\n');

  // 测试1: 提取股票代码
  console.log('1. 测试提取股票代码:');
  const testText = `
    今日关注的股票包括:
    - 浦发银行 600000.SH
    - 平安银行 000001.SZ
    - 贵州茅台 600519.SH
    还有一些其他内容...
  `;

  const extractedCodes = extractStockCodes(testText);
  console.log('  提取结果:', extractedCodes);
  console.log('  ✓ 提取到', extractedCodes.length, '个股票代码\n');

  // 测试2: 解析单个股票代码
  console.log('2. 测试解析单个股票代码:');
  try {
    const result = await resolveStockCodes(['600000.SH']);
    console.log('  解析结果:');
    console.log(result);
    console.log('  ✓ 单个代码解析成功\n');
  } catch (error) {
    console.error('  ✗ 解析失败:', error);
  }

  // 测试3: 批量解析股票代码
  console.log('3. 测试批量解析股票代码:');
  try {
    const codes = ['600000.SH', '000001.SZ', '600519.SH', '600036.SH', '601318.SH'];
    console.log('  测试代码:', codes.join(', '));

    const startTime = Date.now();
    const result = await resolveStockCodes(codes);
    const duration = Date.now() - startTime;

    console.log('  解析结果:');
    console.log(result);
    console.log(`  ✓ 批量解析成功 (耗时: ${duration}ms)\n`);
  } catch (error) {
    console.error('  ✗ 解析失败:', error);
  }

  // 测试4: 处理无效代码
  console.log('4. 测试处理无效代码:');
  try {
    const result = await resolveStockCodes(['INVALID', '999999.SH', '600000.SH']);
    console.log('  解析结果:');
    console.log(result);
    console.log('  ✓ 无效代码处理正常\n');
  } catch (error) {
    console.error('  ✗ 解析失败:', error);
  }

  // 测试5: 处理空数组
  console.log('5. 测试处理空数组:');
  try {
    const result = await resolveStockCodes([]);
    console.log('  解析结果:', result === '' ? '(空字符串)' : result);
    console.log('  ✓ 空数组处理正常\n');
  } catch (error) {
    console.error('  ✗ 解析失败:', error);
  }

  // 测试6: 去重测试
  console.log('6. 测试去重功能:');
  try {
    const result = await resolveStockCodes(['600000.SH', '600000.SH', '000001.SZ', '600000.SH']);
    console.log('  解析结果:');
    console.log(result);
    console.log('  ✓ 去重功能正常\n');
  } catch (error) {
    console.error('  ✗ 解析失败:', error);
  }

  // 测试7: 性能测试 - 大批量代码
  console.log('7. 性能测试 (20个股票代码):');
  try {
    const largeBatch = [
      '600000.SH', '600036.SH', '600519.SH', '601318.SH', '601398.SH',
      '000001.SZ', '000002.SZ', '000858.SZ', '002415.SZ', '300059.SZ',
      '600030.SH', '600050.SH', '600104.SH', '600276.SH', '600585.SH',
      '601166.SH', '601328.SH', '601668.SH', '601857.SH', '601988.SH'
    ];

    const startTime = Date.now();
    const result = await resolveStockCodes(largeBatch);
    const duration = Date.now() - startTime;

    const lines = result.split('\n').filter(line => line.includes('**')).length;
    console.log(`  成功解析: ${lines} 个股票代码`);
    console.log(`  总耗时: ${duration}ms`);
    console.log(`  平均耗时: ${(duration / largeBatch.length).toFixed(2)}ms/股票`);
    console.log('  ✓ 性能测试完成\n');
  } catch (error) {
    console.error('  ✗ 性能测试失败:', error);
  }

  console.log('=== 测试完成 ===');
}

// 运行测试
testStockCodeResolver().catch(console.error);
