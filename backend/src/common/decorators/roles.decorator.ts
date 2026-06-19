import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restringe o acesso de uma rota aos perfis informados. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
