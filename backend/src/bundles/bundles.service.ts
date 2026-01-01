import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { BundleEntity } from './entities/bundle.entity';
import { UserRole } from '@prisma/client';

@Injectable()
export class BundlesService {
    constructor(private prisma: PrismaService) { }

    async findByZone(zoneId: string): Promise<BundleEntity[]> {
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
        }

        const bundles = await this.prisma.bundle.findMany({
            where: { zoneId },
            orderBy: { minutes: 'asc' },
        });

        return bundles.map((b) => new BundleEntity(b));
    }

    async create(
        zoneId: string,
        userId: string,
        userRole: UserRole,
        createDto: CreateBundleDto,
    ): Promise<BundleEntity> {
        // Validar ownership
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
            include: { lan: true },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
        }

        if (zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para crear bundles en esta zona');
        }

        const bundle = await this.prisma.bundle.create({
            data: {
                name: createDto.name,
                minutes: createDto.minutes,
                price: createDto.price,
                isSaveable: createDto.isSaveable || false,
                zone: {
                    connect: { id: zoneId },
                },
            },
        });

        return new BundleEntity(bundle);
    }

    async update(
        id: string,
        userId: string,
        userRole: UserRole,
        updateDto: UpdateBundleDto,
    ): Promise<BundleEntity> {
        const bundle = await this.prisma.bundle.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
            },
        });

        if (!bundle) {
            throw new NotFoundException(`Bundle con ID ${id} no encontrado`);
        }

        // Validar ownership
        if (bundle.zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para modificar este bundle');
        }

        const updated = await this.prisma.bundle.update({
            where: { id },
            data: updateDto,
        });

        return new BundleEntity(updated);
    }

    async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
        const bundle = await this.prisma.bundle.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
            },
        });

        if (!bundle) {
            throw new NotFoundException(`Bundle con ID ${id} no encontrado`);
        }

        // Validar ownership
        if (bundle.zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para eliminar este bundle');
        }

        await this.prisma.bundle.delete({
            where: { id },
        });
    }
}
