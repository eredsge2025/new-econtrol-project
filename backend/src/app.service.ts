import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getHello(): string {
        return 'eControl API v1.0 - Sistema de Administración de LAN Centers';
    }
}
