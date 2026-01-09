import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PaymentMethod {
    BALANCE = 'BALANCE',
    CASH = 'CASH',
    YAPE = 'YAPE',
    PLIN = 'PLIN',
    CARD = 'CARD',
}

export class EndSessionDto {
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;
}
