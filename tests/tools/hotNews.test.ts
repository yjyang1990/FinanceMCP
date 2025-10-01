import { hotNews } from '../../src/tools/hotNews.js';

/**
 * 集成测试：测试7x24热点新闻
 * 包含API数据获取和错误处理功能测试
 */

async function testHotNews() {
  console.log('=== 7x24热点新闻测试 ===\n');

  // 测试1: 正常数据获取（获取10条）
  console.log('1. 测试正常数据获取（获取10条）:');
  try {
    const result = await hotNews.run({ limit: 10 });

    console.log('✓ 数据获取成功');
    console.log('响应内容类型:', typeof result.content[0].text);
    console.log('响应内容长度:', result.content[0].text.length, '字符');

    // 验证返回内容
    const content = result.content[0].text;
    if (content.includes('7x24 热点')) {
      console.log('✓ 包含标题');
    }
    if (content.includes('东方财富')) {
      console.log('✓ 包含来源信息');
    }

    console.log('\n=== 完整返回内容 ===');
    console.log(content);
    console.log('=== 完整内容结束 ===\n');

  } catch (error) {
    console.error('✗ 数据获取测试失败:', error);
  }

  // 测试2: 使用默认参数
  console.log('\n2. 测试默认参数（不传limit）:');
  try {
    const result = await hotNews.run();
    const content = result.content[0].text;

    if (content.includes('7x24 热点')) {
      console.log('✓ 默认参数正常工作');
      console.log('返回内容长度:', content.length, '字符');
    }
  } catch (error) {
    console.error('✗ 默认参数测试失败:', error);
  }

  // 测试3: 极限参数
  console.log('\n3. 测试极限参数（limit=1）:');
  try {
    const result = await hotNews.run({ limit: 1 });
    const content = result.content[0].text;

    if (content.includes('7x24 热点')) {
      console.log('✓ 极限参数正常工作');
    }
  } catch (error) {
    console.error('✗ 极限参数测试失败:', error);
  }

  console.log('\n测试完成!');
}

// 运行测试
testHotNews().catch(console.error);
