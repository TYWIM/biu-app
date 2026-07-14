import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, mockBilibili } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockBilibili(page);
});

test("recommendation covers finish loading instead of remaining skeletons", async ({ page }) => {
  await page.goto("/#/");

  const cover = page.locator('img[src*="mock-cover"]').first();
  await expect(cover).toBeVisible();
  await expect
    .poll(() =>
      cover.evaluate(image => ({
        width: (image as HTMLImageElement).naturalWidth,
        opacity: getComputedStyle(image).opacity,
      })),
    )
    .toEqual({ width: 1, opacity: "1" });

  await expectNoHorizontalOverflow(page);
});
