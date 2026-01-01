import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRateScheduleDto } from './dto/create-rate-schedule.dto';
import { UpdateRateScheduleDto } from './dto/update-rate-schedule.dto';
import { RateScheduleEntity } from './entities/rate-schedule.entity';
import { UserRole } from '@prisma/client';

@Injectable()
export class RateSchedulesService {
    constructor(private prisma: PrismaService) { }

    async findByZone(zoneId: string): Promise<RateScheduleEntity[]> {
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
        }

        const schedules = await this.prisma.rateSchedule.findMany({
            where: { zoneId },
            orderBy: { minutes: 'asc' },
        });

        return schedules.map((s) => new RateScheduleEntity(s));
    }

    async create(
        zoneId: string,
        userId: string,
        userRole: UserRole,
        createDto: CreateRateScheduleDto,
    ): Promise<RateScheduleEntity> {
        // Validar ownership
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
            include: { lan: true },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
        }

        if (zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para crear tarifas en esta zona');
        }

        // Verificar que no exista una tarifa con los mismos minutos
        const existing = await this.prisma.rateSchedule.findFirst({
            where: {
                zoneId,
                minutes: createDto.minutes,
            },
        });

        if (existing) {
            throw new ConflictException(
                `Ya existe una tarifa para ${createDto.minutes} minutos en esta zona`,
            );
        }

        const schedule = await this.prisma.rateSchedule.create({
            data: {
                minutes: createDto.minutes,
                price: createDto.price,
                isActive: createDto.isActive,
                zone: {
                    connect: { id: zoneId },
                },
            },
        });

        return new RateScheduleEntity(schedule);
    }

    async generateFromBaseRate(
        zoneId: string,
        userId: string,
        userRole: UserRole,
    ): Promise<RateScheduleEntity[]> {
        // Validar ownership
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
            include: { lan: true },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
        }

        if (zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para generar tarifas en esta zona');
        }

        const baseRate = parseFloat(zone.baseRate.toString());

        // Generar tarifas estándar basadas en baseRate
        const standardSchedules = [
            { minutes: 15, price: baseRate / 4 },
            { minutes: 30, price: baseRate / 2 },
            { minutes: 60, price: baseRate },
            { minutes: 90, price: baseRate * 1.5 },
            { minutes: 120, price: baseRate * 2 },
        ];

        const created: RateScheduleEntity[] = [];

        for (const schedule of standardSchedules) {
            // Solo crear si no existe
            const existing = await this.prisma.rateSchedule.findFirst({
                where: {
                    zoneId,
                    minutes: schedule.minutes,
                },
            });

            if (!existing) {
                const newSchedule = await this.prisma.rateSchedule.create({
                    data: {
                        zoneId,
                        minutes: schedule.minutes,
                        price: schedule.price,
                    },
                });
                created.push(new RateScheduleEntity(newSchedule));
            }
        }

        return created;
    }

    async update(
        id: string,
        userId: string,
        userRole: UserRole,
        updateDto: UpdateRateScheduleDto,
    ): Promise<RateScheduleEntity> {
        const schedule = await this.prisma.rateSchedule.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
            },
        });

        if (!schedule) {
            throw new NotFoundException(`Tarifa con ID ${id} no encontrada`);
        }

        // Validar ownership
        if (schedule.zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para modificar esta tarifa');
        }

        // Si se está cambiando minutes, verificar que no exista
        if (updateDto.minutes && updateDto.minutes !== schedule.minutes) {
            const existing = await this.prisma.rateSchedule.findFirst({
                where: {
                    zoneId: schedule.zoneId,
                    minutes: updateDto.minutes,
                    id: { not: id },
                },
            });

            if (existing) {
                throw new ConflictException(
                    `Ya existe una tarifa para ${updateDto.minutes} minutos en esta zona`,
                );
            }
        }

        const updated = await this.prisma.rateSchedule.update({
            where: { id },
            data: updateDto,
        });

        return new RateScheduleEntity(updated);
    }

    async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
        const schedule = await this.prisma.rateSchedule.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
            },
        });

        if (!schedule) {
            throw new NotFoundException(`Tarifa con ID ${id} no encontrada`);
        }

        // Validar ownership
        if (schedule.zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para eliminar esta tarifa');
        }

        await this.prisma.rateSchedule.delete({
            where: { id },
        });
    }
}
