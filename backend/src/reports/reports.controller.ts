import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { QueryReceivablesDto } from '../receivables/dto/query-receivables.dto';
import { QueryReceiptsDto } from '../receipts/dto/query-receipts.dto';
import { QueryCurrentAccountsDto } from '../current-accounts/dto/query-current-accounts.dto';
import { QueryCurrentAccountMovementsDto } from '../current-accounts/dto/query-movements.dto';
import { QueryAuditDto } from '../audit/dto/query-audit.dto';
import { QueryDashboardDto } from '../dashboard/dto/query-dashboard.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private sendFile(res: Response, buffer: Buffer, filename: string, contentType: string) {
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('receivables.xlsx')
  async receivablesXlsx(
    @Query() query: QueryReceivablesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportReceivables(query, user, 'xlsx');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('receivables.csv')
  async receivablesCsv(
    @Query() query: QueryReceivablesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportReceivables(query, user, 'csv');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('receipts.xlsx')
  async receiptsXlsx(
    @Query() query: QueryReceiptsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportReceipts(query, user, 'xlsx');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('receipts.csv')
  async receiptsCsv(
    @Query() query: QueryReceiptsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportReceipts(query, user, 'csv');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('current-accounts.xlsx')
  async currentAccountsXlsx(
    @Query() query: QueryCurrentAccountsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportCurrentAccounts(query, user, 'xlsx');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('current-accounts.csv')
  async currentAccountsCsv(
    @Query() query: QueryCurrentAccountsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportCurrentAccounts(query, user, 'csv');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('current-accounts/:id/movements.xlsx')
  async movementsXlsx(
    @Param('id') id: string,
    @Query() query: QueryCurrentAccountMovementsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportMovements(id, query, user, 'xlsx');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('current-accounts/:id/movements.csv')
  async movementsCsv(
    @Param('id') id: string,
    @Query() query: QueryCurrentAccountMovementsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportMovements(id, query, user, 'csv');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('audit.xlsx')
  @Roles(Role.ADMIN, Role.DIRETORIA)
  async auditXlsx(
    @Query() query: QueryAuditDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportAudit(query, user, 'xlsx');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('audit.csv')
  @Roles(Role.ADMIN, Role.DIRETORIA)
  async auditCsv(
    @Query() query: QueryAuditDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportAudit(query, user, 'csv');
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }

  @Get('dashboard.xlsx')
  async dashboardXlsx(
    @Query() query: QueryDashboardDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportDashboard(query, user);
    this.sendFile(res, file.buffer, file.filename, file.contentType);
  }
}
