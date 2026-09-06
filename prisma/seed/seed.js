require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../prisma.service");

async function main() {
  console.log("Seeding started...");

  // ---------- LANGUAGES ----------
  const en = await prisma.language.upsert({
    where: { code: "EN" },
    update: {},
    create: { name: "English", code: "EN" },
  });
  const am = await prisma.language.upsert({
    where: { code: "AM" },
    update: {},
    create: { name: "Amharic", code: "AM" },
  });
  console.log("Languages seeded.");

  // ---------- USERS ----------
  const hashedPassword = await bcrypt.hash("Password123!", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      isAdmin: true,
      isVerified: true,
    },
  });
  const regularUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      name: "Regular User",
      email: "user@example.com",
      password: hashedPassword,
      isAdmin: false,
      isVerified: true,
    },
  });
  console.log("Users seeded.");

  // ---------- CATEGORIES ----------
  const travelCategoryEn = await prisma.category.upsert({
    where: { slug_languageId: { slug: "travel", languageId: en.id } },
    update: {},
    create: {
      name: "Travel",
      slug: "travel",
      description: "Travel-related posts",
      languageId: en.id,
    },
  });
  const faithCategoryEn = await prisma.category.upsert({
    where: { slug_languageId: { slug: "faith", languageId: en.id } },
    update: {},
    create: {
      name: "Faith",
      slug: "faith",
      description: "Faith-related posts",
      languageId: en.id,
    },
  });
  console.log("Categories seeded.");

  // ---------- CHURCH ----------
  const church = await prisma.church.create({
    data: {
      churchName: "St. Mary's Church",
      description: "A welcoming congregation in the heart of the city.",
      history: "Founded in 1950.",
      image: "https://placehold.co/600x400",
      address: "123 Main St, Addis Ababa",
      serviceDays: "Sunday",
      serviceTime: "9:00 AM",
      languageId: en.id,
      isFeatured: true,
      isPrimary: true,
    },
  });
  console.log("Church seeded.");

  // ---------- CHURCH ASSIGNMENT ----------
  await prisma.churchAssignment.create({
    data: {
      userId: adminUser.id,
      churchId: church.id,
      role: "Priest",
      servingSince: new Date("2015-01-01"),
      description: "Leading the congregation since 2015.",
      image: "https://placehold.co/300x300",
      isCurrent: true,
      isPrimary: true,
    },
  });
  console.log("ChurchAssignment seeded.");

  // ---------- CHURCH PERSON ----------
  await prisma.churchPerson.create({
    data: {
      name: "Father John",
      photos: ["https://placehold.co/300x300"],
      title: "Head Priest",
      description: "Serving the community for over a decade.",
      role: "Priest",
      message: "Welcome to our church family.",
      category: "leader",
      rank: "priest",
      rankOrder: 1,
      languageId: en.id,
    },
  });
  console.log("ChurchPerson seeded.");

  // ---------- CHURCH STORY ----------
  await prisma.churchStory.create({
    data: {
      range: "1998 - 2006",
      year: "1998",
      order: 1998,
      title: "The Early Years",
      desc: "How our church community began.",
      leader: "Father Michael",
      leaderRole: "Founding Priest",
      servedBy: "Father Michael",
      photo: "https://placehold.co/600x400",
      languageId: en.id,
    },
  });
  console.log("ChurchStory seeded.");

  // ---------- CONTACT ----------
  await prisma.contact.create({
    data: {
      name: "Jane Doe",
      email: "jane@example.com",
      message: "I would like more information about your services.",
    },
  });
  console.log("Contact seeded.");

  // ---------- FAQ ----------
  await prisma.faq.create({
    data: {
      question: "What time are services held?",
      answer: "Services are held every Sunday at 9:00 AM.",
      category: "Information",
      order: 1,
      languageId: en.id,
    },
  });
  console.log("Faq seeded.");

  // ---------- HOME HERO ----------
  await prisma.homeHero.create({
    data: {
      title: "Welcome Home",
      subtitle: "A place of grace",
      description: "Rooted in grace, reaching toward the light.",
      name: "Our Church",
      role: "Community",
      image: "https://placehold.co/1200x600",
      quote: "Come as you are.",
      story: "Our story began decades ago...",
      storyImage: "https://placehold.co/800x600",
      languageId: en.id,
    },
  });
  console.log("HomeHero seeded.");

  // ---------- LANDING HERO (singleton) ----------
  const existingLanding = await prisma.landingHero.findFirst();
  if (existingLanding) {
    await prisma.landingHero.update({
      where: { id: existingLanding.id },
      data: {},
    });
  } else {
    await prisma.landingHero.create({
      data: {
        title: "Building Digital Excellence",
        description: "Portfolio landing page seed data.",
        heroImage: "https://placehold.co/1200x600",
        image: "https://placehold.co/1200x600",
        missionTitle: "Our Mission",
        missionDescription: "To build excellent software.",
        personalBio: "A passionate backend developer.",
        aboutImage: "https://placehold.co/600x600",
      },
    });
  }
  console.log("LandingHero seeded.");

  // ---------- MEDIA ----------
  await prisma.media.create({
    data: {
      title: "Sunday Sermon",
      description: "This week's sermon recording.",
      mediaUrl: "https://placehold.co/audio.mp3",
      mediaType: "audio",
      authorId: adminUser.id,
      categoryId: faithCategoryEn.id,
      languageId: en.id,
      status: "published",
      publishedAt: new Date(),
    },
  });
  console.log("Media seeded.");

  // ---------- MISSION VISION ----------
  await prisma.missionVision.create({
    data: {
      type: "mission",
      title: "Our Mission",
      desc: "To spread love and community.",
      order: 1,
      languageId: en.id,
    },
  });
  await prisma.missionVision.create({
    data: {
      type: "vision",
      title: "Our Vision",
      desc: "A united and thriving congregation.",
      order: 2,
      languageId: en.id,
    },
  });
  console.log("MissionVision seeded.");

  // ---------- POST ----------
  await prisma.post.create({
    data: {
      title: "Our Trip to the Holy Land",
      description: "A reflection on our recent pilgrimage.",
      content: "Full article content goes here...",
      imageUrl: "https://placehold.co/800x400",
      authorId: adminUser.id,
      categoryId: travelCategoryEn.id,
      languageId: en.id,
      status: "published",
      isFeatured: true,
      publishedAt: new Date(),
    },
  });
  console.log("Post seeded.");

  // ---------- PROJECT HERO (singleton) ----------
  await prisma.projectHero.create({
    data: {
      title: "My Projects",
      subtitle: "What I've built",
      description: "A showcase of my work.",
      name: "Haimanot",
      role: "Backend Developer",
      image: "https://placehold.co/1200x600",
      quote: "Code with purpose.",
      story: "My journey as a developer...",
      storyImage: "https://placehold.co/800x600",
    },
  });
  console.log("ProjectHero seeded.");

  // ---------- PROJECT ----------
  await prisma.project.create({
    data: {
      owner: adminUser.id,
      title: "Church Website Backend",
      description: "A NestJS/Express backend migrated to Prisma + Postgres.",
      category: "Backend",
      image: "https://placehold.co/800x400",
      githubLink: "https://github.com/example/repo",
      liveLink: "https://example.com",
      techStack: ["Node.js", "Express", "Prisma", "PostgreSQL"],
    },
  });
  console.log("Project seeded.");

  // ---------- PROMOTION ----------
  await prisma.promotion.create({
    data: {
      title: "Annual Fundraiser",
      description: "Join us for our annual church fundraiser event.",
      photo: "https://placehold.co/800x400",
      languageId: en.id,
    },
  });
  console.log("Promotion seeded.");

  // ---------- SERVICE ----------
  await prisma.service.create({
    data: {
      title: "Sunday Worship",
      description: "Weekly worship service open to all.",
      imageUrl: "https://placehold.co/800x400",
      day: "Sunday",
      time: "9:00 AM",
      schedule: "Sunday, 9:00 AM",
      category: "Worship",
      languageId: en.id,
      location: "Main Hall",
      isFeatured: true,
      status: "active",
    },
  });
  console.log("Service seeded.");

  // ---------- SKILL HERO (singleton) ----------
  await prisma.skillHero.create({
    data: {
      title: "My Skills",
      subtitle: "What I bring to the table",
      description: "Technical skills and expertise.",
      name: "Haimanot",
      role: "Backend Developer",
      image: "https://placehold.co/1200x600",
      quote: "Always learning.",
      story: "My skill journey...",
      storyImage: "https://placehold.co/800x600",
    },
  });
  console.log("SkillHero seeded.");

  // ---------- SKILL ----------
  await prisma.skill.create({
    data: {
      name: "Node.js",
      level: "Advanced",
      category: "Backend",
    },
  });
  await prisma.skill.create({
    data: {
      name: "PostgreSQL",
      level: "Intermediate",
      category: "Backend",
    },
  });
  console.log("Skill seeded.");

  // ---------- SUBSCRIBER ----------
  await prisma.subscriber.create({
    data: {
      email: "subscriber@example.com",
      active: true,
      subscribedAt: new Date(),
    },
  });
  console.log("Subscriber seeded.");

  // ---------- THREAD + MESSAGE ----------
  const thread = await prisma.thread.create({
    data: {
      userName: "Jane Doe",
      userEmail: "jane@example.com",
      lastMessage: "Hello, I have a question.",
      lastMessageAt: new Date(),
      unreadForAdmin: 1,
    },
  });
  await prisma.message.create({
    data: {
      threadId: thread.id,
      message: "Hello, I have a question.",
      fromAdmin: false,
    },
  });
  console.log("Thread + Message seeded.");

  // ---------- ABOUT ----------
  await prisma.about.create({
    data: {
      title: "About Our Church",
      churchLeader: "Father John",
      description: "Learn more about our history and mission.",
      image: "https://placehold.co/800x400",
      languageId: en.id,
    },
  });
  console.log("About seeded.");

  // ---------- BANK ACCOUNT ----------
  await prisma.bankAccount.create({
    data: {
      bank: "Commercial Bank of Ethiopia",
      accountName: "Church Building Fund",
      accountNumber: "1000123456789",
      order: 1,
    },
  });
  console.log("BankAccount seeded.");

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
