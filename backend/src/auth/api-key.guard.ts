import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            throw new UnauthorizedException('API Key requerida en header x-api-key');
        }

        // Buscar LAN Center por API Key
        const lan = await this.prisma.lANCenter.findUnique({
            where: { apiKey },
        });

        if (!lan) {
            throw new UnauthorizedException('API Key inválida');
        }

        // Adjuntar LAN al request para uso posterior
        request.lan = lan;
        return true;
    }
}
