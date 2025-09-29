import { searchBaiduNews } from '../../../build/tools/crawler/baiduNews.js';

async function testBaiduNews() {
  console.log('=== 百度新闻爬虫测试 ===\n');

  // 测试1: 股票关键词
  console.log('1. 测试股票关键词:');
  try {
    const stockResult = await searchBaiduNews(['股票']);
    console.log(`结果数量: ${stockResult.length}`);
    if (stockResult.length > 0) {
      console.log('前3条结果:');
      stockResult.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. 标题: ${item.title}`);
        console.log(`   来源: ${item.source}`);
        console.log(`   时间: ${item.publishTime}`);
        console.log(`   URL: ${item.url}`);
        console.log('');
      });
    } else {
      console.log('未获取到搜索结果');
    }
  } catch (error) {
    console.error('股票搜索出错:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试2: 财经新闻
  console.log('2. 测试财经新闻关键词:');
  try {
    const financeResult = await searchBaiduNews(['财经', '新闻']);
    console.log(`结果数量: ${financeResult.length}`);
    if (financeResult.length > 0) {
      console.log('前2条结果:');
      financeResult.slice(0, 2).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   摘要: ${item.summary}`);
        console.log('');
      });
    } else {
      console.log('未获取到搜索结果');
    }
  } catch (error) {
    console.error('财经新闻搜索出错:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试3: 上证指数
  console.log('3. 测试上证指数关键词:');
  try {
    const indexResult = await searchBaiduNews(['上证指数']);
    console.log(`结果数量: ${indexResult.length}`);
    if (indexResult.length > 0) {
      console.log('所有标题:');
      indexResult.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
      });
      console.log('');
    } else {
      console.log('未获取到搜索结果');
    }
  } catch (error) {
    console.error('上证指数搜索出错:', error.message);
  }

  console.log('----------------------------------------\n');

  // 测试4: 空关键词数组
  console.log('4. 测试空关键词数组:');
  try {
    const emptyResult = await searchBaiduNews([]);
    console.log(`结果数量: ${emptyResult.length}`);
    if (emptyResult.length === 0) {
      console.log('✓ 空关键词正确返回空数组');
    }
  } catch (error) {
    console.error('空关键词测试出错:', error.message);
  }

  console.log('测试完成!');
}

testBaiduNews().catch(console.error);