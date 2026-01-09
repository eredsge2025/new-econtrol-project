import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Starting data cleanup...');

    try {
        // 1. Delete all transactions
        console.log('Deleting transactions...');
        await prisma.transaction.deleteMany({});

        // 2. Delete all orders and order items
        console.log('Deleting orders and items...');
        await prisma.orderItem.deleteMany({});
        await prisma.order.deleteMany({});

        // 3. Delete all sessions
        console.log('Deleting sessions...');
        await prisma.session.deleteMany({});

        // 4. Reset user balances
        console.log('Resetting user balances...');
        await prisma.user.updateMany({
            data: {
                balance: 0,
                activePcId: null, // Ensure no user is stuck in a PC
            },
        });

        // 5. Reset PC status
        console.log('Resetting PC status...');
        await prisma.pC.updateMany({
            data: {
                status: 'AVAILABLE'
            }
        })

        console.log('✅ Data cleanup completed successfully.');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
