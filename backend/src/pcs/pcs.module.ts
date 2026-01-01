import { Module } from '@nestjs/common';
import { PcsService } from './pcs.service';
import { PcsController } from './pcs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PcsMonitorService } from './pcs-monitor.service';
import { PcsGateway } from './pcs.gateway';

@Module({
    imports: [PrismaModule],
    controllers: [PcsController],
    providers: [PcsService, PcsMonitorService, PcsGateway],
    exports: [PcsService, PcsGateway],
})
export class PcsModule { }
