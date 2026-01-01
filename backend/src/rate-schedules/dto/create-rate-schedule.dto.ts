import { IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';

export class CreateRateScheduleDto {
    @IsNumber()
    @Min(1, { message: 'Los minutos deben ser mayor a 0' })
    minutes: number;

    @IsNumber()
    @Min(0.01, { message: 'El precio debe ser mayor a 0' })
    price: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
