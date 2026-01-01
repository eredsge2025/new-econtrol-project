import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateZoneDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0.01)
    @IsOptional()
    baseRate?: number;
}
