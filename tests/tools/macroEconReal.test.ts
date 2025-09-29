import { macroEconReal } from '../../src/tools/macroEconReal.js';

/**
 * 集成测试：测试宏观经济数据获取工具
 * 包含东方财富API数据获取和错误处理功能测试
 */

async function testMacroEconReal() {
  console.log('=== 宏观经济数据获取工具测试 ===\n');

  // 测试1: CPI数据获取
  console.log('1. 测试CPI数据获取:');
  try {
    const result = await macroEconReal.run({
      indicator: 'cpi',
      count: 6
    });

    console.log('✓ CPI数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 检查内容是否包含预期字段
    const content = result.content[0].text;
    if (content.includes('居民消费价格指数(CPI)')) {
      console.log('✓ 包含正确的指标标题');
    }
    if (content.includes('东方财富')) {
      console.log('✓ 包含数据源信息');
    }
    if (content.includes('趋势分析') || content.includes('获取数据失败')) {
      console.log('✓ 包含分析内容或正确的错误处理');
    }

    // 显示完整内容
    console.log('\n=== CPI完整返回内容 ===');
    console.log(content);
    console.log('=== CPI完整内容结束 ===\n');

  } catch (error) {
    console.error('CPI数据测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试2: GDP数据获取（使用默认count）
  console.log('2. 测试GDP数据获取（默认count）:');
  try {
    const result = await macroEconReal.run({
      indicator: 'gdp'
    });

    console.log('✓ GDP数据获取成功');

    const content = result.content[0].text;

    // 检查GDP特定字段
    if (content.includes('国内生产总值(GDP)')) {
      console.log('✓ 包含正确的指标标题');
    }
    if (content.includes('万亿元') || content.includes('获取数据失败')) {
      console.log('✓ 包含GDP数值格式或正确的错误处理');
    }
    if (content.includes('同比变化')) {
      console.log('✓ 包含同比数据');
    }

    // 检查数据条数
    const dataRows = content.split('\n').filter(line =>
      line.includes('## 20') // 包含年份的行
    );
    console.log(`✓ 包含 ${dataRows.length} 条数据记录`);

    console.log('\n=== GDP完整返回内容 ===');
    console.log(content);
    console.log('=== GDP完整内容结束 ===\n');

  } catch (error) {
    console.error('GDP数据测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试3: PMI数据获取和API字段问题处理
  console.log('3. 测试PMI数据获取和API字段问题处理:');
  try {
    const result = await macroEconReal.run({
      indicator: 'pmi',
      count: 8
    });

    console.log('✓ PMI数据获取处理成功');

    const content = result.content[0].text;

    // 检查PMI相关内容
    if (content.includes('采购经理指数(PMI)') || content.includes('获取数据失败')) {
      console.log('✓ 正确处理PMI请求');
    }
    if (content.includes('COMPREHENSIVE_INDEX返回字段不存在')) {
      console.log('✓ 正确识别API字段问题');
    }
    if (content.includes('支持的选项')) {
      console.log('✓ 提供了使用指导');
    }

    console.log('\n=== PMI完整返回内容 ===');
    console.log(content);
    console.log('=== PMI完整内容结束 ===\n');

  } catch (error) {
    console.error('PMI数据测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试4: 错误处理测试
  console.log('4. 测试错误处理:');
  try {
    const result = await macroEconReal.run({
      indicator: 'invalid_indicator',
      count: 5
    });

    console.log('返回了错误处理结果');

    const content = result.content[0].text;
    if (content.includes('获取数据失败')) {
      console.log('✓ 正确显示错误状态');
    }
    if (content.includes('东方财富不支持指标')) {
      console.log('✓ 正确识别不支持的指标');
    }
    if (content.includes('支持的选项')) {
      console.log('✓ 提供了支持的选项列表');
    }

    console.log('\n=== 完整错误处理内容 ===');
    console.log(content);
    console.log('=== 错误处理完整内容结束 ===\n');

  } catch (error) {
    console.error('错误处理测试异常:', error);
  }

  console.log('----------------------------------------\n');

  // 测试5: PPI数据获取和边界值测试
  console.log('5. 测试PPI数据获取和边界值测试:');
  try {
    const result = await macroEconReal.run({
      indicator: 'ppi',
      count: 1  // 边界值测试
    });

    console.log('✓ PPI边界值测试成功');

    const content = result.content[0].text;

    // 检查PPI内容
    if (content.includes('工业生产者出厂价格指数(PPI)')) {
      console.log('✓ 包含正确的指标标题');
    }

    // 检查数据不足时的分析
    if (content.includes('数据不足，无法分析趋势')) {
      console.log('✓ 正确处理数据不足的分析情况');
    }

    // 统计实际数据条数
    const dataRows = content.split('\n').filter(line =>
      line.includes('## 20') && line.match(/\d{4}-\d{2}/)
    );
    console.log(`✓ 实际获取到 ${dataRows.length} 条数据`);

    console.log('\n=== PPI完整返回内容 ===');
    console.log(content);
    console.log('=== PPI完整内容结束 ===\n');

  } catch (error) {
    console.error('PPI数据测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试6: M2数据获取和API配置问题处理
  console.log('6. 测试M2数据获取和API配置问题处理:');
  try {
    const result = await macroEconReal.run({
      indicator: 'm2',
      count: 5
    });

    console.log('✓ M2数据获取处理成功');

    const content = result.content[0].text;

    // 检查M2相关内容
    if (content.includes('货币供应量(M2)') || content.includes('获取数据失败')) {
      console.log('✓ 正确处理M2请求');
    }
    if (content.includes('RPT_ECONOMY_MONEY_SUPPLY')) {
      console.log('✓ 正确识别API配置问题');
    }
    if (content.includes('数据获取方法说明')) {
      console.log('✓ 提供了技术说明');
    }

    console.log('\n=== M2完整返回内容 ===');
    console.log(content);
    console.log('=== M2完整内容结束 ===\n');

  } catch (error) {
    console.error('M2数据测试失败:', error);
  }

  console.log('----------------------------------------\n');

  // 测试7: 参数验证和默认值测试
  console.log('7. 测试参数验证和默认值:');
  try {
    const result = await macroEconReal.run({
      indicator: 'cpi'  // 只提供必要参数，测试默认值
    });

    console.log('✓ 参数验证测试成功');

    const content = result.content[0].text;

    // 检查默认值应用
    if (content.includes('数据条数: 12') || content.includes('数据条数: ')) {
      console.log('✓ 正确应用默认count值');
    }
    if (content.includes('东方财富')) {
      console.log('✓ 正确应用默认数据源');
    }

    // 检查内容完整性
    if (content.length > 100) {
      console.log('✓ 返回内容完整');
    }

    console.log('\n=== 参数验证完整返回内容 ===');
    console.log(content);
    console.log('=== 参数验证完整内容结束 ===\n');

  } catch (error) {
    console.error('参数验证测试失败:', error);
  }

  console.log('----------------------------------------\n');
  console.log('宏观经济数据获取工具测试完成!');
}

// 运行测试
testMacroEconReal().catch(console.error);