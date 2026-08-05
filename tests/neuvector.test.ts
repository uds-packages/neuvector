/**
 * Copyright 2025-2026 Defense Unicorns
 * SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Defense-Unicorns-Commercial
 */

import { expect, test } from "@playwright/test";

const FIFTEEN_SECONDS = 15_000;
const SCAN_POLL_INTERVAL = 5_000;
const SCAN_TIMEOUT = 2 * 60_000;

const url = `https://neuvector.admin.uds.dev`;
test.use({ baseURL: url });

test("validate system health", async ({ page }) => {
  test.setTimeout(SCAN_TIMEOUT + 60_000);
  await test.step("check sso", async () => {
    const eulaPromise = page.waitForResponse(res => res.url().startsWith(`${url}/eula`));
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await eulaPromise;

    await expect(page.getByRole("button", { name: "Login with OpenID" })).toBeVisible();
    const termsCheckbox = page.getByRole("checkbox");
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.click();
    }
    const openIdPromise = page.waitForResponse(res => res.url().startsWith(`${url}/openId_auth`));
    await page.getByRole("button", { name: "Login with OpenID" }).click();
    await openIdPromise;
    await expect(page).toHaveURL(
      currentUrl =>
        currentUrl.origin === url &&
        ["/", "/index.html"].includes(currentUrl.pathname) &&
        currentUrl.hash === "#/dashboard",
      { timeout: FIFTEEN_SECONDS },
    );
    await expect(page.locator(".navbar-header")).toBeVisible({ timeout: FIFTEEN_SECONDS });
  });

  // Expect counts for scanner, controller, enforcer are based on chart defaults
  await test.step("check system components", async () => {
    await page.goto("/#/controllers");
    await page.waitForLoadState("domcontentloaded");

    // Ensure at least three scanners are connected and at least one scan complete
    await page.getByRole("tab", { name: "Scanners" }).click();
    await page.waitForLoadState("domcontentloaded");
    const scannerPromise = page.waitForResponse(`${url}/scanner`);
    await page.getByLabel("Scanners").getByRole("button", { name: "refresh Refresh" }).click();
    const scannerResponse = await scannerPromise;
    const scannerData = await scannerResponse.json();

    expect(scannerData).toHaveProperty("scanners");
    expect(Array.isArray(scannerData.scanners)).toBe(true);
    expect(scannerData.scanners.length).toBeGreaterThanOrEqual(3);

    // Ensure at least three controller exists and all are connected
    await page.getByRole("tab", { name: "Controllers" }).click();
    await page.waitForLoadState("domcontentloaded");
    const controllerPromise = page.waitForResponse(`${url}/controller`);
    await page.getByLabel("Controllers").getByRole("button", { name: "refresh Refresh" }).click();
    const controllerResponse = await controllerPromise;
    const controllerData = await controllerResponse.json();

    expect(controllerData).toHaveProperty("controllers");
    expect(Array.isArray(controllerData.controllers)).toBe(true);
    expect(controllerData.controllers.length).toBeGreaterThanOrEqual(3);
    controllerData.controllers.forEach((controller: { connection_state: string }) => {
      expect(controller.connection_state).toBe("connected");
    });

    // Ensure at least one enforcer exists and all are connected
    await page.getByRole("tab", { name: "Enforcers" }).click();
    await page.waitForLoadState("domcontentloaded");
    const enforcerPromise = page.waitForResponse(`${url}/enforcer`);
    await page.getByLabel("Enforcers").getByRole("button", { name: "refresh Refresh" }).click();
    const enforcerResponse = await enforcerPromise;
    const enforcerData = await enforcerResponse.json();

    expect(enforcerData).toHaveProperty("enforcers");
    expect(Array.isArray(enforcerData.enforcers)).toBe(true);
    expect(enforcerData.enforcers.length).toBeGreaterThanOrEqual(1);
    enforcerData.enforcers.forEach((enforcer: { connection_state: string }) => {
      expect(enforcer.connection_state).toBe("connected");
    });
  });

  await test.step("check scanning functionality", async () => {
    const getScannedWorkloads = () => page.evaluate(async requestUrl => {
      type ScanSummary = {
        status?: string;
        result?: string;
      };

      type ScannedWorkload = {
        brief?: {
          display_name?: string;
        };
        security?: {
          scan_summary?: ScanSummary;
        };
        children?: ScannedWorkload[];
      };

      const collectScanSummaries = (workload: ScannedWorkload): Array<{
        displayName: string;
        summary?: ScanSummary;
      }> => [
        {
          displayName: workload.brief?.display_name ?? "unknown workload",
          summary: workload.security?.scan_summary,
        },
        ...(workload.children?.flatMap(collectScanSummaries) ?? []),
      ];

      const storedToken = localStorage.getItem("token");
      const token = storedToken ? (JSON.parse(storedToken) as { token?: { token?: string } }).token?.token : undefined;
      const response = await fetch(requestUrl, {
        headers: token ? { token } : undefined,
      });
      const body = await response.text();
      const scannedWorkloads = response.ok ? JSON.parse(body) as ScannedWorkload[] : [];

      return {
        status: response.status,
        body,
        count: scannedWorkloads.length,
        scanSummaries: scannedWorkloads.flatMap(collectScanSummaries),
      };
    }, `${url}/workload/scanned?start=0&limit=10` satisfies string);

    const deadline = Date.now() + SCAN_TIMEOUT;
    let scannedWorkloadsResponse: Awaited<ReturnType<typeof getScannedWorkloads>> | undefined;

    while (Date.now() < deadline) {
      scannedWorkloadsResponse = await getScannedWorkloads();
      expect(scannedWorkloadsResponse.status, scannedWorkloadsResponse.body).toBe(200);
      expect(scannedWorkloadsResponse.count, scannedWorkloadsResponse.body).toBeGreaterThan(0);
      expect(scannedWorkloadsResponse.scanSummaries.length, scannedWorkloadsResponse.body).toBeGreaterThan(0);

      const failures = scannedWorkloadsResponse.scanSummaries.filter(({ summary }) =>
        summary?.status === "failed" ||
        (summary?.status === "finished" && summary.result !== "succeeded"),
      );
      expect(
        failures,
        `Terminal scan failures: ${failures.map(({ displayName, summary }) =>
          `${displayName} (status=${summary?.status ?? "missing"}, result=${summary?.result ?? "missing"})`).join(", ")}`,
      ).toEqual([]);

      if (scannedWorkloadsResponse.scanSummaries.some(({ summary }) =>
        summary?.status === "finished" && summary.result === "succeeded",
      )) {
        return;
      }

      await page.waitForTimeout(SCAN_POLL_INTERVAL);
    }

    expect(scannedWorkloadsResponse, "No scan response received before timeout").toBeDefined();
    expect(
      scannedWorkloadsResponse?.scanSummaries.filter(({ summary }) =>
        summary?.status === "finished" && summary.result === "succeeded",
      ).length,
      `No successful scan completed within ${SCAN_TIMEOUT / 1000} seconds: ${scannedWorkloadsResponse?.body}`,
    ).toBeGreaterThan(0);
  });
});

test("validate local login is blocked", async ({ page }) => {
  await test.step("check local login", async () => {
    const eulaPromise = page.waitForResponse(res => res.url().startsWith(`${url}/eula`));
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await eulaPromise;

    const termsCheckbox = page.getByRole("checkbox");
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.click();
    }

    await page.locator("#Email1").fill("admin");
    await page.locator("#password1").fill("admin");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByText("RBAC: access denied")).toBeVisible();
  });
});

// Add a 15 second delay after a test failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus || testInfo.retry === testInfo.project.retries) {
    return;
  }

  testInfo.setTimeout(testInfo.timeout + FIFTEEN_SECONDS);
  console.info(`Backoff: waiting 15s before the next test retry`);
  await page.waitForTimeout(FIFTEEN_SECONDS);
});
