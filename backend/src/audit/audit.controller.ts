import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

// Consulta de auditoria: somente ADMIN e DIRETORIA. Append-only (sem PUT/DELETE).
@Roles(Role.ADMIN, Role.DIRETORIA)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: QueryAuditDto) {
    return this.auditService.query(query);
  }
}
