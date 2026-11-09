import { test, expect } from "@playwright/test";

test.describe("DEVFORCE Web Smoke Suite", () => {
  test("loads the mission control dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/XEROVA AI DEVFORCE/);
    await expect(page.locator("h1")).toContainText("Workforce Mission Control");
  });

  test("can navigate to Task DAG placeholder", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Task DAG");
    await expect(page.locator("h1")).toContainText("Task Dependency Graph");
  });
});

