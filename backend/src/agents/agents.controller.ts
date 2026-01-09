import {
    Controller,
    Get,
    Post,
    Body,
    Req,
    UseGuards,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { PricingType } from '../sessions/dto/start-session.dto';
import { PaymentMethod } from '../sessions/dto/end-session.dto';

@Controller('agents')
@UseGuards(ApiKeyGuard)
export class AgentsController {
    constructor(
        private prisma: PrismaService,
        private sessionsService: SessionsService
    ) { }

    @Get('rates')
    async getRates(@Req() req) {
        // req.lan is set by ApiKeyGuard.
        // But headers contains x-pc-id? No, Agent sends PcId in Register, but subsequent requests?
        // Agent calls: _httpClient.DefaultRequestHeaders.Add("x-api-key", _config.ApiKey);
        // We need the PC ID to know the Zone.
        // It's better to pass ?pcId=... in the query string.

        const pcId = req.query.pcId;
        if (!pcId) throw new BadRequestException('pcId required');

        const pc = await this.prisma.pC.findUnique({
            where: { id: pcId },
            include: { zone: { include: { rateSchedules: true } } }
        });

        if (!pc || pc.zone.lanId !== req.lan.id) return [];

        return pc.zone.rateSchedules.map(r => ({
            id: r.id,
            name: `${r.minutes} Minutos`,
            price: r.price,
            minutes: r.minutes
        }));
    }

    @Get('bundles')
    async getBundles(@Req() req) {
        const pcId = req.query.pcId;
        if (!pcId) throw new BadRequestException('pcId required');

        const pc = await this.prisma.pC.findUnique({
            where: { id: pcId },
            include: { zone: { include: { bundles: true } } }
        });

        if (!pc || pc.zone.lanId !== req.lan.id) return [];

        return pc.zone.bundles.map(b => ({
            id: b.id,
            name: b.name,
            price: b.price,
            minutes: b.minutes,
            coins: 0 // Bundles in schema don't have coinBonus yet
        }));
    }

    @Post('purchase')
    async purchase(@Req() req, @Body() body: any) {
        // body: { userId, type: 'RATE'|'BUNDLE', itemId, paymentMethod: 'BALANCE' }
        // Agent authenticates user locally, but for strict security, Agent should send User Token?
        // OR Agent trusts itself and sends userId. Since Agent is trusted via ApiKey, we can trust userId.

        const { userId, type, itemId, paymentMethod } = body;

        // TODO: Validate User belongs to LAN (security check)

        if (type !== 'RATE' && type !== 'BUNDLE' && type !== 'OPEN') {
            throw new BadRequestException("Invalid Type");
        }

        const pcId = req.query.pcId || body.pcId;

        // Check active session
        const activeSession = await this.prisma.session.findFirst({
            where: { userId, endedAt: null },
        });

        let session;
        if (activeSession) {
            // Extension case
            // Can't extend an OPEN session with another OPEN session start (makes no sense)
            // But if user clicks Play Now while active? 
            // Dashboard UI should prevent this, but backend should handle gracefully.
            if (type === 'OPEN') {
                throw new BadRequestException("Ya tienes una sesión activa");
            }

            session = await this.sessionsService.extend(activeSession.id, userId, {
                pcId,
                pricingType: type === 'RATE' ? PricingType.FIXED : PricingType.BUNDLE,
                minutes: type === 'RATE' ? (await this.prisma.rateSchedule.findUnique({ where: { id: itemId } }))?.minutes : undefined,
                bundleId: type === 'BUNDLE' ? itemId : undefined,
                paymentMethod // Pass payment method
            } as any);
        } else {
            // Start case
            if (type === 'RATE') {
                const rate = await this.prisma.rateSchedule.findUnique({ where: { id: itemId } });
                if (!rate) throw new BadRequestException('Tarifa no encontrada');

                session = await this.sessionsService.start(userId, {
                    pcId,
                    pricingType: PricingType.FIXED,
                    minutes: rate.minutes,
                    paymentMethod // Pass payment method
                } as any);
            } else if (type === 'BUNDLE') {
                session = await this.sessionsService.start(userId, {
                    pcId,
                    pricingType: PricingType.BUNDLE,
                    bundleId: itemId,
                    paymentMethod // Pass payment method
                } as any);
            } else if (type === 'OPEN') {
                session = await this.sessionsService.start(userId, {
                    pcId,
                    userId,  // Explicitly pass userId to prevent orphaned sessions
                    pricingType: PricingType.OPEN,
                    paymentMethod // Pass payment method
                } as any);
            }
        }

        // Fetch updated user balance
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        return {
            success: true,
            message: activeSession ? "Sesión extendida" : "Sesión iniciada",
            newBalance: user?.balance || 0,
            session
        };
    }

    // Endpoint to manually end a session
    @Post('session/end')
    async endSession(@Req() req, @Body() body: any) {
        const { userId, pcId } = body;

        // Find active session
        // For sessions with userId: search by both userId and pcId
        // For orphaned sessions (userId null): search by pcId only
        const session = await this.prisma.session.findFirst({
            where: {
                pcId,  // Always filter by pcId
                ...(userId ? { userId } : {}),  // Add userId filter only if provided
                status: { in: ['ACTIVE', 'PAUSED'] }
            },
            orderBy: {
                startedAt: 'desc'  // Get the most recent session if multiple exist
            }
        });

        if (!session) throw new BadRequestException("No active session found");

        // Validate ownership if userId provided
        if (userId && session.userId !== userId) throw new UnauthorizedException("Invalid session owner");

        // End Session
        // We trust the Agent's request (Signed/ApiKey). 
        // We use the session.userId as the actor so the service allows it.
        const result = await this.sessionsService.end(
            session.id,
            session.userId,
            'STAFF' as any, // Mock role, permission check passes via ID match
            { paymentMethod: PaymentMethod.BALANCE }
        );

        return { success: true, session: result };
    }
}
