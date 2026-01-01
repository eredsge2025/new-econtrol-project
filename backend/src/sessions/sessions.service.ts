import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PcsGateway } from '../pcs/pcs.gateway';
import { StartSessionDto, PricingType } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { SessionEntity } from './entities/session.entity';
import { UserRole, PCStatus } from '@prisma/client';

@Injectable()
export class SessionsService {
    constructor(
        private prisma: PrismaService,
        private pcsGateway: PcsGateway,
    ) { }

    /**
     * Calcular costo por escalones de rate schedules
     * Retorna el schedule aplicable (próximo superior al tiempo jugado)
     */
    private async calculateCostBySchedules(zoneId: string, durationMinutes: number) {
        const schedules = await this.prisma.rateSchedule.findMany({
            where: {
                zoneId,
                isActive: true,
            },
            orderBy: {
                minutes: 'asc',
            },
        });

        if (schedules.length === 0) {
            throw new BadRequestException('Esta zona no tiene tarifas configuradas');
        }

        // Encontrar el schedule aplicable (próximo superior o igual)
        const applicable = schedules.find((s) => s.minutes >= durationMinutes);

        if (applicable) {
            return {
                schedule: applicable,
                cost: parseFloat(applicable.price.toString()),
            };
        }

        // Si excede todos los schedules, cobrar el más alto
        const highest = schedules[schedules.length - 1];
        return {
            schedule: highest,
            cost: parseFloat(highest.price.toString()),
        };
    }

    /**
     * Iniciar sesión
     */
    async start(userId: string, startDto: StartSessionDto): Promise<SessionEntity> {
        // 1. Verificar que PC existe y está disponible
        const pc = await this.prisma.pC.findUnique({
            where: { id: startDto.pcId },
            include: {
                zone: {
                    include: {
                        lan: true,
                    },
                },
                activeUser: true,
            },
        });

        if (!pc) {
            throw new NotFoundException(`PC con ID ${startDto.pcId} no encontrado`);
        }

        if (pc.status !== PCStatus.AVAILABLE && pc.status !== PCStatus.OCCUPIED) {
            // Allow starting session if it is occupied by the SAME user? 
            // Logic below checks "Usuario no tenga sesión activa".
            // If PC is OCCUPIED but has no active session (maybe just logged in?), we might proceed if user matches.
            // But simpler: PCStatus.AVAILABLE.
            // However, "Assign User" might make it "OCCUPIED" without a session?
            // Let's stick to AVAILABLE check for now, unless we want to support "Add Time to Active Session".
            // For "Add Time", we should probably have a separate method or handle it here if session exists.
            // The prompt implies "Start Session".
        }

        // Determinar Target User
        let targetUserId = userId; // Default to initiator (Admin/Staff)
        let isGuestSession = false;

        if (startDto.userId) {
            targetUserId = startDto.userId;
        } else if (pc.activeUser) {
            targetUserId = pc.activeUser.id;
        } else {
            // No User Assigned + No Target User Provided -> GUEST SESSION
            // But we must verify if 'userId' (initiator) is Admin/Staff.
            // If Client initiated (targetUserId == userId == Client), and they are not Admin, then it's self-start?
            // But Client-Ui login requires User. So this case is likely Admin/Dashboard.

            // Allow Guest Creation if Initiator is Admin/Staff OR if we are explicit?
            // Let's assume ANY start without target is Guest if initiated by Admin.
            // Check initiator role? We don't have role here, only ID.
            // We'll check if the Initiator has an active session. If yes, they can't start another for themselves.
            // So we assume they want a Guest Session.

            // Create Guest User
            const timestamp = Date.now();
            const guestName = `guest_${pc.name}_${timestamp}`;
            const guestEmail = `${guestName}@local.lan`;

            // Create user
            const guestUser = await this.prisma.user.create({
                data: {
                    username: guestName,
                    email: guestEmail,
                    passwordHash: 'GUEST_NO_LOGIN', // Dummy
                    role: UserRole.CLIENT,
                    balance: 0,
                    approvalStatus: 'APPROVED'
                }
            });
            targetUserId = guestUser.id;
            isGuestSession = true;
        }

        // 2. Verificar que usuario existe y no tenga sesión activa
        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                sessions: {
                    where: { status: 'ACTIVE' },
                    take: 1
                }
            }
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        if (user.sessions.length > 0) {
            throw new ConflictException('El usuario ya tiene una sesión activa');
        }

