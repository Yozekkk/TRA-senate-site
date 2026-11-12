import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

const browser = await chromium.launch({ executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim() });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
const base = "http://127.0.0.1:5173";
const check = (condition, message) => { if (!condition) throw new Error(message); };

try {
  await page.goto(`${base}/schedule`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Месяц" }).click();
  check(await page.locator(".month-view").isVisible(), "Month calendar did not open");
  await page.getByRole("tab", { name: "Список" }).click();
  check(await page.locator(".schedule-list").isVisible(), "List view did not open");
  await page.getByRole("tab", { name: "Список" }).press("ArrowLeft");
  check(await page.locator(".month-view").isVisible(), "Calendar tabs do not support arrow keys");
  await page.getByRole("tab", { name: "Список" }).click();
  await page.getByRole("button", { name: "Добавить заседание" }).click();
  await page.getByPlaceholder("Пленарное заседание Сената").fill("Тестовое заседание интерфейса");
  await page.getByRole("button", { name: "Создать заседание" }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Список" }).click();
  check(await page.getByText("Тестовое заседание интерфейса").count() > 0, "Local meeting was not persisted");
  await page.getByRole("link", { name: /Тестовое заседание интерфейса/ }).click();
  await page.getByRole("button", { name: "Изменить заседание" }).click();
  await page.locator("textarea[name=summary]").fill("Обновлённый демонстрационный анонс заседания.");
  await page.getByRole("button", { name: "Сохранить заседание" }).click();
  check(await page.getByText("Обновлённый демонстрационный анонс заседания.").isVisible(), "Meeting edit did not update details");

  await page.goto(`${base}/archive`, { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Поиск по названию" }).fill("не существует");
  check(await page.getByText("Ничего не найдено").isVisible(), "Archive empty state did not open");
  await page.getByRole("textbox", { name: "Поиск по названию" }).fill("Стратегия развития");
  check(await page.locator(".archive-card").count() === 1, "Archive search did not filter");
  await page.getByRole("tab", { name: "Таблица" }).click();
  check(await page.locator(".data-table tbody tr").count() === 1, "Archive table did not match cards");

  await page.goto(`${base}/analytics`, { waitUntil: "networkidle" });
  const oldPeriod = await page.locator(".analytics-period").textContent();
  await page.getByRole("tab", { name: "7 дней" }).click();
  check((await page.locator(".analytics-period").textContent()) !== oldPeriod, "Analytics period did not change");

  await page.goto(`${base}/decisions`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Добавить решение" }).click();
  await page.locator(".demo-form input").first().fill("Тестовое решение интерфейса");
  await page.locator(".demo-form textarea").fill("Демонстрационная запись для проверки локального сохранения.");
  await page.getByRole("button", { name: "Добавить решение" }).last().click();
  check(await page.getByText("Тестовое решение интерфейса").count() > 0, "Decision was not added");
  await page.getByRole("button", { name: /Тестовое решение интерфейса/ }).click();
  await page.getByRole("button", { name: "Изменить статус и сведения" }).click();
  await page.locator(".demo-form select[name=status]").selectOption("На исполнении");
  await page.getByRole("button", { name: "Сохранить решение" }).click();
  check(await page.getByText("На исполнении").count() > 0, "Decision status edit failed");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Открыть меню" }).click();
  check(await page.locator(".sidebar.sidebar-open").isVisible(), "Mobile sidebar did not open");
  await page.getByRole("link", { name: /Архив заседаний/ }).click();
  check(new URL(page.url()).pathname === "/archive", "Sidebar navigation failed");
  const reducedPage = await browser.newPage({ reducedMotion: "reduce" });
  await reducedPage.goto(base, { waitUntil: "networkidle" });
  const heroTransform = await reducedPage.locator(".hero-line").first().evaluate((node) => getComputedStyle(node).transform);
  check(heroTransform === "none", "Reduced motion still moves hero text");
  await reducedPage.close();
  check(errors.length === 0, `Browser errors:\n${errors.join("\n")}`);
  console.log("Interaction audit passed: calendar, local storage, archive, analytics, decisions, mobile navigation");
} finally {
  await page.close();
  await browser.close();
}
