import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning Database...');

    // 1. Delete Transactions (linked to sessions)
    console.log('Deleting Transactions...');
    await prisma.transaction.deleteMany({});

    // 2. Delete Sessions
    console.log('Deleting Sessions...');
    await prisma.session.deleteMany({});

    // 3. Reset PCs (Status -> AVAILABLE, No Active User)
    console.log('Resetting PCs...');
    await prisma.pC.updateMany({
        data: {
            status: 'AVAILABLE',
        }
    });

    // Note: activePcId is on User model. We need to clear it for ALL users just in case.
    await prisma.user.updateMany({
        data: {
            activePcId: null
        }
    });

    // 4. Delete Guest Users
    console.log('Deleting Guest Users...');
    await prisma.user.deleteMany({
        where: {
            OR: [
                { username: { startsWith: 'guest_' } },
                { email: { endsWith: '@local.lan' } }
            ]
        }
    });

    console.log('✅ Database Cleaned Successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
