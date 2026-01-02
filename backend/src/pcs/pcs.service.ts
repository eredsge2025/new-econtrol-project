import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePcDto } from './dto/create-pc.dto';
import { UpdatePcDto } from './dto/update-pc.dto';
import { PcEntity } from './entities/pc.entity';
import { UserRole, PCStatus, SessionStatus } from '@prisma/client';
import { PcsGateway } from './pcs.gateway';

@Injectable()
export class PcsService {
    private readonly logger = new Logger(PcsService.name);

    constructor(
        private prisma: PrismaService,
        private pcsGateway: PcsGateway
    ) { }

    async findByZone(zoneId: string): Promise<PcEntity[]> {
        // Verificar que la zona existe
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
        }

        const pcs = await this.prisma.pC.findMany({
            where: { zoneId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        sessions: true,
                    },
                },
                activeUser: true, // Incluimos el usuario activo si lo hay
                sessions: {
                    where: { status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.EXPIRED] } },
                    take: 1,
                    include: { transactions: { orderBy: { createdAt: 'desc' } } }
                },
            },
        });

        return pcs.map((pc) => new PcEntity(pc));
    }

    async findOne(id: string): Promise<PcEntity> {
        const pc = await this.prisma.pC.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: {
                            select: {
                                id: true,
                                name: true,
                                ownerId: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        sessions: true,
                    },
                },
                activeUser: true,
                sessions: {
                    where: { status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.EXPIRED] } },
                    take: 1,
                    include: { transactions: { orderBy: { createdAt: 'desc' } } }
                },
            },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${id} no encontrado`);
        }

        return new PcEntity(pc);
    }

    async create(
        zoneId: string,
        userId: string,
        userRole: UserRole,
        createPcDto: CreatePcDto,
    ): Promise<PcEntity> {
        // Verificar que la zona existe y obtener el LAN
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
            include: {
                lan: true,
            },
        });

        if (!zone) {
            throw new NotFoundException(`Zona con ID ${zoneId} no encontrada`);
        }

        // Validar ownership del LAN
        if (zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para agregar PCs a esta zona');
        }

        const pc = await this.prisma.pC.create({
            data: {
                name: createPcDto.name,
                specs: createPcDto.specs || {},
                zone: {
                    connect: { id: zoneId },
                },
            },
            include: {
                _count: {
                    select: {
                        sessions: true,
                    },
                },
            },
        });

        return new PcEntity(pc);
    }

    async update(
        id: string,
        userId: string,
        userRole: UserRole,
        updatePcDto: UpdatePcDto,
    ): Promise<PcEntity> {
        const pc = await this.prisma.pC.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
            },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${id} no encontrado`);
        }

        // Validar ownership
        if (pc.zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para modificar este PC');
        }

        const updated = await this.prisma.pC.update({
            where: { id },
            data: updatePcDto,
            include: {
                _count: { select: { sessions: true } },
                zone: true,
                activeUser: true,
                sessions: { where: { status: { in: ['ACTIVE', 'PAUSED'] } }, take: 1 }
            },
        });

        // Alertar al frontend (muy importante para cambios de posición y estado en el mapa)
        this.pcsGateway.emitStatusUpdate(updated, pc.zone.lan.id);

        return new PcEntity(updated);
    }

    async updateStatus(
        id: string,
        status: PCStatus,
        userId: string,
        userRole: UserRole,
    ): Promise<PcEntity> {
        const pc = await this.prisma.pC.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
            },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${id} no encontrado`);
        }

        // Validar ownership
        if (pc.zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para cambiar el estado de este PC');
        }

        const updated = await this.prisma.pC.update({
            where: { id },
            data: { status },
            include: {
                _count: { select: { sessions: true } },
                zone: true,
                activeUser: true,
                sessions: { where: { status: { in: ['ACTIVE', 'PAUSED'] } }, take: 1 }
            },
        });

        // Alertar al frontend
        this.pcsGateway.emitStatusUpdate(updated, pc.zone.lan.id);

        return new PcEntity(updated);
    }

    async getCurrentSession(id: string) {
        const pc = await this.prisma.pC.findUnique({
            where: { id },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${id} no encontrado`);
        }

        // Buscar sesión activa
        const activeSession = await this.prisma.session.findFirst({
            where: {
                pcId: id,
                status: { in: ['ACTIVE', 'PAUSED'] },
            },
            orderBy: {
                startedAt: 'desc',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });

        return {
            pc: new PcEntity(pc),
            currentSession: activeSession || null,
        };
    }

    async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
        const pc = await this.prisma.pC.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
            },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${id} no encontrado`);
        }

        // Validar ownership
        if (pc.zone.lan.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('No tienes permisos para eliminar este PC');
        }

        // Verificar que no tenga sesión activa
        const activeSessions = await this.prisma.session.count({
            where: {
                pcId: id,
                status: 'ACTIVE',
            },
        });

        if (activeSessions > 0) {
            throw new BadRequestException('No se puede eliminar un PC con sesión activa');
        }

        await this.prisma.pC.delete({
            where: { id },
        });
    }

    // ============================================
    // MÉTODOS PARA AGENTES
    // ============================================

    async register(registerDto: any) {
        let { lanId, macAddress, ipAddress, hostname, agentVersion, os } = registerDto;

        // Normalizar MAC para evitar duplicados por formato (Upper y sin colones)
        const normalizedMac = macAddress.replace(/:/g, '').toUpperCase();

        // 1. Validar LAN existe
        const lan = await this.prisma.lANCenter.findUnique({
            where: { id: lanId },
            include: {
                zones: {
                    orderBy: { position: 'asc' },
                },
            },
        });

        if (!lan) {
            throw new NotFoundException('LAN Center no encontrado');
        }

        if (!lan.zones || lan.zones.length === 0) {
            throw new BadRequestException(
                'El LAN Center no tiene zonas configuradas. Por favor crea al menos una zona primero.'
            );
        }

        // 2. Buscar PC por MAC normalizada
        let pc = await this.prisma.pC.findUnique({
            where: { macAddress: normalizedMac },
            include: {
                zone: {
                    include: {
                        bundles: { where: { isActive: true } },
                        rateSchedules: {
                            where: { isActive: true },
                            orderBy: { minutes: 'asc' },
                        },
                    },
                },
            },
        });

        // REINTENTO: Buscar máquinas con formato antiguo (con colones o distinto case) para evitar duplicados
        if (!pc) {
            const allPcs = await this.prisma.pC.findMany({
                include: {
                    zone: {
                        include: {
                            bundles: { where: { isActive: true } },
                            rateSchedules: {
                                where: { isActive: true },
                                orderBy: { minutes: 'asc' },
                            },
                        },
                    },
                },
            });

            pc = allPcs.find(p => p.macAddress?.replace(/:/g, '').toUpperCase() === normalizedMac);

            if (pc) {
                // Si la encontramos, actualizamos su MAC al formato normalizado de inmediato
                await this.prisma.pC.update({
                    where: { id: pc.id },
                    data: { macAddress: normalizedMac }
                });
            }
        }

        const specs = {
            hostname,
            agentVersion: agentVersion || 'unknown',
            os: os || 'unknown',
            registeredAt: new Date().toISOString(),
        };

        if (!pc) {
            // 3. Crear nueva PC
            const defaultZone = lan.zones[0];
            const pcName = hostname || `PC-${normalizedMac.slice(-5)}`;

            pc = await this.prisma.pC.create({
                // @ts-ignore
                data: {
                    name: pcName,
                    macAddress: normalizedMac,
                    ipAddress,
                    zoneId: defaultZone.id,
                    status: PCStatus.AVAILABLE,
                    specs,
                    lastHeartbeat: new Date(),
                },
                include: {
                    activeUser: true,
                    zone: {
                        include: {
                            bundles: { where: { isActive: true } },
                            rateSchedules: {
                                where: { isActive: true },
                                orderBy: { minutes: 'asc' },
                            },
                        },
                    },
                },
            });

            // Notificar cambio de estado inmediato al dashboard
            this.pcsGateway.emitStatusUpdate(pc, pc.zone.lanId);

            return {
                ...pc,
                success: true,
                message: 'PC registrada exitosamente',
                isNew: true,
            };
        } else {
            // 4. Actualizar PC existente
            const updatedSpecs = {
                ...(typeof pc.specs === 'object' ? pc.specs : {}),
                ...specs,
                lastUpdated: new Date().toISOString(),
            };

            const updateData: any = {
                ipAddress,
                lastHeartbeat: new Date(),
                status: (pc.status === PCStatus.OFFLINE || pc.status === PCStatus.MALICIOUS)
                    ? PCStatus.AVAILABLE
                    : pc.status,
                specs: updatedSpecs,
            };

            // Si el hostname cambió, actualizar el nombre
            if (hostname && pc.name !== hostname) {
                updateData.name = hostname;
            }

            pc = await this.prisma.pC.update({
                where: { id: pc.id },
                data: updateData,
                include: {
                    activeUser: true,
                    zone: {
                        include: {
                            bundles: { where: { isActive: true } },
                            rateSchedules: {
                                where: { isActive: true },
                                orderBy: { minutes: 'asc' },
                            },
                        },
                    },
                },
            });

            // Notificar cambio de estado inmediato al dashboard (si cambió o se recuperó)
            this.pcsGateway.emitStatusUpdate(pc, pc.zone.lanId);

            return {
                ...pc,
                success: true,
                message: 'PC actualizada',
                isNew: false,
            };
        }
    }

    async heartbeat(id: string, heartbeatDto: any) {
        const { ipAddress, status } = heartbeatDto;

        const pc = await this.prisma.pC.findUnique({
            where: { id },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${id} no encontrada`);
        }

        const updateData: any = {
            lastHeartbeat: new Date(),
        };

        this.logger.debug(`[Heartbeat] PC ${pc.name} (${id}) - Received Status: ${status}, Current DB Status: ${pc.status}`);

        if (ipAddress) {
            updateData.ipAddress = ipAddress;
        }

        // Check for occupying sessions (Active, Paused, or Expired)
        let activeSessions = await this.prisma.session.findMany({
            where: {
                pcId: id,
                status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.EXPIRED] }
            }
        });

        // 1. Activate Paused Sessions (Queue)
        // ... (Logic for paused mostly unchanged, but be careful if EXPIRED is in list)
        const pendingSessions = activeSessions.filter(s => s.status === 'PAUSED');
        if (pendingSessions.length > 0) {
            this.logger.log(`[Heartbeat] Activating ${pendingSessions.length} pending sessions for PC ${pc.name}`);
            const now = new Date();

            await this.prisma.$transaction(pendingSessions.map(session => {
                let expiresAt = session.expiresAt;
                // If stored duration in seconds (PrePaid), calculate expiration now
                if (session.isPaid && session.durationSeconds > 0) {
                    expiresAt = new Date(now.getTime() + session.durationSeconds * 1000);
                }

                return this.prisma.session.update({
                    where: { id: session.id },
                    data: {
                        status: 'ACTIVE',
                        startedAt: now,
                        expiresAt: expiresAt
                    }
                });
            }));

            // Refetch including EXPIRED
            activeSessions = await this.prisma.session.findMany({
                where: {
                    pcId: id,
                    status: { in: [SessionStatus.ACTIVE, SessionStatus.EXPIRED] } // Paused became Active
                }
            });
        }

        // 2. Check for NEWLY expired sessions
        const now = new Date();
        const newlyExpiredSessions = activeSessions.filter(s =>
            s.status !== SessionStatus.EXPIRED && // Not already expired
            s.expiresAt &&
            new Date(s.expiresAt) < now
        );

        if (newlyExpiredSessions.length > 0) {
            this.logger.log(`[Heartbeat] Found ${newlyExpiredSessions.length} new expired sessions for PC ${pc.name}. Updating status...`);

            await this.prisma.session.updateMany({
                where: { id: { in: newlyExpiredSessions.map(s => s.id) } },
                data: { status: SessionStatus.EXPIRED, endedAt: now }
            });

            // We assume these are still "occupying" the PC.
            // We don't remove them from 'activeSessions' list for the count check.
            // But we should update their status in memory if we use it later?
            // For count > 0 check, it doesn't matter (length is same).
        }

        // Count all occupying sessions (Active + Expired + Paused)
        const activeSessionCount = activeSessions.length;

        this.logger.debug(`[Heartbeat] PC ${pc.name} - Occupying Sessions Count: ${activeSessionCount}`);

        if (activeSessionCount > 0) {
            this.logger.debug(`[Heartbeat] Enforcing OCCUPIED status due to active/expired session.`);
            updateData.status = PCStatus.OCCUPIED;
        } else if (status && status !== pc.status) {
            this.logger.debug(`[Heartbeat] Updating status to ${status} (Client reported)`);
            updateData.status = status;
        } else if (pc.status === PCStatus.OFFLINE || pc.status === PCStatus.MALICIOUS) {
            this.logger.debug(`[Heartbeat] Auto-recovering to AVAILABLE from ${pc.status}`);
            updateData.status = PCStatus.AVAILABLE;
        }

        // Release activePcId ONLY if PC becomes AVAILABLE
        const effectiveStatus = updateData.status || pc.status;
        if (effectiveStatus === PCStatus.AVAILABLE) {
            const updatedUsers = await this.prisma.user.updateMany({
                where: { activePcId: id },
                data: { activePcId: null }
            });
            if (updatedUsers.count > 0) {
                this.logger.log(`[Heartbeat] Released activePcId for ${updatedUsers.count} users linked to PC ${pc.name}`);
            }
        }

        const updatedPc = await this.prisma.pC.update({
            where: { id },
            data: updateData,
            include: {
                zone: true,
                activeUser: true
            },
        });

        // Fetch ALL occupying sessions + Transactions for history
        const freshSessions = await this.prisma.session.findMany({
            where: {
                pcId: id,
                status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.EXPIRED] }
            },
            include: { transactions: { orderBy: { createdAt: 'desc' } } }
        });

        // Ensure Gateway emits sessions so Dashboard sees them!
        const pcForEmit = { ...pc, sessions: freshSessions, status: effectiveStatus };
        this.pcsGateway.emitStatusUpdate(pcForEmit, updatedPc.zone.lanId);

        return {
            ...updatedPc,
            sessions: freshSessions,
            success: true,
            shouldUpdate: false,
        };
    }

    async getAgentConfig(id: string) {
        const pc = await this.prisma.pC.findUnique({
            where: { id },
            include: {
                zone: {
                    include: {
                        lan: {
                            select: {
                                id: true,
                                name: true,
                                settings: true,
                            },
                        },
                        bundles: { where: { isActive: true } },
                        rateSchedules: {
                            where: { isActive: true },
                            orderBy: { minutes: 'asc' },
                        },
                    },
                },
            },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${id} no encontrada`);
        }

        return pc;
    }
    async pcLogout(id: string) {
        const pc = await this.prisma.pC.findUnique({
            where: { id },
            include: {
                zone: {
                    include: { lan: true }
                }
            }
        });

        if (!pc) throw new NotFoundException('PC no encontrada');

        // Check if there's a session that should prevent full release
        const activeSession = await this.prisma.session.findFirst({
            where: {
                pcId: id,
                status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.EXPIRED] }
            }
        });

        // If session is EXPIRED (Time Up), we don't want to release the PC yet.
        // We just ensure it's marked EXPIRED if not already.
        if (activeSession && activeSession.expiresAt && new Date(activeSession.expiresAt) < new Date()) {
            // If it's time-up logout, just ensure session is EXPIRED and keep PC OCCUPIED
            await this.prisma.session.update({
                where: { id: activeSession.id },
                data: { status: SessionStatus.EXPIRED }
            });
            // Ensure PC is OCCUPIED (locked state)
            const updatedPc = await this.prisma.pC.update({
                where: { id },
                data: { status: PCStatus.OCCUPIED },
                include: { zone: true, activeUser: true }
            });
            this.pcsGateway.emitStatusUpdate(updatedPc, pc.zone.lanId);
            return { success: true, message: 'PC locked (Session Expired)' };
        }

        // Liberar cualquier usuario vinculado a esta PC (Only if no relevant session exists)
        await this.prisma.user.updateMany({
            where: { activePcId: id },
            data: { activePcId: null }
        });

        // Actualizar PC a AVAILABLE (ya que el agente volvió al login)
        const updatedPc = await this.prisma.pC.update({
            where: { id },
            data: { status: PCStatus.AVAILABLE },
            include: {
                zone: true,
                activeUser: true
            }
        });

        this.pcsGateway.emitStatusUpdate(updatedPc, pc.zone.lanId);

        return { success: true, message: 'PC liberada exitosamente' };
    }
}
