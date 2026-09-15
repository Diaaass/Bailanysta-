import { hash } from "bcryptjs";
import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();

type SeedUser = {
  username: string;
  displayName: string;
  bio: string;
  posts: string[];
};

const PASSWORD = "demo1234";

const SEED: SeedUser[] = [
  {
    username: "demo",
    displayName: "Demo Account",
    bio: "Гостевой аккаунт для ревью. Заходите и пробуйте.",
    posts: [
      "Привет, Bailanysta! Это демо-аккаунт — можно лайкать, комментировать и писать свои посты.",
      "Поиск здесь семантический: спросите «оқу» и найдутся посты про учёбу на русском и английском. #bailanysta",
      "Dark mode is here. Try the toggle in the top bar — the choice survives a reload.",
    ],
  },
  {
    username: "aigerim",
    displayName: "Айгерім Сәтбаева",
    bio: "Frontend-әзірлеуші. Алматы.",
    posts: [
      "Бүгін Astana Hub-та фронтенд туралы кездесу болды. Қатысқандардың бәріне рақмет! #frontend",
      "Жаңа жобада TypeScript-ке толық көштік. Қателер саны айтарлықтай азайды.",
      "Оқуды бітіргелі бір жыл болды, әлі күнге дейін күнде жаңа нәрсе үйренемін.",
    ],
  },
  {
    username: "daniyar",
    displayName: "Данияр Оспанов",
    bio: "Backend / distributed systems. Пишу про инфраструктуру.",
    posts: [
      "Переписал выборку ленты на курсорную пагинацию — p95 упал с 340 мс до 45 мс. Offset на больших таблицах это боль.",
      "Напоминание самому себе: индекс без ANALYZE — просто украшение в схеме.",
      "Читаю про HNSW и понимаю, что векторный поиск это не магия, а просто очень аккуратный граф. #vectors",
    ],
  },
  {
    username: "madina",
    displayName: "Madina K.",
    bio: "Product designer. Figma, prototypes, design systems.",
    posts: [
      "Spent the morning cleaning up our design tokens. Naming is genuinely the hardest part of design systems.",
      "Хороший интерфейс — это когда пользователь не замечает интерфейс. Банально, но каждый раз забываю.",
      "Skeleton screens beat spinners almost every time. They set expectations about layout before data arrives.",
    ],
  },
  {
    username: "yerlan",
    displayName: "Ерлан Ахметов",
    bio: "ML engineer. NLP for Kazakh language.",
    posts: [
      "Қазақ тілі үшін эмбеддинг сапасы әлі де ағылшын тілінен артта. Бірақ айырмашылық жылдан-жылға азайып келеді.",
      "Прогнал сравнение трёх моделей на казахских текстах. Разброс по accuracy — 11 процентных пунктов, выбор модели решает больше, чем промпт.",
      "Multilingual retrieval is the part of RAG nobody warns you about. Chunking in one language, querying in another. #rag",
    ],
  },
];

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log("clearing existing data...");
  await sql`TRUNCATE notifications, follows, likes, comments, posts, users RESTART IDENTITY CASCADE`;

  const passwordHash = await hash(PASSWORD, 10);
  const userIds = new Map<string, string>();

  for (const u of SEED) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO users (username, display_name, password_hash, bio, avatar_seed)
      VALUES (${u.username}, ${u.displayName}, ${passwordHash}, ${u.bio}, ${u.username})
      RETURNING id
    `;
    userIds.set(u.username, row.id);
  }
  console.log(`inserted ${userIds.size} users`);

  const postIds: { id: string; author: string }[] = [];
  let offsetMinutes = SEED.length * 3 * 90;

  for (const u of SEED) {
    for (const content of u.posts) {
      offsetMinutes -= 90 + Math.floor(Math.random() * 120);
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO posts (author_id, content, created_at, updated_at)
        VALUES (
          ${userIds.get(u.username)!},
          ${content},
          NOW() - ${`${offsetMinutes} minutes`}::interval,
          NOW() - ${`${offsetMinutes} minutes`}::interval
        )
        RETURNING id
      `;
      postIds.push({ id: row.id, author: u.username });
    }
  }
  console.log(`inserted ${postIds.length} posts`);

  const usernames = SEED.map((u) => u.username);
  let likeCount = 0;
  for (const post of postIds) {
    for (const username of usernames) {
      if (username === post.author) continue;
      if (Math.random() > 0.45) continue;
      await sql`
        INSERT INTO likes (user_id, post_id) VALUES (${userIds.get(username)!}, ${post.id})
        ON CONFLICT DO NOTHING
      `;
      likeCount++;
    }
  }
  console.log(`inserted ${likeCount} likes`);

  const COMMENTS = [
    "Согласен, сам через это проходил.",
    "Өте пайдалы, рақмет!",
    "Great point — saving this one.",
    "А можно подробнее, какие цифры получились?",
    "Дәл айтасың.",
  ];
  let commentCount = 0;
  for (const post of postIds) {
    if (Math.random() > 0.4) continue;
    const commenter = usernames.filter((n) => n !== post.author)[
      Math.floor(Math.random() * (usernames.length - 1))
    ];
    await sql`
      INSERT INTO comments (post_id, author_id, content)
      VALUES (${post.id}, ${userIds.get(commenter)!}, ${COMMENTS[Math.floor(Math.random() * COMMENTS.length)]})
    `;
    commentCount++;
  }
  console.log(`inserted ${commentCount} comments`);

  let followCount = 0;
  for (const follower of usernames) {
    for (const following of usernames) {
      if (follower === following) continue;
      if (Math.random() > 0.6) continue;
      await sql`
        INSERT INTO follows (follower_id, following_id)
        VALUES (${userIds.get(follower)!}, ${userIds.get(following)!})
        ON CONFLICT DO NOTHING
      `;
      followCount++;
    }
  }
  console.log(`inserted ${followCount} follows`);
  console.log(`\ndone. demo login: demo / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
