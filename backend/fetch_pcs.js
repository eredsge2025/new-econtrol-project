const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const lanId = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec";
    console.log("Searching for PCs in LAN:", lanId);
    const pcs = await prisma.pC.findMany({
        where: { zone: { lanId: lanId } },
        select: { id: true, name: true, ipAddress: true, zoneId: true }
    });
    console.log("Found PCs:", JSON.stringify(pcs, null, 2));
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
