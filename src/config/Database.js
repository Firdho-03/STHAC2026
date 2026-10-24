const { PrismaClient } = require('@prisma/client');

class Database {
  constructor() {
    if (!Database.instance) {
      this.prisma = new PrismaClient();
      Database.instance = this;
    }
    return Database.instance;
  }

  getClient() {
    return this.prisma;
  }
}

const dbInstance = new Database();
module.exports = dbInstance;
module.exports.prisma = dbInstance.getClient();