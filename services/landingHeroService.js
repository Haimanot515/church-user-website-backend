const prisma = require("../prisma/prisma.service");

// Mirrors: LandingHero.findOne()
exports.getLanding = async () => {
  return prisma.landingHero.findFirst();
};

// Shared upsert helper for all four landingController update endpoints
// (updateHero, updateAcademic, updateVideos, updateLifestyle), each of
// which mirrors: LandingHero.findOneAndUpdate({}, {$set:updateData}, {new:true, upsert:true})
// Mongo's upsert-on-empty-filter enforced a de facto singleton; Prisma
// has no filterless upsert, so this replicates it explicitly:
// find the one row (if any), then update it or create it.
exports.upsertLanding = async (updateData) => {
  const existing = await prisma.landingHero.findFirst();
  if (existing) {
    return prisma.landingHero.update({
      where: { id: existing.id },
      data: updateData,
    });
  }
  return prisma.landingHero.create({ data: updateData });
};