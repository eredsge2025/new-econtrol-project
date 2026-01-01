import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveUserDto, RejectUserDto } from './dto/approval.dto';
import { UserRole, ApprovalStatus, ApprovalAction } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    /**
     * Obtener solicitudes pendientes de LAN_ADMIN
     * Solo SUPER_ADMIN puede ver esto
     */
    async getPendingApprovals(userId: string, userRole: UserRole) {
        if (userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Solo SUPER_ADMIN puede ver solicitudes pendientes');
        }

        const pendingUsers = await this.prisma.user.findMany({
            where: {
                role: UserRole.LAN_ADMIN,
                approvalStatus: ApprovalStatus.PENDING,
            },
            select: {
                id: true,
                email: true,
                username: true,
                phone: true,
                role: true, // Necesario para verificar el rol en el frontend
                createdAt: true,
                approvalStatus: true,
                requestedLanData: true, // Datos del LAN solicitado
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return pendingUsers;
    }

    /**
     * Aprobar un LAN_ADMIN
     * Crea el LAN y asigna al usuario
     */
    async approveUser(
        adminId: string,
        userRole: UserRole,
        targetUserId: string,
        approveDto: ApproveUserDto,
    ) {
        if (userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Solo SUPER_ADMIN puede aprobar usuarios');
        }

        // Verificar que el usuario existe y está pendiente
        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        if (user.approvalStatus !== ApprovalStatus.PENDING) {
            throw new BadRequestException(
                `Usuario ya está en estado: ${user.approvalStatus}`,
            );
        }

        if (user.role !== UserRole.LAN_ADMIN) {
            throw new BadRequestException('Solo se pueden aprobar solicitudes de LAN_ADMIN');
        }

        const now = new Date();

        // Usar transaction para aprobar usuario y crear LAN si aplica
        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Aprobar usuario
            const updatedUser = await tx.user.update({
                where: { id: targetUserId },
                data: {
                    approvalStatus: ApprovalStatus.APPROVED,
                    approvedBy: adminId,
                    approvedAt: now,
                },
            });

            // 2. Si es LAN_ADMIN y tiene requestedLanData, crear el LAN Center
            let createdLan = null;
            if (user.role === UserRole.LAN_ADMIN && user.requestedLanData) {
                const lanData = user.requestedLanData as {
                    lanName: string;
                    lanAddress: string;
                    lanCity: string;
                    lanCountry: string;
                };

                // Generar slug único a partir del nombre
                const baseSlug = lanData.lanName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');

                let slug = baseSlug;
                let counter = 1;

                // Verificar que el slug sea único
                while (await tx.lANCenter.findUnique({ where: { slug } })) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }

                // Crear el LAN Center
                createdLan = await tx.lANCenter.create({
                    data: {
                        name: lanData.lanName,
                        slug,
                        address: lanData.lanAddress,
                        city: lanData.lanCity,
                        country: lanData.lanCountry,
                        ownerId: targetUserId,
                    },
                });

                // 3. Limpiar requestedLanData ya que el LAN fue creado
                await tx.user.update({
                    where: { id: targetUserId },
                    data: { requestedLanData: null },
                });
            }

            // 4. 🆕 Registrar en Audit Log
            await tx.approvalLog.create({
                data: {
                    adminId,
                    targetUserId,
                    action: ApprovalAction.APPROVED,
                    requestedLanData: user.requestedLanData,
                },
            });

            return { updatedUser, createdLan };
        });

        return {
            message: result.createdLan
                ? `Usuario aprobado y LAN Center "${result.createdLan.name}" creado exitosamente`
                : 'Usuario aprobado exitosamente',
            user: result.updatedUser,
            lanCenter: result.createdLan,
        };
    }

    /**
     * Rechazar un LAN_ADMIN
     */
    async rejectUser(
        adminId: string,
        userRole: UserRole,
        targetUserId: string,
        rejectDto: RejectUserDto,
    ) {
        if (userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Solo SUPER_ADMIN puede rechazar usuarios');
        }

        // Verificar que el usuario existe y está pendiente
        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        if (user.approvalStatus !== ApprovalStatus.PENDING) {
            throw new BadRequestException(
                `Usuario ya está en estado: ${user.approvalStatus}`,
            );
        }

        // Rechazar usuario usando transacción
        const now = new Date();

        const result = await this.prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: targetUserId },
                data: {
                    approvalStatus: ApprovalStatus.REJECTED,
                    rejectedAt: now,
                    rejectionReason: rejectDto.reason || 'Sin razón especificada',
                },
            });

            // 🆕 Registrar en Audit Log
            await tx.approvalLog.create({
                data: {
                    adminId,
                    targetUserId,
                    action: ApprovalAction.REJECTED,
                    reason: rejectDto.reason || 'Sin razón especificada',
                    requestedLanData: user.requestedLanData,
                },
            });

            return updatedUser;
        });

        // TODO: Enviar email de notificación de rechazo

        return result;
    }

    /**
     * Obtener estadísticas de solicitudes
     */
    async getApprovalStats(userRole: UserRole) {
        if (userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Solo SUPER_ADMIN puede ver estadísticas');
        }

        const [pending, approved, rejected] = await Promise.all([
            this.prisma.user.count({
                where: {
                    role: UserRole.LAN_ADMIN,
                    approvalStatus: ApprovalStatus.PENDING,
                },
            }),
            this.prisma.user.count({
                where: {
                    role: UserRole.LAN_ADMIN,
                    approvalStatus: ApprovalStatus.APPROVED,
                },
            }),
            this.prisma.user.count({
                where: {
                    role: UserRole.LAN_ADMIN,
                    approvalStatus: ApprovalStatus.REJECTED,
                },
            }),
        ]);

        return {
            pending,
            approved,
            rejected,
            total: pending + approved + rejected,
        };
    }

    /**
     * Obtener historial de approval logs
     * Solo SUPER_ADMIN puede ver esto
     */
    async getApprovalLogs(
        userRole: UserRole,
        filters?: {
            action?: any; // ApprovalAction enum
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        },
    ) {
        if (userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Solo SUPER_ADMIN puede ver logs de auditoría');
        }

        const where: any = {};

        if (filters?.action) {
            where.action = filters.action;
        }

        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.createdAt.lte = filters.endDate;
            }
        }

        const [logs, total] = await Promise.all([
            this.prisma.approvalLog.findMany({
                where,
                include: {
                    admin: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    targetUser: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
            }),
            this.prisma.approvalLog.count({ where }),
        ]);

        return {
            logs,
            total,
            limit: filters?.limit || 50,
            offset: filters?.offset || 0,
        };
    }
}
