import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdateRateScheduleDto {
    @IsNumber()
    @Min(1)
    @IsOptional()
    minutes?: number;

    @IsNumber()
    @Min(0.01)
    @IsOptional()
    price?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
