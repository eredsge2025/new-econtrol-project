import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    IsOptional,
} from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Email inválido' })
    @IsNotEmpty({ message: 'Email es requerido' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Username es requerido' })
    @MinLength(3, { message: 'Username debe tener mínimo 3 caracteres' })
    username: string;

    @IsString()
    @IsNotEmpty({ message: 'Password es requerido' })
    @MinLength(6, { message: 'Password debe tener mínimo 6 caracteres' })
    password: string;

    @IsString()
    @IsOptional()
    phone?: string;
}
