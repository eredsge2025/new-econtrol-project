import {
    Controller,
    Get,
    Param,
    Patch,
    Body,
    UseGuards,
    Post,
    HttpCode,
    HttpStatus,
    Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    findAll(@Query('lanId') lanId?: string) {
        return this.usersService.findAll(lanId);
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Get(':id/stats')
    getStats(@Param('id') id: string) {
        return this.usersService.getStats(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Post(':id/recharge')
    @HttpCode(HttpStatus.OK)
    recharge(@Param('id') id: string, @Body() body: { amount: number }) {
        return this.usersService.updateBalance(id, body.amount);
    }
}
