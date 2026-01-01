import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const lan = await prisma.lANCenter.findFirst();
    if (lan) {
        console.log('FOUND API KEY:', lan.apiKey || 'No API Key found');
        console.log('LAN ID:', lan.id);
    } else {
        console.log('No LAN Center found in database');
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
