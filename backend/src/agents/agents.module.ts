import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
    imports: [PrismaModule, SessionsModule],
    controllers: [AgentsController],
    exports: [],
})
export class AgentsModule { }
