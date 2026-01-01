const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lanId = '724f11c3-b44c-46a1-80fb-8ba0ce6ceeec';
    const lan = await prisma.lANCenter.findUnique({
        where: { id: lanId },
        select: { id: true, name: true, apiKey: true }
    });

    if (lan) {
        console.log('LAN Center encontrado:');
        console.log(JSON.stringify(lan, null, 2));
    } else {
        console.log('LAN Center no encontrado con ID:', lanId);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
