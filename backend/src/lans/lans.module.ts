import { Module } from '@nestjs/common';
import { LANsService } from './lans.service';
import { LANsController } from './lans.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [LANsController],
    providers: [LANsService],
    exports: [LANsService],
})
export class LANsModule { }
