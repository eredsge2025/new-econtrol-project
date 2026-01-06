const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const apiKey = "8fc837e8-77a4-49e7-8274-f10bdfa0f78b";
    console.log("Searching for PC with API Key:", apiKey);
    const pc = await prisma.pC.findFirst({
        where: { apiKey: apiKey },
        select: { id: true, name: true, ipAddress: true, zoneId: true }
    });
    console.log("Found PC:", JSON.stringify(pc, null, 2));
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
