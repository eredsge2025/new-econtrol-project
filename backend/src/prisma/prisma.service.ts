import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log:
                process.env.NODE_ENV === 'development'
                    ? ['info', 'warn', 'error']
                    : ['warn', 'error'],
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('✅ Connected to database');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('❌ Disconnected from database');
    }

    /**
     * Helper para excluir campos sensibles de queries
     * Uso: prisma.user.findUnique({ ...args, select: exclude(prisma.user.fields, ['passwordHash']) })
     */
    exclude<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
        const result = { ...obj };
        keys.forEach((key) => delete result[key]);
        return result;
    }
}
