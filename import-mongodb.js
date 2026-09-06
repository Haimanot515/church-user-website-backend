require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { deserialize } = require("bson");

const prisma = require("./prisma/prisma.service");

const BACKUP_DIR = path.join(
  process.env.HOME,
  "Desktop",
  "mongodb-backup",
  "test"
);

// ─────────────────────────────────────────────
// Mongo → PostgreSQL ID maps
// ─────────────────────────────────────────────

const maps = {
  language: new Map(),
  user: new Map(),
  category: new Map(),
  church: new Map(),
  thread: new Map(),
};

// ─────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────

const stats = {};

function stat(name) {
  if (!stats[name]) {
    stats[name] = {
      seen: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
    };
  }

  return stats[name];
}

function seen(name) {
  stat(name).seen++;
}

function imported(name) {
  stat(name).imported++;
}

function skipped(name) {
  stat(name).skipped++;
}

function failed(name) {
  stat(name).failed++;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function mongoId(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (value.toHexString) {
    return value.toHexString();
  }

  if (value.$oid) {
    return value.$oid;
  }

  return String(value);
}

function date(value, fallback = new Date()) {
  if (!value) return fallback;

  const d = value instanceof Date ? value : new Date(value);

  return Number.isNaN(d.getTime()) ? fallback : d;
}

function stringOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}

function stringOrEmpty(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function bool(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  return Boolean(value);
}

function integer(value, fallback = 0) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.trunc(n);
}

function containsAmharic(value) {
  return /[\u1200-\u137F]/.test(String(value || ""));
}

function detectLanguageFromText(...values) {
  const text = values
    .filter((v) => v !== undefined && v !== null)
    .join(" ");

  return containsAmharic(text) ? "AM" : "EN";
}

function getLanguageMongoId(doc) {
  return mongoId(
    doc.language ||
      doc.languageId ||
      doc.lang ||
      null
  );
}

function resolveLanguage(doc, ...textFields) {
  const sourceId = getLanguageMongoId(doc);

  if (sourceId && maps.language.has(sourceId)) {
    return maps.language.get(sourceId).id;
  }

  const code = detectLanguageFromText(...textFields);

  const fallback = [...maps.language.values()].find(
    (value) => value.code === code
  );

  if (fallback) {
    return fallback.id;
  }

  const english = [...maps.language.values()].find(
    (value) => value.code === "EN"
  );

  return english ? english.id : null;
}

function getFile(collection) {
  return path.join(BACKUP_DIR, `${collection}.bson`);
}

// ─────────────────────────────────────────────
// Read concatenated BSON documents
// ─────────────────────────────────────────────

function readBsonCollection(collection) {
  const file = getFile(collection);

  if (!fs.existsSync(file)) {
    console.log(`⚠ Missing ${collection}.bson`);
    return [];
  }

  const buffer = fs.readFileSync(file);

  const docs = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 4 > buffer.length) {
      break;
    }

    const size = buffer.readInt32LE(offset);

    if (
      !Number.isInteger(size) ||
      size < 5 ||
      offset + size > buffer.length
    ) {
      throw new Error(
        `Invalid BSON document in ${collection}.bson at offset ${offset}`
      );
    }

    const documentBuffer = buffer.subarray(
      offset,
      offset + size
    );

    docs.push(deserialize(documentBuffer));

    offset += size;
  }

  return docs;
}

function docs(collection) {
  return readBsonCollection(collection);
}

// ─────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────

async function importOne(name, fn) {
  try {
    await fn();
    imported(name);
  } catch (error) {
    failed(name);

    console.error(
      `\n❌ ${name} failed:`,
      error.message
    );
  }
}

// ─────────────────────────────────────────────
// 1. LANGUAGES
// ─────────────────────────────────────────────

