import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLanDto } from './dto/create-lan.dto';
import { UpdateLanDto } from './dto/update-lan.dto';
import { LanEntity } from './entities/lan.entity';
import { UserRole } from '@prisma/client';

@Injectable()
export class LANsService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string, userRole: UserRole): Promise<LanEntity[]> {
        const where =
            userRole === UserRole.SUPER_ADMIN
                ? {} // Super admin ve todos
                : { ownerId: userId }; // Otros solo ven los suyos

        const lans = await this.prisma.lANCenter.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        zones: true,
                        staff: true,
                        sessions: true,
                    },
                },
            },
        });

        return lans.map((lan) => new LanEntity(lan));
    }

    async findOne(id: string): Promise<LanEntity> {
        const lan = await this.prisma.lANCenter.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        zones: true,
                        staff: true,
                        sessions: true,
                        products: true,
                    },
                },
            },
        });

        if (!lan) {
            throw new NotFoundException(`LAN Center con ID ${id} no encontrado`);
        }

        return new LanEntity(lan);
    }

    async findBySlug(slug: string): Promise<LanEntity> {
        const lan = await this.prisma.lANCenter.findUnique({
            where: { slug },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });

        if (!lan) {
            throw new NotFoundException(`LAN Center con slug "${slug}" no encontrado`);
        }

        return new LanEntity(lan);
    }

    async create(ownerId: string, createLanDto: CreateLanDto): Promise<LanEntity> {
        // Verificar que el slug sea único
        const existingLan = await this.prisma.lANCenter.findUnique({
            where: { slug: createLanDto.slug },
        });

        if (existingLan) {
            throw new ConflictException(`El slug "${createLanDto.slug}" ya está en uso`);
        }

        const lan = await this.prisma.lANCenter.create({
            data: {
                ...createLanDto,
                ownerId,
                settings: createLanDto.settings || {},
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });

        return new LanEntity(lan);
    }

    async update(
        id: string,
        userId: string,
        userRole: UserRole,
        updateLanDto: UpdateLanDto,
    ): Promise<LanEntity> {
        const lan = await this.prisma.lANCenter.findUnique({
            where: { id },
        });

        if (!lan) {
            throw new NotFoundException(`LAN Center con ID ${id} no encontrado`);
        }

        // Solo el owner o SUPER_ADMIN pueden modificar
        if (lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para modificar este LAN Center');
        }

        const updated = await this.prisma.lANCenter.update({
            where: { id },
            data: updateLanDto,
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });

        return new LanEntity(updated);
    }

    async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
        const lan = await this.prisma.lANCenter.findUnique({
            where: { id },
        });

        if (!lan) {
            throw new NotFoundException(`LAN Center con ID ${id} no encontrado`);
        }

        // Solo el owner o SUPER_ADMIN pueden eliminar
        if (lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para eliminar este LAN Center');
        }

        // Soft delete: cambiar status a CANCELLED
        await this.prisma.lANCenter.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }

    async getStats(id: string) {
        const lan = await this.findOne(id);

        // Agregar stats más detalladas
        const [zonesCount, pcsCount, activeSessions, pcsByStatus] = await Promise.all([
            this.prisma.zone.count({ where: { lanId: id } }),
            this.prisma.pC.count({ where: { zone: { lanId: id } } }),
            this.prisma.session.count({
                where: { lanId: id, status: 'ACTIVE' },
            }),
            this.prisma.pC.groupBy({
                by: ['status'],
                where: { zone: { lanId: id } },
                _count: true,
            }),
        ]);

        return {
            lan,
            stats: {
                zonesCount,
                pcsCount,
                activeSessions,
                pcsByStatus: pcsByStatus.reduce(
                    (acc, item) => {
                        acc[item.status] = item._count;
                        return acc;
                    },
                    {} as Record<string, number>,
                ),
            },
        };
    }
}
