import { Module } from '@nestjs/common';
import { BundlesService } from './bundles.service';
import { BundlesController } from './bundles.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BundlesController],
    providers: [BundlesService],
    exports: [BundlesService],
})
export class BundlesModule { }
