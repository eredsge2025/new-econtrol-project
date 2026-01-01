import { Module } from '@nestjs/common';
import { RateSchedulesService } from './rate-schedules.service';
import { RateSchedulesController } from './rate-schedules.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [RateSchedulesController],
    providers: [RateSchedulesService],
    exports: [RateSchedulesService],
})
export class RateSchedulesModule { }
