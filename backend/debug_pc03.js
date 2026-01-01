
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    try {
        const pcs = await prisma.pC.findMany({
            where: {
                name: { in: ['PC03', 'PC04'] }
            },
            select: {
                name: true,
                status: true,
                ipAddress: true,
                lastHeartbeat: true
            }
        });
        fs.writeFileSync('pc_debug_data.json', JSON.stringify(pcs, null, 2));
        console.log('Data written to pc_debug_data.json');
    } catch (e) {
        console.error(e);
        fs.writeFileSync('pc_debug_error.txt', e.toString());
    } finally {
        await prisma.$disconnect();
    }
}

main();
