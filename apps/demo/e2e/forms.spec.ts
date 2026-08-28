import { test, expect } from "@playwright/test";

test("fills the Product Hunt form through the approval modal", async ({ page }) => {
  await page.goto("/product-hunt");
  await page.getByRole("button", { name: "Fill with AI" }).click();
  await expect(page.getByRole("dialog", { name: "Review AI values" })).toBeVisible();
  await page.getByRole("button", { name: "Approve & fill" }).click();
  await expect(page.locator('input[name="projectName"]')).toHaveValue("FormSync");
  await expect(page.locator('input[name="tagline"]')).toHaveValue(/Local AI/);
  await expect(page.getByTestId("fill-log")).toContainText("Filled:");
});

test("fills GitHub radios, selects, and checkbox", async ({ page }) => {
  await page.goto("/github");
  await page.getByRole("button", { name: "Fill with AI" }).click();
  await page.getByRole("button", { name: "Approve & fill" }).click();
  await expect(page.locator('input[name="name"]')).toHaveValue("formsync");
  await expect(page.locator('input[name="visibility"][value="public"]')).toBeChecked();
  await expect(page.locator('select[name="license"]')).toHaveValue("MIT");
  await expect(page.locator('input[name="initializeReadme"]')).toBeChecked();
});

test("shows the connect modal when no AI host is configured", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByTestId("offline-toggle").check();
  await page.getByRole("button", { name: "Fill with AI" }).click();
  await expect(page.getByRole("dialog", { name: "No AI host detected" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Claude Desktop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Codex CLI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "I've installed it. Retry" })).toBeVisible();
});

test("user can reject suggested values", async ({ page }) => {
  await page.goto("/product-hunt");
  await page.getByRole("button", { name: "Fill with AI" }).click();
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.locator('input[name="projectName"]')).toHaveValue("");
});
