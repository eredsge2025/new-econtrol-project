import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsEmail({}, { message: 'El email no es válido' })
    @IsNotEmpty({ message: 'El email es requerido' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
    @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' })
    username: string;

    @IsString()
    @IsNotEmpty({ message: 'La contraseña es requerida' })
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password: string;

    @IsString()
    @IsOptional()
    homeLanId?: string;
}
