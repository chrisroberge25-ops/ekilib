import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { addDays, zonedDateString } from "../lib/dates";
import { provisionUser } from "../lib/provision";

const prisma = new PrismaClient();
const DEMO_EMAIL = "demo@ekilib.app";
const DEMO_PASSWORD = "ekilib-demo";
const TZ = "America/Port-au-Prince";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, name: "Demo Ekilib", locale: "ht", timezone: TZ },
    create: {
      email: DEMO_EMAIL,
      name: "Demo Ekilib",
      passwordHash,
      locale: "ht",
      timezone: TZ,
      plan: "FREE",
    },
  });
  await provisionUser(user.id);

  const logs = await prisma.timeLog.count({ where: { userId: user.id } });
  if (logs === 0) {
    const today = zonedDateString(new Date(), TZ);
    const samples: { daysAgo: number; category: string; hours: number; note: string; source: string }[] = [
      { daysAgo: 0, category: "work", hours: 3, note: "Mwen travay 3 èdtan", source: "voice" },
      { daysAgo: 0, category: "health", hours: 0.75, note: "Mwen fè espò", source: "voice" },
      { daysAgo: 1, category: "work", hours: 8, note: "Jounen ak kliyan yo", source: "manual" },
      { daysAgo: 1, category: "life", hours: 2.5, note: "Aswè ak fanmi", source: "manual" },
      { daysAgo: 1, category: "sleep", hours: 6.5, note: "Mwen dòmi 6 èdtan edmi", source: "manual" },
      { daysAgo: 2, category: "work", hours: 6, note: "Pwojè biznis", source: "manual" },
      { daysAgo: 2, category: "life", hours: 3, note: "Legliz ak zanmi", source: "chat" },
      { daysAgo: 2, category: "health", hours: 1, note: "Mwen mache", source: "voice" },
      { daysAgo: 2, category: "sleep", hours: 7.5, note: "Yon bon nwit", source: "manual" },
      { daysAgo: 3, category: "work", hours: 5, note: "Etid ak plan", source: "manual" },
      { daysAgo: 3, category: "sleep", hours: 8, note: "Dòmi byen", source: "manual" },
      { daysAgo: 4, category: "life", hours: 4, note: "Jounen lakay", source: "manual" },
      { daysAgo: 4, category: "health", hours: 1.5, note: "Espò nan maten", source: "manual" },
      { daysAgo: 4, category: "sleep", hours: 7, note: "Dòmi", source: "manual" },
    ];
    await prisma.timeLog.createMany({
      data: samples.map((sample) => ({
        userId: user.id,
        category: sample.category,
        hours: sample.hours,
        note: sample.note,
        rawText: sample.note,
        source: sample.source,
        date: addDays(today, -sample.daysAgo),
      })),
    });

    const habit = await prisma.habit.findFirst({ where: { userId: user.id, key: "water" } });
    if (habit) {
      await prisma.habitCheck.create({
        data: { habitId: habit.id, date: today, done: true },
      });
    }

    await prisma.reflection.create({
      data: { userId: user.id, date: addDays(today, -1), energy: 3, mood: 4, focus: 3, note: "Jounen an te plen, men fanmi an te la." },
    });

    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content:
          "Byenvini nan Ekilib. Di m sa w fè, an Kreyòl: « Mwen travay 3 èdtan » oswa « Mwen fè espò ». Mwen pap anrejistre anyen san ou konfime.",
      },
    });

    const connection = await prisma.calendarConnection.create({
      data: {
        userId: user.id,
        provider: "demo",
        label: "Egzanp lokal",
        status: "connected",
        lastSyncAt: new Date(),
      },
    });
    const start = new Date(`${today}T14:00:00.000Z`);
    const end = new Date(`${today}T15:00:00.000Z`);
    await prisma.calendarEvent.createMany({
      data: [
        {
          userId: user.id,
          connectionId: connection.id,
          externalId: `demo-client-${today}`,
          title: "Reyinyon kliyan",
          startAt: start,
          endAt: end,
          date: today,
          category: "work",
          hours: 1,
          allDay: false,
        },
        {
          userId: user.id,
          connectionId: connection.id,
          externalId: `demo-family-${today}`,
          title: "Aswè ak fanmi",
          date: today,
          category: "life",
          hours: 0,
          allDay: true,
        },
      ],
    });
  }

  console.log(`Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
