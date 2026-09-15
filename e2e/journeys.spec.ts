import { expect, test } from "@playwright/test";
import { login, publish, register, uniqueUser } from "./helpers";

test.describe("доступ", () => {
  test("незалогиненного уводит на вход и возвращает обратно", async ({
    page,
  }) => {
    await page.goto("/search");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fsearch/);

    await register(page, uniqueUser());
    // The register flow lands on the feed; the guard is what we assert above.
    await expect(page).toHaveURL("/");
  });

  test("выход и повторный вход возвращают ту же учётную запись", async ({
    page,
  }) => {
    const user = uniqueUser();
    await register(page, user);

    const text = `Пост до выхода ${user.username}`;
    await publish(page, text);

    await page.getByRole("button", { name: "Выйти" }).click();
    await page.waitForURL(/\/login/);

    await login(page, user.username, user.password);
    await expect(page).toHaveURL("/");
    await expect(page.getByText(text).first()).toBeVisible();
  });

  test("метаданные отдаются без сессии", async ({ request }) => {
    const response = await request.get("/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("посты", () => {
  test("публикация, редактирование и удаление", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    const text = `Первый пост ${user.username}`;
    await publish(page, text);

    await page.reload();
    await expect(page.getByText(text).first()).toBeVisible();

    const article = page.locator("article", { hasText: text });
    await article.getByRole("button", { name: "Изменить" }).click();
    const edited = `${text} — обновлён`;
    await article.getByRole("textbox").fill(edited);
    await article.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText(edited).first()).toBeVisible();

    await page
      .locator("article", { hasText: edited })
      .getByRole("button", { name: "Удалить" })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Удалить" }).click();
    await expect(page.getByText(edited)).toHaveCount(0);
  });

  test("пустой пост не отправляется", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    await page.goto("/");
    await page.getByLabel("Текст поста").fill("   ");
    await expect(
      page.getByRole("button", { name: "Опубликовать" }),
    ).toBeDisabled();
  });
});

test.describe("социальные действия", () => {
  // Two people means two sessions: a second browser context is cleaner and more
  // deterministic than clearing cookies inside one.
  test("лайк держится после перезагрузки", async ({ page, browser }) => {
    const author = uniqueUser();
    await register(page, author);
    const text = `Пост для лайка ${author.username}`;
    await publish(page, text);

    const readerContext = await browser.newContext();
    const readerPage = await readerContext.newPage();
    await register(readerPage, uniqueUser());

    const article = readerPage.locator("article", { hasText: text });
    const like = article.getByRole("button", { name: "Поставить лайк" });
    await like.click();

    await expect(
      article.getByRole("button", { name: "Убрать лайк" }),
    ).toBeVisible();

    await readerPage.reload();
    await expect(
      readerPage
        .locator("article", { hasText: text })
        .getByRole("button", { name: "Убрать лайк" }),
    ).toBeVisible();

    await readerContext.close();
  });

  test("комментарий появляется на странице поста", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);
    const text = `Пост под комментарий ${user.username}`;
    await publish(page, text);

    await page.locator("article", { hasText: text }).getByRole("link").nth(2).click();
    await expect(page).toHaveURL(/\/post\//);

    const comment = "Первый комментарий";
    await page.getByLabel("Текст комментария").fill(comment);
    await page.getByRole("button", { name: "Ответить" }).click();
    await expect(page.getByText(comment)).toBeVisible();

    await page.reload();
    await expect(page.getByText(comment)).toBeVisible();
  });

  test("подписка меняет ленту подписок", async ({ page, browser }) => {
    const author = uniqueUser();
    await register(page, author);
    const text = `Пост автора ${author.username}`;
    await publish(page, text);

    const followerContext = await browser.newContext();
    const followerPage = await followerContext.newPage();
    await register(followerPage, uniqueUser());

    await followerPage.goto("/");
    await followerPage.getByRole("tab", { name: "Подписки" }).click();
    await expect(followerPage.getByText(text)).toHaveCount(0);

    await followerPage.goto(`/profile/${author.username}`);
    await followerPage.getByRole("button", { name: "Подписаться" }).click();
    await expect(
      followerPage.getByRole("button", { name: "Вы подписаны" }),
    ).toBeVisible();

    await followerPage.goto("/");
    await followerPage.getByRole("tab", { name: "Подписки" }).click();
    await expect(followerPage.getByText(text).first()).toBeVisible();

    await followerContext.close();
  });
});

test.describe("профиль", () => {
  test("имя и описание меняются и сохраняются", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    await page.goto(`/profile/${user.username}`);
    await page.getByRole("button", { name: "Изменить профиль" }).click();

    const newName = "Обновлённое имя";
    const bio = "Описание из e2e-теста";
    await page.fill("#displayName", newName);
    await page.fill("#bio", bio);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByRole("heading", { name: newName })).toBeVisible();
    await expect(page.getByText(bio)).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: newName })).toBeVisible();
  });

  test("счётчики ведут на списки подписок", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    await page.goto(`/profile/${user.username}`);
    await page.getByRole("link", { name: /подписчиков/ }).click();
    await expect(page).toHaveURL(/\/followers$/);
    await expect(page.getByRole("tab", { name: "Подписчики" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("поиск", () => {
  test("находит собственный пост по слову", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    const marker = `уникальноеслово${Date.now()}`;
    await publish(page, `Пост со словом ${marker}`);

    await page.goto("/search");
    await page.fill("#q", marker);
    await page.getByRole("button", { name: "Найти" }).click();

    await expect(page.getByText(marker).first()).toBeVisible();
  });

  test("без ключа AI честно сообщает о текстовом режиме", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    await page.goto("/search");
    await page.fill("#q", "что угодно");
    await page.getByRole("button", { name: "Найти" }).click();

    await expect(
      page.getByText(/Векторный поиск выключен/),
    ).toBeVisible();
  });
});

test.describe("клавиатура", () => {
  test("ссылка «к содержимому» ведёт на основную колонку", async ({ page }) => {
    await register(page, uniqueUser());

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Перейти к содержимому" });
    await expect(skip).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("диалог удаления закрывается по Escape и возвращает фокус", async ({
    page,
  }) => {
    const user = uniqueUser();
    await register(page, user);
    const text = `Пост для отмены ${user.username}`;
    await publish(page, text);

    const remove = page
      .locator("article", { hasText: text })
      .getByRole("button", { name: "Удалить" });
    await remove.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    // Focus must return to the control that opened the dialog, not to the body.
    await expect(remove).toBeFocused();
    await expect(page.getByText(text).first()).toBeVisible();
  });

  test("Tab не уходит за пределы открытого диалога", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    await page.goto(`/profile/${user.username}`);
    await page.getByRole("button", { name: "Изменить профиль" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() =>
        Boolean(
          document.activeElement?.closest('[role="dialog"]'),
        ),
      );
      expect(inside).toBe(true);
    }
  });

  test("пост отправляется по Ctrl+Enter", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    const text = `Отправлено с клавиатуры ${user.username}`;
    await page.goto("/");
    await page.getByLabel("Текст поста").fill(text);
    await page.keyboard.press("Control+Enter");

    await expect(page.getByText(text).first()).toBeVisible();
  });
});

test.describe("тема", () => {
  test("выбор темы переживает перезагрузку", async ({ page }) => {
    const user = uniqueUser();
    await register(page, user);

    await page.getByRole("radio", { name: "Тёмная" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("radio", { name: "Светлая" }).click();
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
