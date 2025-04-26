import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PublicSharingService } from './service';
import { PermissionLevel } from '../../permission/types';
import { PublicAccessLevel } from '../types';

@ApiTags('Workspace Public Sharing')
@Controller('workspaces')
export class PublicSharingController {
  constructor(private readonly publicSharingService: PublicSharingService) {}

  @ApiOperation({ summary: 'Get public workspace info' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Returns public workspace information' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiResponse({ status: 403, description: 'Workspace is not publicly accessible' })
  @Get(':id/public')
  async getPublicWorkspaceInfo(@Param('id') id: string, @Res() res: Response) {
    const workspaceInfo = await this.publicSharingService.getPublicWorkspaceInfo(id);
    return res.json(workspaceInfo);
  }

  @ApiOperation({ summary: 'Check if a workspace is publicly accessible' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'level', description: 'Required access level' })
  @ApiResponse({ status: 200, description: 'Returns boolean indicating if workspace is accessible' })
  @Get(':id/public/access/:level')
  async isPubliclyAccessible(
    @Param('id') id: string,
    @Param('level') level: string,
    @Res() res: Response,
  ) {
    // Validate and convert level to enum
    let accessLevel: PublicAccessLevel;
    switch (level.toUpperCase()) {
      case 'READ':
        accessLevel = PublicAccessLevel.READ;
        break;
      case 'COMMENT':
        accessLevel = PublicAccessLevel.COMMENT;
        break;
      case 'WRITE':
        accessLevel = PublicAccessLevel.WRITE;
        break;
      default:
        accessLevel = PublicAccessLevel.READ;
    }

    const isAccessible = await this.publicSharingService.isWorkspacePubliclyAccessible(
      id,
      accessLevel,
    );
    return res.json({ isAccessible });
  }
}