import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { BundlesService } from './bundles.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class BundlesController {
    constructor(private bundlesService: BundlesService) { }

    @Get('zones/:zoneId/bundles')
    findByZone(@Param('zoneId') zoneId: string) {
        return this.bundlesService.findByZone(zoneId);
    }

    @Post('zones/:zoneId/bundles')
    create(
        @Param('zoneId') zoneId: string,
        @Request() req,
        @Body() createDto: CreateBundleDto,
    ) {
        return this.bundlesService.create(zoneId, req.user.id, req.user.role, createDto);
    }

    @Patch('bundles/:id')
    update(@Param('id') id: string, @Request() req, @Body() updateDto: UpdateBundleDto) {
        return this.bundlesService.update(id, req.user.id, req.user.role, updateDto);
    }

    @Delete('bundles/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string, @Request() req) {
        return this.bundlesService.remove(id, req.user.id, req.user.role);
    }
}
