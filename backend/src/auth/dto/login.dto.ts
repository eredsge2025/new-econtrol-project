import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsOptional()
    identifier?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsNotEmpty({ message: 'Password es requerido' })
    @MinLength(6, { message: 'Password debe tener mínimo 6 caracteres' })
    password: string;

    @IsString()
    @IsOptional()
    pcId?: string;
}