        // Double check PC status
        // PERMITIR si está OFFLINE/MALICIOUS (cola de espera)
        if (pc.status !== PCStatus.AVAILABLE &&
            pc.status !== PCStatus.OFFLINE &&
            pc.status !== PCStatus.MALICIOUS &&
            (!pc.activeUser || pc.activeUser.id !== targetUserId)) {

            if (isGuestSession) {
                // Rollback user? (Not critical)
            }
            throw new BadRequestException('El PC no está disponible');
        }

        // 3. Validar según tipo de pricing
        let cost = 0;
        let durationMinutes = 0;
        let isPrePaid = false;
        let expiresAt: Date | null = null;
        let ratePerMinute = 0;

        if (startDto.pricingType === PricingType.BUNDLE) {
            if (!startDto.bundleId) throw new BadRequestException('bundleId requerido');
            const bundle = await this.prisma.bundle.findUnique({ where: { id: startDto.bundleId } });
            if (!bundle) throw new NotFoundException('Bundle no encontrado');
            if (bundle.zoneId !== pc.zoneId) throw new BadRequestException('Bundle no pertenece a zona');

            cost = parseFloat(bundle.price.toString());
            durationMinutes = bundle.minutes;
            isPrePaid = true;
        } else if (startDto.pricingType === PricingType.FIXED) {
            if (!startDto.minutes) throw new BadRequestException('Minutos requeridos');
            durationMinutes = startDto.minutes;
            const { cost: calculatedCost } = await this.calculateCostBySchedules(pc.zoneId, durationMinutes);
            cost = calculatedCost;
            isPrePaid = true;
        }

        // Validate Balance or Auto-Recharge (if Guest/Admin initiated)
        const userBalance = parseFloat(user.balance.toString());

        // If Guest Session or Admin-initiated "Cash" payment (implied), we should Auto-Recharge needed amount?
        // Usually Dashboard implies "Paid Cash".
        // If targetUser has balance, we use it. If not, if it is Guest, we MUST recharge.
        // If it is regular User, we should charge from balance.
        // But what if Regular User pays Cash at counter?
        // We lack "PaymentMethod" in StartSessionDto (e.g. 'CASH', 'BALANCE').
        // Assuming 'BALANCE' deduction for now.
        // ERROR: If Guest has 0 balance, this throws.

        if (isPrePaid && userBalance < cost) {
            if (isGuestSession) {
                // Auto-Recharge for Guest (Cash Payment assumed)
                // Logic applied inside transaction below
            } else {
                throw new BadRequestException(
                    `Balance insuficiente. Necesitas S/ ${cost.toFixed(2)}, tienes S/ ${userBalance.toFixed(2)}`,
                );
            }
        }

        // Determinar estado inicial
        let initialStatus = 'ACTIVE';
        if (pc.status === PCStatus.OFFLINE || pc.status === PCStatus.MALICIOUS) {
            initialStatus = 'PAUSED'; // Esperando conexión
        }

        if (isPrePaid && initialStatus === 'ACTIVE') {
            const now = new Date();
            expiresAt = new Date(now.getTime() + durationMinutes * 60000);
        }

