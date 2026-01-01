import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const lan = await prisma.lANCenter.findFirst();
    if (!lan) {
        console.error('No LAN Center found');
        return;
    }

    const zoneCount = await prisma.zone.count({
        where: { lanId: lan.id },
    });

    if (zoneCount === 0) {
        console.log('Creating default zone...');
        await prisma.zone.create({
            data: {
                lanId: lan.id,
                name: 'Zona General',
                baseRate: 2.0,
                position: 1
            },
        });
        console.log('Default zone created.');
    } else {
        console.log('Zones already exist. Count:', zoneCount);
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
