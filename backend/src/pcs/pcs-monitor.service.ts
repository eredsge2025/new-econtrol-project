import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PCStatus } from '@prisma/client';
import { exec } from 'child_process';
import { PcsGateway } from './pcs.gateway';
import * as iconv from 'iconv-lite';

@Injectable()
export class PcsMonitorService implements OnModuleInit {
    private readonly logger = new Logger(PcsMonitorService.name);
    private readonly HEARTBEAT_THRESHOLD_SECONDS = 20; // 2 latidos del agente (10s c/u)

    constructor(
        private prisma: PrismaService,
        private pcsGateway: PcsGateway
    ) { }

    onModuleInit() {
        this.logger.log('Monitor de PCs real-time iniciado');
        // Ejecutar revisión cada 5 segundos para detección rápida
        setInterval(() => this.checkPcsStatus(), 5000);

        // Ejecutar "Zombie Sweeper" cada 5 minutos (300,000 ms)
        // Detecta PCs que esten OFFLINE pero respondan Ping (encendidas sin gente)
        setInterval(() => this.checkZombiePcs(), 300000);

        // Ejecutar una vez al inicio para pruebas rápidas (opcional)
        setTimeout(() => this.checkZombiePcs(), 10000);
    }

    // Nuevo: Revisa si hay PCs "muertas" que en realidad están vivas
    // Y viceversa: si una MALICIOUS (zombie) ya se apagó, volverla a OFFLINE.
    private async checkZombiePcs() {
        this.logger.debug('Iniciando Zombie Sweeper (Offline/Malicious Check)...');

        const candidatePcs = await this.prisma.pC.findMany({
            where: {
                status: { in: [PCStatus.OFFLINE, PCStatus.MALICIOUS] },
                ipAddress: { not: null }
            },
            include: { zone: true }
        });

        for (const pc of candidatePcs) {
            if (!pc.ipAddress) continue;

            // Usar la misma lógica robusta de ping
            const isReachable = await this.pingPc(pc.ipAddress);

            // CASO 1: Zombie Detectado (Estaba OFFLINE pero responde)
            if (pc.status === PCStatus.OFFLINE && isReachable) {
                this.logger.warn(`🧟 ZOMBIE DETECTADO: PC ${pc.name} estaba OFFLINE pero responde Ping. Marcando MALICIOUS.`);
                await this.updatePcStatus(pc, PCStatus.MALICIOUS);
            }

            // CASO 2: Zombie Eliminado (Estaba MALICIOUS pero ya no responde)
            else if (pc.status === PCStatus.MALICIOUS && !isReachable) {
                this.logger.log(`PC ${pc.name} (Malicious) dejó de responder Ping. Volviendo a OFFLINE.`);
                await this.updatePcStatus(pc, PCStatus.OFFLINE);
            }
        }
    }

    // Helper para actualizar y notificar
    private async updatePcStatus(pc: any, newStatus: PCStatus) {
        const updatedPc = await this.prisma.pC.update({
            where: { id: pc.id },
            data: { status: newStatus },
            include: {
                zone: true,
                activeUser: true,
                sessions: {
                    where: { status: { in: ['ACTIVE', 'PAUSED'] } },
                    take: 1,
                    include: { transactions: { orderBy: { createdAt: 'desc' } } }
                }
            },
        });

        // Si la PC se vuelve offline o malocius (zombie), y tenía usuario activo,
        // liberar el activePcId del usuario para dejarlo loguear en otro lado.
        // EVITAR desconectar al usuario si la PC parpadea a OFFLINE/MALICIOUS (reinicio).
        // El usuario debe persistir para que el dashboard muestre el tiempo restante.
        // if ((newStatus === PCStatus.OFFLINE || newStatus === PCStatus.MALICIOUS) && updatedPc.activeUser) {
        //     await this.prisma.user.update({
        //         where: { id: updatedPc.activeUser.id },
        //         data: { activePcId: null },
        //     });
        //     this.logger.log(`Liberado activePcId para usuario ${updatedPc.activeUser.username} debido a PC ${updatedPc.name} ${newStatus}`);
        // }

        // Alertar al frontend
        this.pcsGateway.emitStatusUpdate(updatedPc, updatedPc.zone.lanId);
    }

