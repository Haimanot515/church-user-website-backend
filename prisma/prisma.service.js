const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { AsyncLocalStorage } = require("async_hooks");

const txStorage = new AsyncLocalStorage();

class PrismaService extends PrismaClient {
  constructor() {
    super({
      adapter: new PrismaPg(process.env.DATABASE_URL),
    });

    // Automatically route Prisma model operations
    // through the active transaction client.
    return new Proxy(this, {
      get(target, prop) {
        const tx = txStorage.getStore();

        if (tx && typeof prop === "string" && prop in tx) {
          const value = tx[prop];
          return typeof value === "function" ? value.bind(tx) : value;
        }

        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  // Run database operations inside a Prisma transaction.
  runInTransaction(fn) {
    return this.$transaction((tx) => txStorage.run(tx, fn));
  }

  // Run an operation outside the current transaction using
  // the normal Prisma client.
  runFresh(fn) {
    return txStorage.exit(fn);
  }

  async connect() {
    await this.$connect();
    console.log("Prisma database connection established");
  }
}

module.exports = new PrismaService();
