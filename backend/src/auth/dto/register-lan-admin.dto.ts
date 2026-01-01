import { IsEmail, IsNotEmpty, IsString, MinLength, IsPhoneNumber, IsOptional } from 'class-validator';

export class RegisterLanAdminDto {
    // Datos personales
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    // Datos del LAN a crear
    @IsString()
    @IsNotEmpty()
    lanName: string;

    @IsString()
    @IsNotEmpty()
    lanAddress: string;

    @IsString()
    @IsNotEmpty()
    lanCity: string;

    @IsString()
    @IsNotEmpty()
    lanCountry: string;

    @IsString()
    @IsOptional()
    timezone?: string;
}
