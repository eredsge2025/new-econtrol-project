
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Resetting PC03 and PC04 to AVAILABLE...');

        await prisma.pC.updateMany({
            where: {
                name: { in: ['PC03', 'PC04'] }
            },
            data: {
                status: 'AVAILABLE',
                lastHeartbeat: new Date() // Reset heartbeat to now so they are "valid" for a moment
            }
        });

        console.log('Status reset successful. Now wait 20 seconds for the monitor to catch them.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
