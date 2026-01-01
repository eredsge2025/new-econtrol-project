import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { PcsModule } from '../pcs/pcs.module';

@Module({
    imports: [
        PrismaModule,
        PcsModule,
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'tu-secret-key-super-seguro-cambiar-en-produccion',
            signOptions: { expiresIn: '15m' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
