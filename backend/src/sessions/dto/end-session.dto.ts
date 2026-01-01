import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PaymentMethod {
    BALANCE = 'BALANCE',
    CASH = 'CASH',
}

export class EndSessionDto {
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;
}
