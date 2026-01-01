
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Clearing all sessions...');
    await prisma.transaction.deleteMany({}); // Delete transactions first if foreign key
    await prisma.session.deleteMany({});

    console.log('🔄 Resetting PC statuses to AVAILABLE...');
    await prisma.pC.updateMany({
        data: { status: 'AVAILABLE' }
    });

    console.log('👤 Resetting User activePcId...');
    await prisma.user.updateMany({
        data: { activePcId: null }
    });

    console.log('✅ Done!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
