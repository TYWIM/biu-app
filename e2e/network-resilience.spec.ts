import { expect, test } from "@playwright/test";

import { mockBilibili } from "./fixtures";

test("offline recommendation loading shows a retryable error state", async ({ page }) => {
  await mockBilibili(page, { offline: true, failRecommendation: true });
  await page.goto("/#/");

  const errorState = page.getByTestId("recommendation-error");
  await expect(errorState).toBeVisible();
  await expect(errorState.getByRole("button")).toBeVisible();
});

test("offline search distinguishes a network failure from empty results", async ({ page }) => {
  await mockBilibili(page, { offline: true, failSearch: true });
  await page.goto("/#/search");

  const searchInput = page.locator("input").first();
  await searchInput.fill("music");
  await searchInput.press("Enter");

  const errorState = page.getByTestId("search-video-error");
  await expect(errorState).toBeVisible();
  const retryButton = errorState.getByRole("button");
  await expect(retryButton).toBeVisible();
  await expect(retryButton).toBeInViewport();
  await expect(searchInput).not.toBeFocused();
});
