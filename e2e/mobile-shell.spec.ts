import { expect, test } from "@playwright/test";

import { expectMinimumTouchSize, expectNoHorizontalOverflow, mockBilibili } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockBilibili(page);
});

test("bottom navigation switches between mobile-only pages", async ({ page }) => {
  await page.goto("/#/settings");

  await expect(page.getByRole("heading", { name: "设置", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByRole("heading", { name: "搜索", level: 1 })).toBeVisible();
  await expect(page.getByPlaceholder("搜索视频、用户")).toBeVisible();

  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.getByRole("heading", { name: "推荐", level: 1 })).toBeVisible();
  await expect(page.getByRole("tab", { name: "每日" })).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("drawer contains only reachable mobile routes", async ({ page }) => {
  await page.goto("/#/");
  await page.getByRole("button", { name: "打开导航" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("推荐音乐", { exact: true })).toBeVisible();
  await expect(dialog.getByText("搜索", { exact: true })).toBeVisible();
  await expect(dialog.getByText("设置", { exact: true })).toBeVisible();
  await expect(dialog.getByText("本地音乐", { exact: true })).toHaveCount(0);
  await expect(dialog.getByText("下载记录", { exact: true })).toHaveCount(0);
});

test("shell controls meet mobile touch target requirements", async ({ page }) => {
  await page.goto("/#/settings");

  await expectMinimumTouchSize(page, "header button, nav button");
  await expectNoHorizontalOverflow(page);
});
