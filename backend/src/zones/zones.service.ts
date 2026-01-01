import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneEntity } from './entities/zone.entity';
import { UserRole } from '@prisma/client';

@Injectable()
export class ZonesService {
    constructor(private prisma: PrismaService) { }

    async findByLan(lanId: string): Promise<ZoneEntity[]> {
        // Verificar que el LAN existe
        const lan = await this.prisma.lANCenter.findUnique({
            where: { id: lanId },
        });

        if (!lan) {
            throw new NotFoundException(`LAN Center con ID ${lanId} no encontrado`);
        }

        const zones = await this.prisma.zone.findMany({
            where: { lanId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        pcs: true,
                    },
                },
            },
        });

        return zones.map((zone) => new ZoneEntity(zone));
    }

    async findOne(id: string): Promise<ZoneEntity> {
        const zone = await this.prisma.zone.findUnique({
            where: { id },
            include: {
                lan: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                    },
                },
                _count: {
                    select: {
                        pcs: true,
                    },
                },
            },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${id} no encontrada`);
        }

        return new ZoneEntity(zone);
    }

    async create(
        lanId: string,
        userId: string,
        userRole: UserRole,
        createZoneDto: CreateZoneDto,
    ): Promise<ZoneEntity> {
        // Verificar que el LAN existe y el usuario es owner
        const lan = await this.prisma.lANCenter.findUnique({
            where: { id: lanId },
        });

        if (!lan) {
            throw new NotFoundException(`LAN Center con ID ${lanId} no encontrado`);
        }

        // Validar ownership
        if (lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para crear zonas en este LAN Center');
        }

        const zone = await this.prisma.zone.create({
            data: {
                name: createZoneDto.name,
                description: createZoneDto.description,
                baseRate: createZoneDto.baseRate,
                lan: {
                    connect: { id: lanId },
                },
            },
            include: {
                _count: {
                    select: {
                        pcs: true,
                    },
                },
            },
        });

        return new ZoneEntity(zone);
    }

    async update(
        id: string,
        userId: string,
        userRole: UserRole,
        updateZoneDto: UpdateZoneDto,
    ): Promise<ZoneEntity> {
        const zone = await this.prisma.zone.findUnique({
            where: { id },
            include: {
                lan: true,
            },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${id} no encontrada`);
        }

        // Validar ownership del LAN
        if (zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para modificar esta zona');
        }

        const updated = await this.prisma.zone.update({
            where: { id },
            data: updateZoneDto,
            include: {
                _count: {
                    select: {
                        pcs: true,
                    },
                },
            },
        });

        return new ZoneEntity(updated);
    }

    async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
        const zone = await this.prisma.zone.findUnique({
            where: { id },
            include: {
                lan: true,
                _count: {
                    select: {
                        pcs: true,
                    },
                },
            },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${id} no encontrada`);
        }

        // Validar ownership
        if (zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para eliminar esta zona');
        }

        // Verificar que no tenga PCs
        if (zone._count.pcs > 0) {
            throw new BadRequestException(
                `No se puede eliminar la zona porque tiene ${zone._count.pcs} PC(s) asociado(s)`,
            );
        }

        await this.prisma.zone.delete({
            where: { id },
        });
    }

    async getStats(id: string) {
        const zone = await this.findOne(id);

        const [pcsCount, pcsByStatus, activeSessions] = await Promise.all([
            this.prisma.pC.count({ where: { zoneId: id } }),
            this.prisma.pC.groupBy({
                by: ['status'],
                where: { zoneId: id },
                _count: true,
            }),
            this.prisma.session.count({
                where: {
                    pc: { zoneId: id },
                    status: 'ACTIVE',
                },
            }),
        ]);

        return {
            zone,
            stats: {
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
