
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const lanId = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec";
    const pcNames = ["PC01", "PC06"];

    console.log(`Searching for PCs: ${pcNames.join(', ')} in LAN: ${lanId}`);

    const pcs = await prisma.pC.findMany({
        where: {
            zone: {
                lanId: lanId
            },
            name: { in: pcNames }
        }
    });

    if (pcs.length === 0) {
        console.log("No PCs found.");
        return;
    }

    console.log(`Found ${pcs.length} PCs:`, pcs.map(p => `${p.name} (${p.id})`));
    const pcIds = pcs.map(p => p.id);

    // 1. Terminate active sessions
    const sessionUpdate = await prisma.session.updateMany({
        where: {
            pcId: { in: pcIds },
            endedAt: null
        },
        data: {
            endedAt: new Date(),
            status: 'COMPLETED'
        }
    });
    console.log(`Terminated ${sessionUpdate.count} active sessions.`);

    // 2. Clear Active User on Users table (since it holds the foreign key activePcId)
    const userUpdate = await prisma.user.updateMany({
        where: {
            activePcId: { in: pcIds }
        },
        data: {
            activePcId: null
        }
    });
    console.log(`Unlinked active users from ${userUpdate.count} PCs.`);

    // 3. Reset PC Status
    const pcUpdate = await prisma.pC.updateMany({
        where: {
            id: { in: pcIds }
        },
        data: {
            status: 'AVAILABLE'
        }
    });

    console.log(`Reset status for ${pcUpdate.count} PCs.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
