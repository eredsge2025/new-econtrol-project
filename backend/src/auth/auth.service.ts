import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PcsGateway } from '../pcs/pcs.gateway';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterLanAdminDto } from './dto/register-lan-admin.dto';
import * as bcrypt from 'bcrypt';
import { UserRole, ApprovalStatus, PCStatus } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private pcsGateway: PcsGateway,
    ) { }

    async register(registerDto: RegisterDto) {
        const { email, username, password, phone } = registerDto;

        // Verificar si el usuario ya existe
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            throw new UnauthorizedException('Email o username ya existe');
        }

        // Hash del password
        const passwordHash = await bcrypt.hash(password, 10);

        // Crear usuario
        const user = await this.prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                phone,
                role: UserRole.CLIENT,
            },
            select: {
                id: true,
                email: true,
                username: true,
                phone: true,
                balance: true,
                loyaltyPoints: true,
                membershipTier: true,
                role: true,
                createdAt: true,
            },
        });

        // Generar token
        const token = this.generateToken(user.id, user.email, user.role, user.username || '');

        return {
            user,
            access_token: token,
        };
    }

    async registerLanAdmin(registerDto: RegisterLanAdminDto) {
        const { email, username, password, phone } = registerDto;

        // Verificar si el usuario ya existe
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            throw new UnauthorizedException('Email o username ya existe');
        }

        // Hash del password
        const passwordHash = await bcrypt.hash(password, 10);

        // Preparar datos del LAN solicitado para guardar temporalmente
        const requestedLanData = {
            lanName: registerDto.lanName,
            lanAddress: registerDto.lanAddress,
            lanCity: registerDto.lanCity,
            lanCountry: registerDto.lanCountry,
        };

        // Crear usuario con rol LAN_ADMIN y estado PENDING
        const user = await this.prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                phone,
                role: UserRole.LAN_ADMIN,
                approvalStatus: ApprovalStatus.PENDING,
                requestedLanData, // Guardar datos del LAN solicitado
            },
            select: {
                id: true,
                email: true,
                username: true,
                phone: true,
                role: true,
                approvalStatus: true,
                createdAt: true,
            },
        });

        return {
            user,
            message: 'Solicitud de registro enviada. Espera aprobación del administrador.',
        };
    }

    async login(loginDto: LoginDto) {
        const { identifier, email, password } = loginDto;
        const loginId = identifier ?? email;

        if (!loginId) {
            throw new UnauthorizedException('Identificador (email o usuario) es requerido');
        }

        // Buscar usuario por email o username
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginId },
                    { username: loginId }
                ]
            },
        });

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Verificar password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Verificar si el usuario está aprobado (para LAN_ADMIN)
        if (user.role === UserRole.LAN_ADMIN && user.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new UnauthorizedException(
                `Tu cuenta está en estado: ${user.approvalStatus}. Espera aprobación del administrador.`,
            );
        }

        // --- SINGLE SESSION ENFORCEMENT ---
        // Verificar si el usuario ya tiene sesión activa en OTRO PC (usando activePcId)
        if (loginDto.pcId && user.role !== UserRole.LAN_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
            if (user.activePcId && user.activePcId !== loginDto.pcId) {
                const activePc = await this.prisma.pC.findUnique({ where: { id: user.activePcId } });
                throw new ConflictException(`Tienes una sesión activa en ${activePc?.name || 'otro PC'}`);
            }
        }
        // ----------------------------------

        // Actualizar última visita y PC activo
        const statusUpdate = loginDto.pcId ? {
            status: PCStatus.OCCUPIED
        } : {};

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastVisit: new Date(),
                    activePcId: loginDto.pcId || null
                },
            }),
            ...(loginDto.pcId ? [
                this.prisma.pC.update({
                    where: { id: loginDto.pcId },
                    data: { status: PCStatus.OCCUPIED }
                })
            ] : [])
        ]);

        // Emitir evento en tiempo real para el dashboard
        if (loginDto.pcId) {
            const pcWithLan = await this.prisma.pC.findUnique({
                where: { id: loginDto.pcId },
                include: {
                    zone: { include: { lan: true } },
                    activeUser: true
                }
            });

            if (pcWithLan) {
                this.pcsGateway.emitStatusUpdate(pcWithLan, pcWithLan.zone.lan.id);
            }
        }

        // Generar token
        const token = this.generateToken(user.id, user.email, user.role, user.username || '');

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                phone: user.phone,
                balance: user.balance,
                loyaltyPoints: user.loyaltyPoints,
                membershipTier: user.membershipTier,
                role: user.role,
            },
            access_token: token,
        };
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                phone: true,
                balance: true,
                loyaltyPoints: true,
                membershipTier: true,
                role: true,
                activePcId: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        return user;
    }

    async logout(userId: string) {
        // Obtener el usuario para saber qué PC liberar
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { activePcId: true }
        });

        const activePcId = user?.activePcId;

        // Liberar el PC activo para permitir login en otra máquina
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                activePcId: null,
            },
        });

        // Notificar en tiempo real
        if (activePcId) {
            const pcWithLan = await this.prisma.pC.findUnique({
                where: { id: activePcId },
                include: {
                    zone: { include: { lan: true } },
                    activeUser: true
                }
            });
            if (pcWithLan) {
                this.pcsGateway.emitStatusUpdate(pcWithLan, pcWithLan.zone.lan.id);
            }
        }

        return { success: true, message: 'Sesión cerrada exitosamente' };
    }

    private generateToken(userId: string, email: string, role: UserRole, username: string): string {
        const payload = { sub: userId, email, role, username };
        return this.jwtService.sign(payload);
    }
}
