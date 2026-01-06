import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(lanId?: string, q?: string): Promise<UserEntity[]> {
        const whereClause: any = {};

        if (lanId) {
            whereClause.OR = [
                { homeLanId: lanId },
                {
                    sessions: {
                        some: {
                            pc: {
                                zone: {
                                    lanId: lanId
                                }
                            }
                        }
                    }
                }
            ];
        }

        if (q) {
            whereClause.OR = [
                ...(whereClause.OR || []),
                { username: { contains: q } }, // Case insensitive by default in some DBs, strict in others. Prisma usually requires mode: 'insensitive'
                { email: { contains: q } }
            ];
        }

        const users = await this.prisma.user.findMany({
            where: whereClause,
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
                updatedAt: true,
                lastVisit: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return users.map((user) => new UserEntity(user));
    }

    async create(createUserDto: any): Promise<UserEntity> {
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: createUserDto.email },
                    { username: createUserDto.username },
                ],
            },
        });

        if (existing) {
            throw new ConflictException('Email o usuario ya existe');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: createUserDto.email,
                username: createUserDto.username,
                passwordHash: hashedPassword,
                homeLanId: createUserDto.homeLanId,
                role: 'CLIENT', // Default role for created users
            },
        });

        return new UserEntity(user);
    }

    async findOne(id: string): Promise<UserEntity> {
        const user = await this.prisma.user.findUnique({
            where: { id },
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
                updatedAt: true,
                lastVisit: true,
                homeLanId: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        return new UserEntity(user);
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        const user = await this.prisma.user.findUnique({
            where: { email },
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
                updatedAt: true,
                lastVisit: true,
                homeLanId: true,
            },
        });

        return user ? new UserEntity(user) : null;
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
        // Verificar si el usuario existe
        await this.findOne(id);

        // Si se está actualizando email o username, verificar que no exista
        if (updateUserDto.email || updateUserDto.username) {
            const existing = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        updateUserDto.email ? { email: updateUserDto.email } : {},
                        updateUserDto.username ? { username: updateUserDto.username } : {},
                    ],
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('Email o username ya existe');
            }
        }

        const updated = await this.prisma.user.update({
            where: { id },
            data: updateUserDto,
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
                updatedAt: true,
                lastVisit: true,
                homeLanId: true,
            },
        });

        return new UserEntity(updated);
    }

    async updateBalance(id: string, amount: number, lanId: string, paymentMethod: string = 'CASH'): Promise<UserEntity> {
        // Verificar que el usuario existe
        const user = await this.findOne(id);

        const [updatedUser] = await this.prisma.$transaction([
            // 1. Actualizar balance del usuario
            this.prisma.user.update({
                where: { id },
                data: {
                    balance: {
                        increment: amount,
                    },
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
                    updatedAt: true,
                    lastVisit: true,
                    homeLanId: true // Ensure we select what UserEntity needs, or just map carefully
                },
            }),
            // 2. Crear registro de transacción financiera
            this.prisma.transaction.create({
                data: {
                    userId: id,
                    lanId: lanId,
                    type: 'RECHARGE',
                    amount: amount,
                    balanceBefore: user.balance, // Balance *before* the increment
                    balanceAfter: Number(user.balance) + amount,
                    paymentMethod: paymentMethod,
                    description: `Recarga de saldo (${paymentMethod})`
                }
            })
        ]);

        return new UserEntity(updatedUser);
    }

    async getStats(id: string) {
        const user = await this.findOne(id);

        const [sessionsCount, totalSpent, activeReservations] = await Promise.all([
            this.prisma.session.count({ where: { userId: id } }),
            this.prisma.session.aggregate({
                where: { userId: id },
                _sum: { totalCost: true },
            }),
            this.prisma.reservation.count({
                where: { userId: id, status: 'PENDING' },
            }),
        ]);

        return {
            user,
            stats: {
                sessionsCount,
                totalSpent: totalSpent._sum.totalCost || 0,
                activeReservations,
            },
        };
    }
}