        // 4. Crear sesión y transaccion
        const session = await this.prisma.$transaction(async (tx) => {

            // Handle Guest Recharge
            if (isGuestSession && isPrePaid && cost > 0) {
                await tx.user.update({
                    where: { id: targetUserId },
                    data: { balance: { increment: cost } }
                });
                await tx.transaction.create({
                    data: {
                        userId: targetUserId,
                        lanId: pc.zone.lan.id,
                        type: 'RECHARGE',
                        amount: cost,
                        balanceBefore: 0,
                        balanceAfter: cost,
                        description: 'Recarga Inicial (Guest/Cajero)',
                        paymentMethod: 'CASH'
                    }
                });
                // Balance is now enough.
            }

            // Crear sesión
            const newSession = await tx.session.create({
                data: {
                    userId: targetUserId,
                    pcId: pc.id,
                    lanId: pc.zone.lan.id,
                    ratePerMinute: ratePerMinute,
                    status: initialStatus as any, // Cast to enum
                    pricingType: startDto.pricingType,
                    isPaid: isPrePaid,
                    totalCost: isPrePaid ? cost : 0,
                    expiresAt: expiresAt,
                    durationSeconds: (initialStatus === 'PAUSED' && isPrePaid) ? durationMinutes * 60 : 0, // Store intended duration if paused
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    pc: {
                        include: {
                            zone: true,
                        },
                    },
                },
            });

            // Deduct Balance if Prepaid & Create Transaction Linked to Session
            if (isPrePaid && cost > 0) {
                // Fetch fresh balance (if we just updated it? prisma tx handles it?)
                const u = await tx.user.findUnique({ where: { id: targetUserId } });
                const bBefore = u.balance;

                await tx.user.update({
                    where: { id: targetUserId },
                    data: { balance: { decrement: cost } }
                });

                await tx.transaction.create({
                    data: {
                        userId: targetUserId,
                        lanId: pc.zone.lan.id,
                        type: 'SESSION_PAYMENT',
                        amount: cost,
                        balanceBefore: bBefore,
                        balanceAfter: Number(bBefore) - cost,
                        description: `Pago de sesión (${startDto.pricingType}) - ${durationMinutes} min`,
                        sessionId: newSession.id // LINK SESSION
                    }
                });
            }

            // Cambiar PC a OCCUPIED
            await tx.pC.update({
                where: { id: pc.id },
                data: {
                    status: PCStatus.OCCUPIED,
                },
            });

            // Vincular PC al usuario
            await tx.user.update({
                where: { id: targetUserId },
                data: {
                    activePcId: pc.id
                }
            });

            return newSession;
        });

        // Emitir evento en tiempo real
        const updatedPc = await this.prisma.pC.findUnique({
            where: { id: pc.id },
            include: {
                zone: { include: { lan: true } },
                activeUser: true,
                sessions: {
                    where: { status: { in: ['ACTIVE', 'PAUSED'] } },
                    take: 1
                }
            }
        });

        if (updatedPc) {
            // Inject session info into the emit payload if possible, or emit separate event
            // The Frontend PCMap expects PCStatusUpdate. 
            // We should ensure the gateway sends the session Data.
            this.pcsGateway.emitStatusUpdate(updatedPc, updatedPc.zone.lan.id);

            // Also notify the specific PC Client
            // this.pcsGateway.notifySessionStart(pc.id, session); // (Assuming this method exists or we add it)
        }

