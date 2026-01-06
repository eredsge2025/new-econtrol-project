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
    findAll(@Query('lanId') lanId?: string, @Query('q') q?: string) {
        return this.usersService.findAll(lanId, q);
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
    recharge(@Param('id') id: string, @Body() body: { amount: number; lanId: string; paymentMethod?: string }) {
        // Default to 'CASH' if not provided, but ideally frontend sends it.
        // Also validate lanId is present.
        if (!body.lanId) {
            // Fallback: try to use user's homeLanId or throw? 
            // For strict cash control, we NEED the lanId where the money is entering.
            // Let's throw check if strictness is required, or default to a "Global" if permitted?
            // Better to require it from the Dashboard.
            // Throwing error if missing for now to enforce frontend update.
            if (!body.lanId) throw new Error("lanId is required for recharge");
        }
        return this.usersService.updateBalance(id, body.amount, body.lanId, body.paymentMethod);
    }
}
