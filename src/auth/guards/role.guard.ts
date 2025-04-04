import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserType } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
    private readonly logger = new Logger(RoleGuard.name);

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        this.logger.debug('Role guard activated');

        const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        this.logger.debug(`Required roles: ${JSON.stringify(requiredRoles)}`);

        if (!requiredRoles || requiredRoles.length === 0) {
            this.logger.debug('No roles required, access granted');
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        this.logger.debug(`User from request: ${JSON.stringify(user)}`);

        if (!user) {
            this.logger.error('No user found in request');
            throw new UnauthorizedException('User not found in request');
        }

        if (!user.userType) {
            this.logger.error(`No userType found for user ${user.id}`);
            throw new UnauthorizedException('User type not found');
        }

        // Ensure userType is a valid number
        if (typeof user.userType !== 'number' || user.userType < 1 || user.userType > 4) {
            this.logger.error(`Invalid userType ${user.userType} for user ${user.id}`);
            throw new UnauthorizedException('Invalid user type');
        }

        const hasRole = requiredRoles.includes(user.userType);
        this.logger.debug(`User ${user.id} has required role: ${hasRole}`);

        if (!hasRole) {
            this.logger.warn(`User ${user.id} does not have required role`);
            throw new UnauthorizedException('Insufficient permissions');
        }

        return true;
    }
} 