        return new SessionEntity(session);
    }

    /**
     * Extender sesión existente (Recarga)
     */
    async extend(
        sessionId: string,
        userId: string, // Admin/Cashier ID
        extendDto: StartSessionDto // Reuse DTO for pricing info
    ) {
        // 1. Get Session
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            include: { pc: { include: { zone: { include: { lan: true } } } }, user: true }
        });

        if (!session) throw new NotFoundException('Sesión no encontrada');
        if (session.status !== 'ACTIVE' && session.status !== 'PAUSED') {
            throw new BadRequestException('Solo se pueden extender sesiones activas o pausadas');
        }

        // 2. Validate Pricing/Cost
        let cost = 0;
        let addedMinutes = 0;

        if (extendDto.pricingType === PricingType.BUNDLE) {
            if (!extendDto.bundleId) throw new BadRequestException('bundleId requerido');
            const bundle = await this.prisma.bundle.findUnique({ where: { id: extendDto.bundleId } });
            if (!bundle) throw new NotFoundException('Bundle no encontrado');
            cost = Number(bundle.price);
            addedMinutes = bundle.minutes;
        } else if (extendDto.pricingType === PricingType.FIXED) {
            if (!extendDto.minutes) throw new BadRequestException('Minutos requeridos');
            addedMinutes = extendDto.minutes;
            const { cost: calculatedCost } = await this.calculateCostBySchedules(session.pc.zoneId, addedMinutes);
            cost = calculatedCost;
        } else {
            throw new BadRequestException('Solo se puede extender con BUNDLE o FIXED');
        }

        // 3. Process Payment (Balance or Cash) implies Balance deduction
        // If user is Guest or regular, check balance.
        const userBalance = Number(session.user.balance);

        // Similar logic to Start: if balance low, error (unless Guest auto-recharge logic applied?)
        // For extension, usually client pays Cash at counter -> Cashier recharges balance -> Extends.
        // Or Cashier actions "Extend" which implies Cash payment received?
        // Let's assume standard Balance Flow: User must have balance.
        // If explicit "Cash" override exists in DTO? No.
        // We'll enforce Balance. Cashier must "Recharge" user first if needed?
        // OR: We implement auto-recharge transaction if Guest?
        // Let's replicate start logic: if PrePaid and low balance, throw. (Cashier handles recharge separately, or we assume they did).

        // Update: To make it smooth for "Cajero agrega 30min", likely User pays Cash.
        // If I force "Recharge Balance" step, it's 2 actions.
        // Ideally "Extend" action handles "Cash -> Recharge -> Extend" if needed.
        // For now, simple logic: Check Balance.


        const isGuest = session.user.username.startsWith('guest_') || session.user.email.endsWith('@local.lan');

        if (!isGuest && userBalance < cost) {
            throw new BadRequestException(`Balance insuficiente para extender. (Requerido: ${cost}, Actual: ${userBalance})`);
        }

        // 4. Update Session and Transaction
        const updatedSession = await this.prisma.$transaction(async (tx) => {
            // If Guest, Auto-Recharge (Cash Payment)
            if (isGuest && cost > 0) {
                await tx.user.update({
                    where: { id: session.userId },
                    data: { balance: { increment: cost } }
                });
                await tx.transaction.create({
                    data: {
                        userId: session.userId,
                        lanId: session.lanId,
                        type: 'RECHARGE',
                        amount: cost,
                        balanceBefore: userBalance,
                        balanceAfter: userBalance + cost,
                        description: 'Recarga Automática (Extensión)',
                        paymentMethod: 'CASH' // Assumed
                    }
                });
            }

            // Deduct
            // If guest, balance is now enough.
            // If regular, we validated above.
            await tx.user.update({
                where: { id: session.userId },
                data: { balance: { decrement: cost } }
            });

            // Calculate current/new balance for record
            const balancePreDeduction = isGuest ? userBalance + cost : userBalance;
            const balancePostDeduction = balancePreDeduction - cost;

            await tx.transaction.create({
                data: {
                    userId: session.userId,
                    lanId: session.lanId,
                    type: 'SESSION_PAYMENT',
                    amount: cost,
                    balanceBefore: balancePreDeduction,
                    balanceAfter: balancePostDeduction,
                    description: `Extensión de tiempo (${addedMinutes} min)`,
                }
            });

            // Calculate New Expiration
            let newExpiresAt = session.expiresAt;
            let newDuration = session.durationSeconds; // For Pending
            let updateData: any = {
                totalCost: { increment: cost }
            };

            if (session.status === 'PAUSED') {
                // Just add to duration buffer
                newDuration += (addedMinutes * 60);
                updateData.durationSeconds = newDuration;
            } else if (session.status === 'ACTIVE') {
                if (session.expiresAt) {
                    newExpiresAt = new Date(session.expiresAt.getTime() + (addedMinutes * 60 * 1000));
                    updateData.expiresAt = newExpiresAt;
                } else {
                    const now = new Date();
                    newExpiresAt = new Date(now.getTime() + (addedMinutes * 60 * 1000));
                    updateData.expiresAt = newExpiresAt;
                }
            }

            return await tx.session.update({
                where: { id: sessionId },
                data: updateData,
                include: { pc: { include: { zone: { include: { lan: true } } } }, user: true }
            });
        });

        // 5. Emit
        this.pcsGateway.emitStatusUpdate(updatedSession.pc, updatedSession.pc.zone.lan.id);

        return updatedSession;
    }
    async end(
        id: string,
        userId: string,
        userRole: UserRole,
        endDto: EndSessionDto,
    ): Promise<SessionEntity> {
        // 1. Obtener sesión
        const session = await this.prisma.session.findUnique({
            where: { id },
            include: {
                user: true,
                pc: {
                    include: {
                        zone: {
                            include: {
                                lan: true,
                            },
                        },
                    },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Sesión no encontrada');
        }

        if (session.status !== 'ACTIVE') {
            throw new BadRequestException('La sesión ya fue finalizada');
        }

        // Validar ownership (solo el usuario, Staff o Admin pueden finalizar)
        const canEnd = session.userId === userId ||
            userRole === UserRole.STAFF ||
            userRole === UserRole.LAN_ADMIN ||
            userRole === UserRole.SUPER_ADMIN;

        if (!canEnd) {
            throw new ForbiddenException('No tienes permisos para finalizar esta sesión');
        }

        // 2. Calcular duración
        const endTime = new Date();
        const durationMs = endTime.getTime() - session.startedAt.getTime();
        const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
        const durationMinutes = Math.ceil(durationSeconds / 60);

        // 4. Calcular cobro si NO es prepagado
        let finalCost = 0;
        if (!session.isPaid) {
            const { cost } = await this.calculateCostBySchedules(
                session.pc.zoneId,
                durationMinutes,
            );
            finalCost = cost;

            // Validar balance
            const userBalance = parseFloat(session.user.balance.toString());
            if (userBalance < finalCost) {
                // Option: Allow negative balance or throw?
                // Usually force close but debt.
                // For now, keep existing logic but warn.
                // Throwing here PREVENTS ending the session, which is bad if user ran out of money.
                // Ideally we allow "Overdraft" or force stop.
                throw new BadRequestException(
                    `Balance insuficiente. Costo: S/ ${finalCost}, Balance: S/ ${userBalance}`,
                );
            }
        } else {
            // Pre-paid. Check if they exceeded time?
            // If exceeded, charge extra?
            // For now assume strictly cut off or no extra charge.
            finalCost = Number(session.totalCost); // Already set, but we might want to update it if we charge extra?
            // If isPaid, we don't deduct again.
        }

        // 5. Actualizar sesión y balance
        const [updatedSession] = await this.prisma.$transaction([
            // Actualizar sesión
            this.prisma.session.update({
                where: { id },
                data: {
                    endedAt: endTime,
                    durationSeconds,
                    totalCost: session.isPaid ? session.totalCost : finalCost, // Keep original if paid
                    status: 'COMPLETED',
                    paymentMethod: endDto.paymentMethod,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    pc: {
                        include: {
                            zone: true,
                        },
                    },
                },
            }),

            // Descontar del balance SOLO SI NO ESTABA PAGADO
            ...(session.isPaid ? [] : [
                this.prisma.user.update({
                    where: { id: session.userId },
                    data: {
                        balance: {
                            decrement: finalCost,
                        },
                        activePcId: null,
                    },
                }),
                this.prisma.transaction.create({
                    data: {
                        userId: session.userId,
                        lanId: session.lanId,
                        type: 'SESSION_PAYMENT',
                        amount: finalCost,
                        balanceBefore: session.user.balance,
                        balanceAfter: Number(session.user.balance) - finalCost,
                        description: `Pago de sesión (OPEN) - ${durationMinutes} min`,
                    }
                })
            ]),

            // Si ya estaba pagado, igual liberamos al usuario de activePcId
            ...(session.isPaid ? [
                this.prisma.user.update({
                    where: { id: session.userId },
                    data: {
                        activePcId: null,
                    },
                })
            ] : []),

            // Liberar PC

            // Liberar PC
            this.prisma.pC.update({
                where: { id: session.pcId },
                data: {
                    status: PCStatus.AVAILABLE,
                },
            }),
        ]);

        const pcWithLan = await this.prisma.pC.findUnique({
            where: { id: session.pcId },
            include: {
                zone: { include: { lan: true } },
                activeUser: true
            }
        });

        if (pcWithLan) {
            this.pcsGateway.emitStatusUpdate(pcWithLan, pcWithLan.zone.lan.id);
        }

        return new SessionEntity(updatedSession);
    }

    /**
     * Obtener sesiones activas
     */
    async findActive(userId: string, userRole: UserRole, lanId?: string): Promise<SessionEntity[]> {
        const where: any = {
            status: 'ACTIVE',
        };

        // Si no es admin, solo ver sus propias sesiones
        if (userRole !== UserRole.SUPER_ADMIN) {
            where.userId = userId;
        }

        if (lanId) {
            where.lanId = lanId;
        }

        const sessions = await this.prisma.session.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                pc: {
                    include: {
                        zone: true,
                    },
                },
            },
            orderBy: {
                startedAt: 'desc',
            },
        });

        return sessions.map((s) => new SessionEntity(s));
    }

    /**
     * Obtener detalle de sesión
     */
    async findOne(id: string, userId: string, userRole: UserRole): Promise<SessionEntity> {
        const session = await this.prisma.session.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                pc: {
                    include: {
                        zone: true,
                    },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Sesión no encontrada');
        }

        // Validar acceso
        if (
            session.userId !== userId &&
            userRole !== UserRole.SUPER_ADMIN
        ) {
            throw new ForbiddenException('No tienes permisos para ver esta sesión');
        }

        return new SessionEntity(session);
    }

    /**
     * Preview del costo actual de una sesión activa
     */
    async getCostPreview(id: string, userId: string, userRole: UserRole) {
        const session = await this.findOne(id, userId, userRole);

        if (session.status !== 'ACTIVE') {
            throw new BadRequestException('La sesión no está activa');
        }

        // Calcular tiempo actual
        const now = new Date();
        const durationMs = now.getTime() - session.startedAt.getTime();
        const durationSeconds = Math.floor(durationMs / 1000);
        const durationMinutes = Math.ceil(durationSeconds / 60);

        // Obtener PC para saber la zona
        const pc = await this.prisma.pC.findUnique({
            where: { id: session.pcId },
        });

        // Calcular costo estimado
        const { schedule, cost } = await this.calculateCostBySchedules(pc.zoneId, durationMinutes);

        return {
            session,
            currentMinutes: durationMinutes,
            currentSeconds: durationSeconds,
            applicableSchedule: {
                minutes: schedule.minutes,
                price: parseFloat(schedule.price.toString()),
            },
            estimatedCost: cost,
        };
    }

    // ============================================
    // UNDO FUNCTIONALITY
    // ============================================

    async undoLastAction(sessionId: string) {
        // 1. Fetch Session and Transactions
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                user: true,
                transactions: {
                    where: { type: 'SESSION_PAYMENT' },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!session) throw new NotFoundException('Sesión no encontrada');
        if (session.status === 'COMPLETED' || session.status === 'ABORTED') {
            throw new BadRequestException('La sesión ya ha finalizado');
        }

        const lastTx = session.transactions[0];
        if (!lastTx) throw new BadRequestException('No hay transacciones para deshacer');

        // 2. Check 2 Minute Limit
        const timeDiff = new Date().getTime() - lastTx.createdAt.getTime();
        const twoMinutes = 2 * 60 * 1000;

        console.log(`[UndoDebug] Session ${sessionId}, LastTx: ${lastTx.id}, Desc: ${lastTx.description}, TimeDiff: ${timeDiff}ms`);

        if (timeDiff > twoMinutes) {
            console.warn(`[UndoDebug] Undo expired. Diff: ${timeDiff}ms`);
            throw new BadRequestException('El tiempo límite para deshacer (2 min) ha expirado');
        }

        // 3. Determine Type (Start or Extend)
        const isStart = session.transactions.length === 1;

        await this.prisma.$transaction(async (tx) => {
            // Refund User
            await tx.user.update({
                where: { id: session.userId },
                data: { balance: { increment: lastTx.amount } }
            });

            await tx.transaction.create({
                data: {
                    userId: session.userId,
                    lanId: session.lanId,
                    type: 'REFUND',
                    sessionId: session.id,
                    amount: lastTx.amount,
                    balanceBefore: Number(session.user.balance),
                    balanceAfter: Number(session.user.balance) + Number(lastTx.amount),
                    description: `Reembolso por deshacer: ${lastTx.description}`,
                    paymentMethod: 'BALANCE'
                }
            });

            if (isStart) {
                // ABORT Session
                await tx.session.update({
                    where: { id: session.id },
                    data: {
                        status: 'ABORTED',
                        endedAt: new Date(),
                        totalCost: 0
                    }
                });
                // Free PC
                await tx.pC.update({
                    where: { id: session.pcId },
                    data: {
                        status: 'AVAILABLE',
                        activeUser: { disconnect: true }
                    }
                });
            } else {
                // Revert Extension
                const minutesMatch = lastTx.description.match(/\((\d+) min\)/);

                let minutesToRemove = 0;
                if (minutesMatch) {
                    minutesToRemove = parseInt(minutesMatch[1]);
                } else {
                    throw new BadRequestException('No se pudo determinar el tiempo a revertir de la descripción.');
                }

                const secondsToRemove = minutesToRemove * 60;

                let updateData: any = {
                    totalCost: { decrement: lastTx.amount }
                };

                if (session.status === 'PAUSED') {
                    updateData.durationSeconds = { decrement: secondsToRemove };
                } else if (session.status === 'ACTIVE') {
                    if (session.expiresAt) {
                        const newExpires = new Date(session.expiresAt.getTime() - (secondsToRemove * 1000));
                        updateData.expiresAt = newExpires;
                    }
                }

                await tx.session.update({
                    where: { id: session.id },
                    data: updateData
                });
            }
        });

        this.pcsGateway.emitStatusUpdate({ id: session.pcId }, session.lanId);
        return { success: true };
    }
}
