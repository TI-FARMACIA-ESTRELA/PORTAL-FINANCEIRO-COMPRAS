import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Campos seguros de usuário (sem password_hash) retornados nas respostas. */
export const userSelect = {
  id: true,
  userNumber: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Uso interno de autenticação: retorna o usuário completo (com hash). */
  findByUserNumberWithHash(userNumber: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { userNumber } });
  }

  list(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: userSelect,
      orderBy: { userNumber: 'asc' },
    });
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return user;
  }

  async create(dto: CreateUserDto, actor: ActorContext): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { userNumber: dto.userNumber },
    });
    if (existing) {
      throw new ConflictException('Já existe um usuário com este número.');
    }
    if (dto.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          userNumber: dto.userNumber,
          name: dto.name,
          email: dto.email ?? null,
          passwordHash,
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
        select: userSelect,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.USER_CREATED,
          entityType: AuditEntity.USER,
          entityId: created.id,
          newValues: {
            userNumber: created.userNumber,
            name: created.name,
            email: created.email,
            role: created.role,
            isActive: created.isActive,
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return created;
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: ActorContext): Promise<SafeUser> {
    const current = await this.findById(id);
    if (dto.email) {
      const emailOwner = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailOwner && emailOwner.id !== id) {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { name: dto.name, email: dto.email },
        select: userSelect,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.USER_UPDATED,
          entityType: AuditEntity.USER,
          entityId: id,
          oldValues: { name: current.name, email: current.email },
          newValues: { name: updated.name, email: updated.email },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return updated;
    });
  }

  async setActive(
    id: string,
    isActive: boolean,
    reason: string | undefined,
    actor: ActorContext,
  ): Promise<SafeUser> {
    const current = await this.findById(id);

    if (!isActive && (!reason || reason.trim().length < 5)) {
      throw new BadRequestException('Informe um motivo (mín. 5 caracteres) para inativar o usuário.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { isActive },
        select: userSelect,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
          entityType: AuditEntity.USER,
          entityId: id,
          oldValues: { isActive: current.isActive },
          newValues: { isActive: updated.isActive },
          reason: reason ?? null,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return updated;
    });
  }

  async resetPassword(
    id: string,
    password: string,
    reason: string,
    actor: ActorContext,
  ): Promise<SafeUser> {
    await this.findById(id);
    const passwordHash = await argon2.hash(password);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { passwordHash },
        select: userSelect,
      });
      // Nunca registramos a senha nem o hash na auditoria.
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.USER_PASSWORD_RESET,
          entityType: AuditEntity.USER,
          entityId: id,
          reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return updated;
    });
  }

  async changeRole(
    id: string,
    role: Role,
    reason: string,
    requesterId: string,
    actor: ActorContext,
  ): Promise<SafeUser> {
    const target = await this.findById(id);
    if (target.id === requesterId && role !== Role.ADMIN) {
      throw new BadRequestException('Você não pode alterar o seu próprio perfil de administrador.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role },
        select: userSelect,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.USER_ROLE_CHANGED,
          entityType: AuditEntity.USER,
          entityId: id,
          oldValues: { role: target.role },
          newValues: { role: updated.role },
          reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return updated;
    });
  }

  updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