async function importLanguages() {
  const collection = "languages";

  for (const doc of docs(collection)) {
    seen(collection);

    const oldId = mongoId(doc._id);

    if (!oldId) {
      skipped(collection);
      continue;
    }

    try {
      const created = await prisma.language.create({
        data: {
          name: stringOrEmpty(doc.name),
          code: stringOrEmpty(doc.code).toUpperCase(),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      maps.language.set(oldId, {
        id: created.id,
        code: created.code,
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Language ${oldId}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 2. USERS
// ─────────────────────────────────────────────

async function importUsers() {
  const collection = "users";

  for (const doc of docs(collection)) {
    seen(collection);

    const oldId = mongoId(doc._id);

    if (!oldId || !doc.email) {
      skipped(collection);
      continue;
    }

    try {
      const created = await prisma.user.create({
        data: {
          name: stringOrEmpty(doc.name),
          email: stringOrEmpty(doc.email),
          password: stringOrEmpty(doc.password),
          role: stringOrEmpty(doc.role || "user"),
          isAdmin: bool(doc.isAdmin),
          isVerified: bool(doc.isVerified),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      maps.user.set(oldId, created.id);

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ User ${oldId} (${doc.email}): ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 3. CATEGORIES
// ─────────────────────────────────────────────

async function importCategories() {
  const collection = "categories";

  const legacyAmharic = {
    "6a6b1a0d2f9dc6c9fd3d2a86": "gedam",
    "6a6b1a362f9dc6c9fd3d2a8c": "kidase",
    "6a6b1a942f9dc6c9fd3d2aac": "gubaye",
    "6a6b1aa92f9dc6c9fd3d2aaf": "wongel",
  };

  for (const doc of docs(collection)) {
    seen(collection);

    const oldId = mongoId(doc._id);

    if (!oldId || !doc.name) {
      skipped(collection);
      continue;
    }

    try {
      let languageId = resolveLanguage(
        doc,
        doc.name,
        doc.description
      );

      if (
        legacyAmharic[oldId] &&
        !getLanguageMongoId(doc)
      ) {
        const amharic = [...maps.language.values()].find(
          (x) => x.code === "AM"
        );

        if (amharic) {
          languageId = amharic.id;
        }
      }

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      let slug = stringOrNull(doc.slug);

      if (!slug && legacyAmharic[oldId]) {
        slug = legacyAmharic[oldId];
      }

      if (!slug) {
        slug = String(doc.name)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "");
      }

      const created = await prisma.category.create({
        data: {
          name: stringOrEmpty(doc.name),
          slug,
          description: stringOrNull(doc.description),
          languageId,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      maps.category.set(oldId, created.id);

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Category ${oldId} (${doc.name}): ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 4. CHURCHES
// ─────────────────────────────────────────────

async function importChurches() {
  const collection = "churches";

  for (const doc of docs(collection)) {
    seen(collection);

    const oldId = mongoId(doc._id);

    if (!oldId || !doc.churchName) {
      skipped(collection);
      continue;
    }

    try {
      const languageId = resolveLanguage(
        doc,
        doc.churchName,
        doc.description,
        doc.shortDescription,
        doc.history
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      const created = await prisma.church.create({
        data: {
          churchName: stringOrEmpty(doc.churchName),
          description: stringOrEmpty(doc.description),
          shortDescription: stringOrEmpty(
            doc.shortDescription
          ),
          history: stringOrEmpty(doc.history),
          image: stringOrEmpty(doc.image),
          address: stringOrEmpty(doc.address),
          serviceDays: stringOrEmpty(doc.serviceDays),
          serviceTime: stringOrEmpty(doc.serviceTime),
          languageId,
          isFeatured: bool(doc.isFeatured),
          isPrimary: bool(doc.isPrimary),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      maps.church.set(oldId, created.id);

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Church ${oldId}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 5. CHURCH PEOPLE
// ─────────────────────────────────────────────

async function importChurchPeople() {
  const collection = "churchpeople";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      const languageId = resolveLanguage(
        doc,
        doc.name,
        doc.title,
        doc.description,
        doc.message
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      await prisma.churchPerson.create({
        data: {
          name: stringOrNull(doc.name),
          photos: Array.isArray(doc.photos)
            ? doc.photos.map(String)
            : [],
          title: stringOrNull(doc.title),
          description: stringOrNull(doc.description),
          role: stringOrNull(doc.role),
          message: stringOrNull(doc.message),
          category: doc.category || null,
          rank: doc.rank || null,
          rankOrder: integer(doc.rankOrder),
          languageId,
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ ChurchPerson ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 6. CHURCH STORIES
// ─────────────────────────────────────────────

async function importChurchStories() {
  const collection = "churchstories";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      const languageId = resolveLanguage(
        doc,
        doc.title,
        doc.desc,
        doc.leader,
        doc.leaderRole,
        doc.servedBy
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      await prisma.churchStory.create({
        data: {
          year: stringOrEmpty(doc.year),
          range: stringOrEmpty(doc.range),
          title: stringOrEmpty(doc.title),
          desc: stringOrEmpty(doc.desc),
          leader: stringOrNull(doc.leader),
          leaderRole: stringOrNull(doc.leaderRole),
          servedBy: stringOrNull(doc.servedBy),
          photo: stringOrNull(doc.photo),
          order: integer(doc.order),
          languageId,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ ChurchStory ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 7. HOME HEROES
// ─────────────────────────────────────────────

async function importHomeHeroes() {
  const collection = "homeheros";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      const languageId = resolveLanguage(
        doc,
        doc.title,
        doc.subtitle,
        doc.description,
        doc.name,
        doc.role,
        doc.quote,
        doc.story
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      await prisma.homeHero.create({
        data: {
          title: stringOrNull(doc.title),
          subtitle: stringOrNull(doc.subtitle),
          description: stringOrNull(doc.description),
          name: stringOrNull(doc.name),
          role: stringOrNull(doc.role),
          image: stringOrNull(doc.image),
          quote: stringOrNull(doc.quote),
          story: stringOrNull(doc.story),
          storyImage: stringOrNull(doc.storyImage),
          languageId,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ HomeHero ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 8. FAQS
// ─────────────────────────────────────────────

async function importFaqs() {
  const collection = "faqs";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      const languageId = resolveLanguage(
        doc,
        doc.question,
        doc.answer
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      const validCategories = [
        "Information",
        "Faith",
        "Contact",
      ];

      const category = validCategories.includes(doc.category)
        ? doc.category
        : "Information";

      await prisma.faq.create({
        data: {
          question: stringOrEmpty(doc.question),
          answer: stringOrEmpty(doc.answer),
          category,
          order: integer(doc.order),
          languageId,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ FAQ ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 9. MISSION / VISION
// ─────────────────────────────────────────────

async function importMissionVisions() {
  const collection = "missionvisions";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      const languageId = resolveLanguage(
        doc,
        doc.title,
        doc.desc
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      const type =
        doc.type === "vision"
          ? "vision"
          : "mission";

      await prisma.missionVision.create({
        data: {
          type,
          title: stringOrEmpty(doc.title),
          desc: stringOrEmpty(doc.desc),
          order: integer(doc.order),
          languageId,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ MissionVision ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 10. PROMOTIONS
// ─────────────────────────────────────────────

async function importPromotions() {
  const collection = "promotions";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      const languageId = resolveLanguage(
        doc,
        doc.title,
        doc.description
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      await prisma.promotion.create({
        data: {
          title: stringOrEmpty(doc.title),
          description: stringOrEmpty(doc.description),
          photo: stringOrEmpty(doc.photo),
          languageId,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Promotion ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 11. SERVICES
// ─────────────────────────────────────────────

async function importServices() {
  const collection = "services";

  const validCategories = [
    "Worship",
    "Teaching",
    "Prayer",
    "Music",
    "Youth",
    "Ministry",
    "Outreach",
    "Other",
  ];

  const validStatuses = [
    "active",
    "inactive",
  ];

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      const languageId = resolveLanguage(
        doc,
        doc.title,
        doc.description,
        doc.day,
        doc.time,
        doc.schedule
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      let category = doc.category;

      if (!validCategories.includes(category)) {
        category = "Other";
      }

      let status = doc.status;

      if (!validStatuses.includes(status)) {
        status = "active";
      }

      await prisma.service.create({
        data: {
          title: stringOrEmpty(doc.title),
          description: stringOrEmpty(doc.description),
          imageUrl: stringOrNull(doc.imageUrl),
          day: stringOrEmpty(doc.day),
          time: stringOrEmpty(doc.time),
          schedule: stringOrNull(doc.schedule),
          category,
          languageId,
          location: stringOrEmpty(doc.location),
          isFeatured: bool(doc.isFeatured),
          status,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Service ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 12. ABOUT
// ─────────────────────────────────────────────

function isPortfolioAbout(doc) {
  const text = [
    doc.title,
    doc.churchLeader,
    doc.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const portfolioPatterns = [
    "full-stack engineer",
    "software engineering scholar",
    "addis ababa institute of technology",
    "addis ababa university",
    "aait",
    "mern mastery",
    "portfolio",
    "software engineer",
    "developer portfolio",
    "innovation at addis",
  ];

  return portfolioPatterns.some((pattern) =>
    text.includes(pattern)
  );
}

async function importAbouts() {
  const collection = "abouts";

  for (const doc of docs(collection)) {
    seen(collection);

    if (isPortfolioAbout(doc)) {
      skipped(collection);

      console.log(
        `⏭ Skipping portfolio About: ${doc.title || "(untitled)"}`
      );

      continue;
    }

    try {
      const languageId = resolveLanguage(
        doc,
        doc.title,
        doc.churchLeader,
        doc.description
      );

      if (!languageId) {
        throw new Error("Could not resolve language");
      }

      await prisma.about.create({
        data: {
          title: stringOrNull(doc.title),
          churchLeader: stringOrNull(doc.churchLeader),
          description: stringOrNull(doc.description),
          image: stringOrNull(doc.image),
          languageId,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ About ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 13. BANK ACCOUNTS
// ─────────────────────────────────────────────

async function importBankAccounts() {
  const collection = "bankaccounts";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      await prisma.bankAccount.create({
        data: {
          bank: stringOrEmpty(doc.bank),
          accountName: stringOrEmpty(doc.accountName),
          accountNumber: stringOrEmpty(doc.accountNumber),
          order: integer(doc.order),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ BankAccount ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 14. CONTACTS
// ─────────────────────────────────────────────

async function importContacts() {
  const collection = "contacts";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      await prisma.contact.create({
        data: {
          name: stringOrNull(doc.name),
          email: stringOrNull(doc.email),
          message: stringOrNull(doc.message),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Contact ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 15. SUBSCRIBERS
// ─────────────────────────────────────────────

async function importSubscribers() {
  const collection = "subscribers";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      await prisma.subscriber.create({
        data: {
          email: stringOrNull(doc.email),
          active:
            doc.active === undefined
              ? null
              : bool(doc.active),
          subscribedAt: doc.subscribedAt
            ? date(doc.subscribedAt)
            : null,
          unsubscribedAt: doc.unsubscribedAt
            ? date(doc.unsubscribedAt)
            : null,
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Subscriber ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 16. THREADS
// ─────────────────────────────────────────────

async function importThreads() {
  const collection = "threads";

  for (const doc of docs(collection)) {
    seen(collection);

    const oldId = mongoId(doc._id);

    if (!oldId) {
      skipped(collection);
      continue;
    }

    try {
      const created = await prisma.thread.create({
        data: {
          userName: stringOrEmpty(doc.userName),
          userEmail: stringOrEmpty(doc.userEmail),
          lastMessage: stringOrEmpty(doc.lastMessage),
          lastMessageAt: doc.lastMessageAt
            ? date(doc.lastMessageAt)
            : null,
          unreadForAdmin: integer(doc.unreadForAdmin),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      maps.thread.set(oldId, created.id);

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Thread ${oldId}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 17. VERIFICATION CODES
// ─────────────────────────────────────────────

async function importVerificationCodes() {
  const collection = "verificationcodes";

  for (const doc of docs(collection)) {
    seen(collection);

    try {
      await prisma.verificationCode.create({
        data: {
          email: stringOrEmpty(doc.email),
          dbCode: stringOrEmpty(
            doc.DBcode ?? doc.dbCode
          ),
          expiresAt: date(doc.expiresAt),
          used: bool(doc.used),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ VerificationCode ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 18. POSTS
// ─────────────────────────────────────────────

async function importPosts() {
  const collection = "posts";

  for (const doc of docs(collection)) {
    seen(collection);

    const oldAuthorId = mongoId(doc.author);
    const oldCategoryId = mongoId(doc.category);

    const authorId = maps.user.get(oldAuthorId);
    const categoryId = maps.category.get(oldCategoryId);
    const languageId = resolveLanguage(
      doc,
      doc.title,
      doc.description,
      doc.content
    );

    if (!authorId) {
      skipped(collection);

      console.error(
        `⏭ Post ${mongoId(doc._id)} skipped: author relationship not found`
      );

      continue;
    }

    if (!categoryId) {
      skipped(collection);

      console.error(
        `⏭ Post ${mongoId(doc._id)} skipped: category relationship not found`
      );

      continue;
    }

    if (!languageId) {
      skipped(collection);

      console.error(
        `⏭ Post ${mongoId(doc._id)} skipped: language relationship not found`
      );

      continue;
    }

    try {
      const status =
        doc.status === "published"
          ? "published"
          : "draft";

      await prisma.post.create({
        data: {
          title: stringOrEmpty(doc.title),
          description: stringOrEmpty(doc.description),
          content: stringOrEmpty(doc.content),
          imageUrl: stringOrNull(doc.imageUrl),
          authorId,
          categoryId,
          languageId,
          isTrending: bool(doc.isTrending),
          isFeatured: bool(doc.isFeatured),
          isRecommended: bool(doc.isRecommended),
          status,
          publishedAt: doc.publishedAt
            ? date(doc.publishedAt)
            : null,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Post ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 19. MEDIA
// ─────────────────────────────────────────────

async function importMedia() {
  const collection = "media";

  const validResourceTypes = [
    "image",
    "video",
    "raw",
  ];

  const validMediaTypes = [
    "photo",
    "video",
    "audio",
    "document",
  ];

  for (const doc of docs(collection)) {
    seen(collection);

    const oldAuthorId = mongoId(doc.author);
    const oldCategoryId = mongoId(doc.category);

    const authorId = maps.user.get(oldAuthorId);

    if (!authorId) {
      skipped(collection);

      console.error(
        `⏭ Media ${mongoId(doc._id)} skipped: author relationship not found`
      );

      continue;
    }

    const languageId = resolveLanguage(
      doc,
      doc.title,
      doc.description
    );

    if (!languageId) {
      skipped(collection);

      console.error(
        `⏭ Media ${mongoId(doc._id)} skipped: language not found`
      );

      continue;
    }

    try {
      let resourceType = doc.resourceType;

      if (!validResourceTypes.includes(resourceType)) {
        resourceType = null;
      }

      let mediaType = doc.mediaType;

      if (!validMediaTypes.includes(mediaType)) {
        throw new Error(
          `Invalid mediaType: ${mediaType}`
        );
      }

      let status =
        doc.status === "published"
          ? "published"
          : "draft";

      const categoryId =
        oldCategoryId &&
        maps.category.has(oldCategoryId)
          ? maps.category.get(oldCategoryId)
          : null;

      await prisma.media.create({
        data: {
          title: stringOrEmpty(doc.title),
          description: stringOrEmpty(doc.description),
          mediaUrl: stringOrEmpty(doc.mediaUrl),
          publicId: stringOrNull(doc.publicId),
          resourceType,
          thumbnail: stringOrNull(doc.thumbnail),
          mediaType,
          duration: stringOrNull(doc.duration),
          authorId,
          categoryId,
          languageId,
          isTrending: bool(doc.isTrending),
          isFeatured: bool(doc.isFeatured),
          isRecommended: bool(doc.isRecommended),
          status,
          publishedAt: doc.publishedAt
            ? date(doc.publishedAt)
            : null,
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Media ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 20. CHURCH ASSIGNMENTS
// ─────────────────────────────────────────────

async function importAssignments() {
  const collection = "churchassignments";

  for (const doc of docs(collection)) {
    seen(collection);

    const oldUserId = mongoId(doc.user);
    const oldChurchId = mongoId(doc.church);

    const userId = maps.user.get(oldUserId);
    const churchId = maps.church.get(oldChurchId);

    if (!userId || !churchId) {
      skipped(collection);

      console.error(
        `⏭ Assignment ${mongoId(doc._id)} skipped: relationship not found`,
        {
          user: oldUserId,
          church: oldChurchId,
        }
      );

      continue;
    }

    try {
      await prisma.churchAssignment.create({
        data: {
          userId,
          churchId,
          role: stringOrEmpty(doc.role || "Priest"),
          servingSince: doc.servingSince
            ? date(doc.servingSince)
            : null,
          description: stringOrEmpty(doc.description),
          image: stringOrEmpty(doc.image),
          isCurrent: bool(doc.isCurrent, true),
          isPrimary: bool(doc.isPrimary),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Assignment ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// 21. MESSAGES
// ─────────────────────────────────────────────

async function importMessages() {
  const collection = "messages";

  for (const doc of docs(collection)) {
    seen(collection);

    const oldThreadId = mongoId(doc.threadId);
    const threadId = maps.thread.get(oldThreadId);

    if (!threadId) {
      skipped(collection);

      console.error(
        `⏭ Message ${mongoId(doc._id)} skipped: thread ${oldThreadId} not found`
      );

      continue;
    }

    try {
      await prisma.message.create({
        data: {
          threadId,
          message: stringOrEmpty(doc.message),
          fromAdmin: bool(doc.fromAdmin),
          readByAdmin: bool(doc.readByAdmin),
          clientId: stringOrNull(doc.clientId),
          createdAt: date(doc.createdAt),
          updatedAt: date(doc.updatedAt),
        },
      });

      imported(collection);
    } catch (error) {
      failed(collection);

      console.error(
        `❌ Message ${mongoId(doc._id)}: ${error.message}`
      );
    }
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log("\n");
  console.log("══════════════════════════════════════════════");
  console.log(" MongoDB → PostgreSQL Church Website Migration");
  console.log("══════════════════════════════════════════════");
  console.log(`Backup: ${BACKUP_DIR}`);
  console.log("IDs: NEW PostgreSQL UUIDs");
  console.log("Mongo _id: relationship mapping only");
  console.log("══════════════════════════════════════════════\n");

  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(
      `Backup directory does not exist: ${BACKUP_DIR}`
    );
  }

  await prisma.$connect();

  console.log("✓ PostgreSQL connected\n");

  // Dependency order
  await importLanguages();
  await importUsers();
  await importCategories();
  await importChurches();

  await importChurchPeople();
  await importChurchStories();
  await importHomeHeroes();
  await importFaqs();
  await importMissionVisions();
  await importPromotions();
  await importServices();
  await importAbouts();

  await importBankAccounts();
  await importContacts();
  await importSubscribers();
  await importThreads();
  await importVerificationCodes();

  await importPosts();
  await importMedia();
  await importAssignments();
  await importMessages();

  console.log("\n");
  console.log("══════════════════════════════════════════════");
  console.log(" MIGRATION RESULTS");
  console.log("══════════════════════════════════════════════");

  for (const [name, value] of Object.entries(stats)) {
    console.log(
      `${name.padEnd(20)} ` +
      `seen=${String(value.seen).padStart(3)} ` +
      `imported=${String(value.imported).padStart(3)} ` +
      `skipped=${String(value.skipped).padStart(3)} ` +
      `failed=${String(value.failed).padStart(3)}`
    );
  }

  console.log("══════════════════════════════════════════════");

  const failures = Object.values(stats).reduce(
    (sum, value) => sum + value.failed,
    0
  );

  const skips = Object.values(stats).reduce(
    (sum, value) => sum + value.skipped,
    0
  );

  console.log(`\nTotal failed:  ${failures}`);
  console.log(`Total skipped: ${skips}`);

  if (failures === 0) {
    console.log("\n✓ Migration completed without import errors.");
  } else {
    console.log(
      "\n⚠ Migration completed with failures. Review the errors above."
    );
  }
}

main()
  .catch((error) => {
    console.error("\n❌ MIGRATION ABORTED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
