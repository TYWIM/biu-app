import { expect, type Page } from "@playwright/test";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const mockArchives = [
  {
    aid: 101,
    bvid: "BV1mock00001",
    title: "移动端回归测试歌曲一",
    cover: "https://i0.hdslb.com/bfs/archive/mock-cover-1.jpg",
    duration: 180,
    stat: { view: 1000 },
    author: { mid: 10, name: "测试歌手" },
  },
  {
    aid: 102,
    bvid: "BV1mock00002",
    title: "移动端回归测试歌曲二",
    cover: "https://i0.hdslb.com/bfs/archive/mock-cover-2.jpg",
    duration: 240,
    stat: { view: 2000 },
    author: { mid: 11, name: "测试作者" },
  },
];

interface MockBilibiliOptions {
  offline?: boolean;
  failRecommendation?: boolean;
  failSearch?: boolean;
}

export async function mockBilibili(page: Page, options: MockBilibiliOptions = {}) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "user-token",
      JSON.stringify({
        state: {
          tokenData: {},
          nextCheckRefreshTime: Math.floor(Date.now() / 1000) + 86_400,
        },
        version: 0,
      }),
    );
  });

  if (options.offline) {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => false });
    });
  }

  await page.route("https://i0.hdslb.com/**", route =>
    route.fulfill({ status: 200, contentType: "image/png", body: transparentPng }),
  );

  await page.route("https://www.bilibili.com/**", route =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html></html>" }),
  );

  await page.route("https://passport.bilibili.com/**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "0", ttl: 1, data: { refresh: false } }),
    }),
  );

  await page.route("https://s.search.bilibili.com/**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "0", ttl: 1, data: {} }),
    }),
  );

  await page.route("https://api.bilibili.com/**", route => {
    const url = new URL(route.request().url());

    if (options.failRecommendation && url.pathname === "/x/web-interface/region/feed/rcmd") {
      return route.abort("internetdisconnected");
    }

    if (options.failSearch && url.pathname === "/x/web-interface/wbi/search/type") {
      return route.abort("internetdisconnected");
    }

    if (url.pathname === "/x/web-interface/nav") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          message: "0",
          ttl: 1,
          data: {
            isLogin: false,
            wbi_img: {
              img_url: "https://i0.hdslb.com/bfs/wbi/abcdefghijklmnopqrstuvwxyz123456.png",
              sub_url: "https://i0.hdslb.com/bfs/wbi/123456abcdefghijklmnopqrstuvwxyz.png",
            },
          },
        }),
      });
    }

    if (url.pathname === "/x/web-interface/region/feed/rcmd") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 0, message: "0", ttl: 1, data: { archives: mockArchives } }),
      });
    }

    if (url.pathname === "/x/centralization/interface/music/comprehensive/web/rank") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 0, message: "0", ttl: 1, data: { list: [] } }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "0", ttl: 1, data: {} }),
    });
  });
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

export async function expectMinimumTouchSize(page: Page, selector: string, minimum = 44) {
  const undersized = await page.locator(selector).evaluateAll(
    (elements, min) =>
      elements
        .filter(element => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
        })
        .map(element => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute("aria-label") || element.textContent?.trim(),
            width: rect.width,
            height: rect.height,
          };
        })
        .filter(rect => rect.width < min || rect.height < min),
    minimum,
  );

  expect(undersized).toEqual([]);
}
