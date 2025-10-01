/**
 * 东方财富 API 探测测试
 * 目标：寻找可替代 Tushare API 的接口
 */

interface EastMoneyStockInfo {
  code: string;
  name: string;
  fullname?: string;
}

/**
 * 测试东方财富股票基本信息接口
 */
async function testEastMoneyStockBasic() {
  console.log('=== 东方财富 API 测试 ===\n');

  // 测试股票代码
  const testCodes = ['600000.SH', '000001.SZ', '600519.SH'];

  console.log(`测试股票代码: ${testCodes.join(', ')}\n`);

  // 方案1: 东方财富行情中心接口
  console.log('1. 测试行情中心接口 (quote.eastmoney.com):');
  try {
    for (const code of testCodes) {
      // 转换代码格式: 600000.SH -> 1.600000 (上海), 000001.SZ -> 0.000001 (深圳)
      const [stockCode, market] = code.split('.');
      const marketCode = market === 'SH' ? '1' : '0';
      const eastMoneyCode = `${marketCode}.${stockCode}`;

      const url = `http://push2.eastmoney.com/api/qt/stock/get?secid=${eastMoneyCode}&fields=f57,f58,f107,f108`;

      console.log(`  请求: ${code} (${eastMoneyCode})`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'http://quote.eastmoney.com/'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✓ 响应成功:`, JSON.stringify(data, null, 2));
      } else {
        console.log(`  ✗ 响应失败: ${response.status}`);
      }
      console.log();
    }
  } catch (error) {
    console.error('  ✗ 请求失败:', error);
  }

  // 方案2: 东方财富数据中心接口
  console.log('\n2. 测试数据中心接口 (datacenter-web.eastmoney.com):');
  try {
    // 获取全部A股基本信息
    const url = 'http://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_LICO_FN_CPD&columns=ALL&pageSize=50';

    console.log(`  请求: 全部A股列表 (前50条)`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'http://data.eastmoney.com/'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✓ 响应成功:`);
      console.log(`  总记录数: ${data.result?.count || 0}`);
      console.log(`  示例数据 (前3条):`);
      if (data.result?.data) {
        data.result.data.slice(0, 3).forEach((item: any) => {
          console.log(`    - ${item.SECURITY_CODE}: ${item.SECURITY_NAME_ABBR} (${item.SECURITY_NAME})`);
        });
      }
      console.log(`\n  完整响应结构:`, JSON.stringify(data, null, 2).slice(0, 1000) + '...');
    } else {
      console.log(`  ✗ 响应失败: ${response.status}`);
    }
  } catch (error) {
    console.error('  ✗ 请求失败:', error);
  }

  // 方案3: 东方财富搜索接口 (最推荐)
  console.log('\n3. 测试搜索接口 (search-api-web.eastmoney.com):');
  try {
    const url = 'http://searchapi.eastmoney.com/api/suggest/get?input=600000&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=5';

    console.log(`  请求: 搜索 "600000"`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'http://quote.eastmoney.com/'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✓ 响应成功:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`  ✗ 响应失败: ${response.status}`);
    }
  } catch (error) {
    console.error('  ✗ 请求失败:', error);
  }

  // 方案4: 天天基金网接口 (东方财富旗下)
  console.log('\n4. 测试天天基金网接口 (fundgz.1234567.com.cn):');
  try {
    const url = 'http://fund.eastmoney.com/js/fundcode_search.js';

    console.log(`  请求: 全部基金代码列表`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'http://fund.eastmoney.com/'
      }
    });

    if (response.ok) {
      const text = await response.text();
      console.log(`  ✓ 响应成功 (前500字符):`);
      console.log(text.slice(0, 500) + '...');
    } else {
      console.log(`  ✗ 响应失败: ${response.status}`);
    }
  } catch (error) {
    console.error('  ✗ 请求失败:', error);
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testEastMoneyStockBasic().catch(console.error);
