import { SetMetadata } from '@nestjs/common';

export enum UserType {
    ADMIN = 1,
    MANAGER = 2,
    STAFF = 3,
    CLIENT = 4
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);

export function getUserTypeFromString(userType: string): UserType {
    switch (userType) {
        case 'ADMIN':
            return UserType.ADMIN;
        case 'MANAGER':
            return UserType.MANAGER;
        case 'STAFF':
            return UserType.STAFF;
        case 'CLIENT':
            return UserType.CLIENT;
        default:
            return UserType.CLIENT;
    }
}

export function getStringFromUserType(userType: UserType): string {
    switch (userType) {
        case UserType.ADMIN:
            return 'ADMIN';
        case UserType.MANAGER:
            return 'MANAGER';
        case UserType.STAFF:
            return 'STAFF';
        case UserType.CLIENT:
            return 'CLIENT';
        default:
            return 'CLIENT';
    }
}

export function validateUserType(value: number): boolean {
    return Object.values(UserType).includes(value);
} 