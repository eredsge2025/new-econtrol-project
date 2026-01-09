import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLanPaymentMethodDto {
    @IsString()
    @IsNotEmpty()
    methodId: string;

    @IsString()
    @IsOptional()
    displayName?: string;

    @IsBoolean()
    isEnabled: boolean;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsOptional()
    color?: string;

    @IsOptional()
    metadata?: any;
}
