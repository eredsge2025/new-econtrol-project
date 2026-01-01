
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const lanId = '724f11c3-b44c-46a1-80fb-8ba0ce6ceeec';
    const pcName = 'PC02';

    console.log(`Cleaning up ${pcName} in LAN ${lanId}...`);

    const pc = await prisma.pC.findFirst({
        where: {
            name: pcName,
            zone: { lanId: lanId }
        }
    });

    if (!pc) {
        console.error(`PC '${pcName}' not found in LAN ${lanId}.`);
        console.log('Available PCs:');
        const allPcs = await prisma.pC.findMany({
            where: { zone: { lanId: lanId } },
            select: { name: true, id: true, status: true }
        });
        allPcs.forEach(p => console.log(`- ${p.name} (${p.status})`));
        return;
    }

    console.log(`Found PC: ${pc.id}`);

    // 1. Close Sessions
    const sessions = await prisma.session.updateMany({
        where: { pcId: pc.id, status: 'ACTIVE' },
        data: { status: 'COMPLETED', endedAt: new Date() }
    });
    console.log(`Closed ${sessions.count} active sessions.`);

    // 2. Clear Active Users
    const users = await prisma.user.updateMany({
        where: { activePcId: pc.id },
        data: { activePcId: null }
    });
    console.log(`Unlinked ${users.count} users.`);

    // 3. Set PC Available
    await prisma.pC.update({
        where: { id: pc.id },
        data: { status: 'AVAILABLE' }
    });
    console.log('PC status set to AVAILABLE.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