    private async checkPcsStatus() {
        const now = new Date(); // Server Time

        // Obtener todas las PCs activas para ver su desfase de tiempo
        const pcs = await this.prisma.pC.findMany({
            where: {
                status: {
                    notIn: [PCStatus.OFFLINE, PCStatus.MALICIOUS],
                },
            },
            include: { zone: true },
        });

        if (pcs.length > 0) {
            this.logger.debug(`Chequeando ${pcs.length} PCs. Threshold: ${this.HEARTBEAT_THRESHOLD_SECONDS}s`);
        }

        for (const pc of pcs) {
            if (!pc.lastHeartbeat) continue;

            const lastHeartbeatTime = new Date(pc.lastHeartbeat).getTime();
            const diffSeconds = Math.floor((now.getTime() - lastHeartbeatTime) / 1000);

            if (diffSeconds > this.HEARTBEAT_THRESHOLD_SECONDS) {
                this.logger.warn(`PC ${pc.name} excedió threshold. Diff: ${diffSeconds}s > ${this.HEARTBEAT_THRESHOLD_SECONDS}s. LastHeartbeat: ${pc.lastHeartbeat?.toISOString()} vs Now: ${now.toISOString()}`);

                if (!pc.ipAddress) {
                    this.logger.error(`PC ${pc.name} no tiene IP registrada.`);
                    continue;
                }

                const isReachable = await this.pingPc(pc.ipAddress);
                const oldStatus = pc.status;
                let newStatus: PCStatus;

                if (isReachable) {
                    this.logger.warn(`⚠️ ALERTA: PC ${pc.name} responde ping pero agente está mudo. Marcando como MALICIOUS.`);
                    newStatus = PCStatus.MALICIOUS;
                } else {
                    this.logger.log(`PC ${pc.name} no responde ping. Marcando como OFFLINE.`);
                    newStatus = PCStatus.OFFLINE;
                }

                await this.updatePcStatus(pc, newStatus);
                this.logger.log(`Status actualizado para ${pc.name}: ${oldStatus} -> ${newStatus}`);
            }
        }
    }

    private async pingPc(ip: string): Promise<boolean> {
        return new Promise((resolve) => {
            // encoding: 'buffer' es clave para que iconv pueda decodificarlo correctamente
            // -n 2: 2 paquetes para mayor fiabilidad
            exec(`ping -n 2 -w 1000 ${ip}`, { encoding: 'buffer' }, (error, stdout, stderr) => {
                // Decodificar usando cp850 (común en Windows CMD en español/latino)
                // Si falla la decodificación cp850, a veces se usa win1252, pero cp850 es el estándar de consola.
                const decodedStdout = (iconv as any).decode(stdout as Buffer, 'cp850');
                const lowerOutput = decodedStdout.toLowerCase();

                // MEJORA: Solo 'ttl=' o 'bytes=' indica éxito real. 
                // 'Respuesta desde' puede ser 'host inaccesible', por lo que lo quitamos.
                const isSuccess = lowerOutput.includes('ttl=') ||
                    lowerOutput.includes('bytes=') ||
                    lowerOutput.includes('tiempo=') ||
                    lowerOutput.includes('time=');

                if (error && !isSuccess) {
                    this.logger.debug(`Ping fallido a ${ip}. Error: ${error?.message}. Output: ${decodedStdout}`);
                } else if (isSuccess) {
                    // Si hay éxito en el output, ignoramos el exit code
                    resolve(true);
                    return;
                }

                resolve(isSuccess);
            });
        });
    }
}
