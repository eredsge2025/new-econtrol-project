import {
    IsString,
    IsNotEmpty,
    IsNumber,
    Min,
    IsOptional,
} from 'class-validator';

export class CreateZoneDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0.01, { message: 'La tarifa base debe ser mayor a 0' })
    baseRate: number;
}
