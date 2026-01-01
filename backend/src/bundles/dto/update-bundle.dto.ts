import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdateBundleDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @Min(60)
    @IsOptional()
    minutes?: number;

    @IsNumber()
    @Min(0.01)
    @IsOptional()
    price?: number;

    @IsBoolean()
    @IsOptional()
    isSaveable?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
