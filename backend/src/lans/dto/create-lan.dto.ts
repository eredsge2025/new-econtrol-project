import {
    IsString,
    IsNotEmpty,
    MinLength,
    MaxLength,
    Matches,
    IsOptional,
    IsObject,
} from 'class-validator';

export class CreateLanDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(100)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Slug debe contener solo letras minúsculas, números y guiones',
    })
    slug: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    country: string;

    @IsString()
    @IsOptional()
    timezone?: string = 'America/Lima';

    @IsObject()
    @IsOptional()
    settings?: Record<string, any>;
}
