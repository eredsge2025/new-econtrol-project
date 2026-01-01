import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsObject,
    IsNumber,
} from 'class-validator';

export class CreatePcDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsObject()
    @IsOptional()
    specs?: Record<string, any>;

    @IsNumber()
    @IsOptional()
    positionX?: number;

    @IsNumber()
    @IsOptional()
    positionY?: number;
}
