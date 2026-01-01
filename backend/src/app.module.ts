import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LANsModule } from './lans/lans.module';
import { ZonesModule } from './zones/zones.module';
import { PcsModule } from './pcs/pcs.module';
import { RateSchedulesModule } from './rate-schedules/rate-schedules.module';
import { BundlesModule } from './bundles/bundles.module';
import { SessionsModule } from './sessions/sessions.module';
import { AdminModule } from './admin/admin.module';

@Module({
    imports: [PrismaModule, AuthModule, UsersModule, LANsModule, ZonesModule, PcsModule, RateSchedulesModule, BundlesModule, SessionsModule, AdminModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
