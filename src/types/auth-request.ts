import { Request } from 'express';

export interface AuthRequest extends Request {
    user?: {
        userType: any; id: string 
}; // Adjust based on your user structure
}

export enum Role {
    ADMIN = 1,
    MANAGER = 2,
    STAFF = 3,
    CLIENT = 4,
}
