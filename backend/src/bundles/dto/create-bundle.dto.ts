import { IsString, IsNotEmpty, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';

export class CreateBundleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(60, { message: 'El bundle debe tener mínimo 60 minutos (1 hora)' })
    minutes: number;

    @IsNumber()
    @Min(0.01, { message: 'El precio debe ser mayor a 0' })
    price: number;

    @IsBoolean()
    @IsOptional()
    isSaveable?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
