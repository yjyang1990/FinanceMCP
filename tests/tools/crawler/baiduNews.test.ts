import { searchBaiduNews } from '../../../src/tools/crawler/baiduNews';

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('baiduNews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchBaiduNews', () => {
    it('should search with single keyword successfully', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">测试新闻标题包含腾讯</a></h3>
          <div class="c-abstract">这是一条关于腾讯的测试新闻摘要</div>
          <span class="c-color-gray2" aria-label="发布于：2024-01-01">2024-01-01</span>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.baidu.com/s?rtt=1&bsst=1&cl=2&tn=news&ie=utf-8&word=%E8%85%BE%E8%AE%AF'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla'),
            'Accept': expect.stringContaining('text/html'),
          }),
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        title: '测试新闻标题包含腾讯',
        summary: '这是一条关于腾讯的测试新闻摘要',
        url: 'https://example.com/news1',
        source: '百度新闻',
        publishTime: '2024-01-01',
        keywords: ['腾讯']
      });
    });

    it('should search with multiple keywords successfully', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">美联储加息决定发布</a></h3>
          <div class="c-abstract">美联储宣布最新加息决定</div>
          <span class="c-color-gray2" aria-label="发布于：2024-01-01">2024-01-01</span>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['美联储', '加息']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('word=%E7%BE%8E%E8%81%94%E5%82%A8%20%E5%8A%A0%E6%81%AF'),
        expect.any(Object)
      );

      expect(result).toHaveLength(1);
      expect(result[0].keywords).toEqual(['美联储', '加息']);
    });

    it('should handle network timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await searchBaiduNews(['测试']);

      expect(result).toEqual([]);
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => '',
      } as Response);

      const result = await searchBaiduNews(['测试']);

      expect(result).toEqual([]);
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchBaiduNews(['测试']);

      expect(result).toEqual([]);
    });

    it('should parse multiple news items correctly', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">第一条新闻腾讯</a></h3>
          <div class="c-abstract">第一条新闻摘要</div>
          <span class="c-color-gray2" aria-label="发布于：2024-01-01">2024-01-01</span>
        </div>
        <div class="result">
          <h3><a href="https://example.com/news2">第二条新闻腾讯</a></h3>
          <div class="c-abstract">第二条新闻摘要</div>
          <span class="c-color-gray2" aria-label="发布于：2024-01-02">2024-01-02</span>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('第一条新闻腾讯');
      expect(result[1].title).toBe('第二条新闻腾讯');
    });

    it('should remove duplicate news items', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">重复新闻标题腾讯</a></h3>
          <div class="c-abstract">重复新闻摘要</div>
        </div>
        <div class="result">
          <h3><a href="https://example.com/news2">重复新闻标题腾讯</a></h3>
          <div class="c-abstract">重复新闻摘要</div>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toHaveLength(1);
    });

    it('should limit results to 15 items', async () => {
      let mockHtml = '';
      for (let i = 1; i <= 20; i++) {
        mockHtml += `
          <div class="result">
            <h3><a href="https://example.com/news${i}">新闻${i}腾讯</a></h3>
            <div class="c-abstract">新闻${i}摘要</div>
          </div>
        `;
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result.length).toBeLessThanOrEqual(15);
    });

    it('should use fallback strategy when main strategy fails', async () => {
      const mockHtml = `
        <h3 class="t"><a href="https://example.com/news1">备用策略新闻腾讯</a></h3>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('备用策略新闻腾讯');
      expect(result[0].publishTime).toBe('未知时间');
    });

    it('should handle news items without summary', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">无摘要新闻腾讯</a></h3>
          <span class="c-color-gray2" aria-label="发布于：2024-01-01">2024-01-01</span>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toHaveLength(1);
      expect(result[0].summary).toBe('无摘要新闻腾讯');
    });

    it('should handle news items without time', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">无时间新闻腾讯</a></h3>
          <div class="c-abstract">无时间新闻摘要</div>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toHaveLength(1);
      expect(result[0].publishTime).toBe('未知时间');
    });

    it('should filter out news items that do not contain keywords', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">相关新闻腾讯</a></h3>
          <div class="c-abstract">包含腾讯的新闻</div>
        </div>
        <div class="result">
          <h3><a href="https://example.com/news2">不相关新闻</a></h3>
          <div class="c-abstract">不包含关键词的新闻</div>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('相关新闻腾讯');
    });

    it('should handle HTML with special characters and tags', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">新闻<em>腾讯</em>标题</a></h3>
          <div class="c-abstract">摘要包含<br/>换行符和<strong>粗体</strong>腾讯</div>
          <span class="c-color-gray2" aria-label="发布于：2024-01-01">2024-01-01</span>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('新闻腾讯标题');
      expect(result[0].summary).toBe('摘要包含 换行符和粗体腾讯');
    });

    it('should handle empty keyword array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<div></div>',
      } as Response);

      const result = await searchBaiduNews([]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('word='),
        expect.any(Object)
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed HTML gracefully', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">不完整的HTML
          <div class="c-abstract">缺少结束标签的摘要腾讯
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['腾讯']);

      expect(result).toBeInstanceOf(Array);
    });

    it('should properly encode Chinese characters in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<div></div>',
      } as Response);

      await searchBaiduNews(['中文测试']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('%E4%B8%AD%E6%96%87%E6%B5%8B%E8%AF%95'),
        expect.any(Object)
      );
    });

    it('should match keywords with OR logic', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">只包含美联储的新闻</a></h3>
          <div class="c-abstract">美联储相关内容</div>
        </div>
        <div class="result">
          <h3><a href="https://example.com/news2">只包含加息的新闻</a></h3>
          <div class="c-abstract">加息相关内容</div>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['美联储', '加息']);

      expect(result).toHaveLength(2);
    });

    it('should be case insensitive for keyword matching', async () => {
      const mockHtml = `
        <div class="result">
          <h3><a href="https://example.com/news1">APPLE公司新闻</a></h3>
          <div class="c-abstract">Apple相关内容</div>
        </div>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await searchBaiduNews(['apple']);

      expect(result).toHaveLength(1);
    });
  });
});