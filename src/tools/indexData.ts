import yahooFinance from 'yahoo-finance2';

export const indexData = {
  name: "index_data",
  description: "获取指定股票指数的数据，例如上证指数、深证成指等",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "指数代码，如'000001.SS'表示上证指数，'399001.SZ'表示深证成指"
      },
      start_date: {
        type: "string",
        description: "起始日期，格式为YYYY-MM-DD，如'2023-01-01'"
      },
      end_date: {
        type: "string",
        description: "结束日期，格式为YYYY-MM-DD，如'2023-01-31'"
      }
    },
    required: ["code"]
  },
  async run(args: { code: string; start_date?: string; end_date?: string }) {
    try {
      console.log(`使用Yahoo Finance API获取指数${args.code}的数据`);

      // 默认参数设置
      const today = new Date();
      const defaultEndDate = today.toISOString().slice(0, 10);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const defaultStartDate = oneMonthAgo.toISOString().slice(0, 10);

      const startDate = args.start_date || defaultStartDate;
      const endDate = args.end_date || defaultEndDate;

      // 获取当前报价信息
      const quote = await yahooFinance.quote(args.code);
      if (!quote) {
        throw new Error(`未找到指数${args.code}的数据`);
      }

      // 获取历史数据 - 为了计算第一天的涨跌幅，需要获取前一天的数据
      let historicalData: any[] = [];
      try {
        // 计算前一天日期用于获取完整的涨跌幅数据
        const prevDate = new Date(startDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const extendedStartDate = prevDate.toISOString().slice(0, 10);

        const chartData = await yahooFinance.chart(args.code, {
          period1: extendedStartDate, // 从前一天开始获取
          period2: endDate,
          interval: '1d'
        });
        historicalData = chartData.quotes || [];
      } catch (error: any) {
        console.warn(`获取历史数据失败: ${error.message}，将仅返回当前数据`);
      }

      // 处理数据 - 优先使用历史数据，如果没有则使用当前报价
      let indexDataArray: any[] = [];

      if (historicalData.length > 0) {
        // 使用历史数据 - 需要计算正确的涨跌幅
        indexDataArray = historicalData.map((item: any, index: number) => {
          let change = 0;
          let pct_chg = "0.00";

          // 计算涨跌：当前收盘价 - 前一日收盘价
          // Yahoo Finance数据是从旧到新排列，所以前一日是index-1
          if (index > 0) {
            const prevClose = historicalData[index - 1].close; // 前一日收盘价
            change = item.close - prevClose;
            pct_chg = ((change / prevClose) * 100).toFixed(2);
          }

          return {
            date: new Date(item.date).toISOString().slice(0, 10),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            change: change,
            pct_chg: pct_chg
          };
        }).filter(item => item.open && item.close) // 过滤无效数据
          .filter(item => item.date >= startDate && item.date <= endDate) // 只保留用户请求的日期范围
          .reverse(); // 反转顺序，使最新日期在前

        // 检查是否需要补充当前数据
        const latestHistoricalDate = indexDataArray.length > 0 ? indexDataArray[0].date : null;
        const requestedEndDate = endDate;
        const quoteDate = quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

        // 如果请求的结束日期比最新历史数据更新，且有当前报价数据，且当前日期在请求范围内，则补充
        if (latestHistoricalDate && requestedEndDate > latestHistoricalDate && quote.regularMarketPrice && quoteDate <= endDate) {
          // 计算相对于最近历史数据的涨跌幅
          let currentChange = quote.regularMarketChange || 0;
          let currentPctChg = quote.regularMarketChangePercent?.toFixed(2) || '0.00';

          // 如果有历史数据，重新计算涨跌幅（相对于最新的历史收盘价）
          if (indexDataArray.length > 0 && quote.regularMarketPrice) {
            const latestHistoricalClose = indexDataArray[0].close;
            currentChange = quote.regularMarketPrice - latestHistoricalClose;
            currentPctChg = ((currentChange / latestHistoricalClose) * 100).toFixed(2);
          }

          const currentData = {
            date: quoteDate,
            open: quote.regularMarketOpen || quote.regularMarketPrice,
            high: quote.regularMarketDayHigh || quote.regularMarketPrice,
            low: quote.regularMarketDayLow || quote.regularMarketPrice,
            close: quote.regularMarketPrice,
            volume: quote.regularMarketVolume || 0,
            change: currentChange,
            pct_chg: currentPctChg
          };

          // 如果当前数据的日期比历史数据更新，则添加到开头
          if (currentData.date > latestHistoricalDate) {
            indexDataArray.unshift(currentData);
            console.log(`补充当前数据: ${currentData.date}`);
          }
        }
      } else {
        // 使用当前报价数据
        const quoteDate = quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const currentData = {
          date: quoteDate,
          open: quote.regularMarketOpen || quote.regularMarketPrice,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice,
          low: quote.regularMarketDayLow || quote.regularMarketPrice,
          close: quote.regularMarketPrice,
          volume: quote.regularMarketVolume || 0,
          change: quote.regularMarketChange || 0,
          pct_chg: quote.regularMarketChangePercent?.toFixed(2) || '0.00'
        };
        indexDataArray = [currentData];
      }

      if (indexDataArray.length === 0) {
        throw new Error(`未找到指数${args.code}的有效数据`);
      }

      // 收集涨跌数据用于生成趋势分析
      const closePrices = indexDataArray.map((item: any) => parseFloat(item.close));
      let trend = "持平";
      let trendAnalysis = "";

      if (closePrices.length > 1) {
        const firstPrice = closePrices[closePrices.length - 1]; // 最早的收盘价
        const lastPrice = closePrices[0]; // 最近的收盘价
        const change = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);

        if (lastPrice > firstPrice) {
          trend = `上涨 ${change}%`;
          trendAnalysis = `在此期间，${args.code}整体呈上涨趋势，累计涨幅达${change}%。`;
        } else if (lastPrice < firstPrice) {
          trend = `下跌 ${Math.abs(parseFloat(change))}%`;
          trendAnalysis = `在此期间，${args.code}整体呈下跌趋势，累计跌幅达${Math.abs(parseFloat(change))}%。`;
        }
      } else if (indexDataArray.length === 1) {
        const changePercent = parseFloat(indexDataArray[0].pct_chg);
        if (changePercent > 0) {
          trend = `上涨 ${changePercent}%`;
          trendAnalysis = `当日${args.code}上涨${changePercent}%。`;
        } else if (changePercent < 0) {
          trend = `下跌 ${Math.abs(changePercent)}%`;
          trendAnalysis = `当日${args.code}下跌${Math.abs(changePercent)}%。`;
        }
      }

      // 确定实际数据的日期范围
      let actualStartDate = startDate;
      let actualEndDate = endDate;

      if (indexDataArray.length > 0) {
        // 获取所有日期并排序以确定真正的开始和结束日期
        const allDates = indexDataArray.map(item => item.date).sort();
        actualStartDate = allDates[0]; // 最早日期
        actualEndDate = allDates[allDates.length - 1]; // 最晚日期
      }

      // 格式化输出
      const formattedData = indexDataArray.map((data: any) => {
        return `## ${data.date}\n开盘: ${data.open}  最高: ${data.high}  最低: ${data.low}  收盘: ${data.close}\n涨跌: ${data.change}  涨跌幅: ${data.pct_chg}%  成交量: ${data.volume}\n`;
      }).join('\n---\n\n');

      return {
        content: [
          {
            type: "text",
            text: `# ${args.code}指数数据 (${quote.displayName || quote.shortName || args.code})\n\n` +
                 `## 数据期间: ${actualStartDate} 至 ${actualEndDate}\n` +
                 `## 期间走势: ${trend}\n${trendAnalysis}\n\n---\n\n${formattedData}`
          }
        ]
      };
    } catch (error) {
      console.error("获取指数数据失败:", error);

      return {
        content: [
          {
            type: "text",
            text: `# 获取指数${args.code}数据失败\n\n无法从Yahoo Finance API获取数据：${error instanceof Error ? error.message : String(error)}\n\n请检查指数代码是否正确，常用指数代码：\n- 上证指数: 000001.SS\n- 深证成指: 399001.SZ\n- 创业板指: 399006.SZ\n- 沪深300: 000300.SS\n- 中证500: 000905.SS`
          }
        ]
      };
    }
  }
}; 