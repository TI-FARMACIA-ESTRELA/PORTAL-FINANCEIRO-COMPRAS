import { Role } from '@prisma/client';

/** Payload assinado no access token JWT. */
export interface JwtPayload {
  sub: string;
  userNumber: number;
  role: Role;
}

/** Usuário autenticado disponível em request.user. */
export interface AuthenticatedUser {
  id: string;
  userNumber: number;
  name: string;
  role: Role;
  isActive: boolean;
}
