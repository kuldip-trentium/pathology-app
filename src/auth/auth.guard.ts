import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization;
        if (!authHeader) throw new UnauthorizedException('No token provided');

        try {
            const token = authHeader.split(' ')[1];
            const decoded = this.jwtService.verify(token);
            req.user = decoded;
            return true;
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
