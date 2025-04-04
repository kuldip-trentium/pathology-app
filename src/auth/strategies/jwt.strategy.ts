import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UserType } from '../decorators/roles.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        configService: ConfigService,
        private prisma: PrismaService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
        this.logger.debug('JWT Strategy initialized');
    }

    async validate(payload: any): Promise<{ sub: string; email: string; userType: UserType; isDeleted: boolean; isEmailVerified: boolean; createdBy: string | null }> {
        this.logger.debug('JWT validation started');
        this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

        if (!payload || !payload.sub) {
            this.logger.error('Invalid token payload: missing sub');
            throw new UnauthorizedException('Invalid token payload');
        }

        try {
            this.logger.debug(`Looking up user with id: ${payload.sub}`);
            const user = await this.prisma.users.findUnique({
                where: {
                    id: payload.sub,
                    isDeleted: false
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    userType: true,
                    isDeleted: true,
                    isEmailVerified: true,
                    createdBy: true
                }
            });

            this.logger.debug(`User lookup result: ${JSON.stringify(user)}`);

            if (!user) {
                this.logger.error(`User not found for id: ${payload.sub}`);
                throw new UnauthorizedException('User not found or has been deleted');
            }

            if (user.isDeleted) {
                this.logger.error(`User ${user.id} is deleted`);
                throw new UnauthorizedException('User account has been deleted');
            }

            if (!user.isEmailVerified) {
                this.logger.error(`User ${user.id} email not verified`);
                throw new UnauthorizedException('Please verify your email first');
            }

            // Ensure userType is a valid number
            if (typeof user.userType !== 'number' || user.userType < 1 || user.userType > 4) {
                this.logger.error(`Invalid userType ${user.userType} for user ${user.id}`);
                throw new UnauthorizedException('Invalid user type');
            }

            const result = {
                sub: user.id,
                email: user.email,
                name: user.name,
                userType: user.userType as UserType,
                isDeleted: user.isDeleted,
                isEmailVerified: user.isEmailVerified,
                createdBy: user.createdBy
            };

            this.logger.debug(`JWT validation successful: ${JSON.stringify(result)}`);
            return result;
        } catch (error) {
            this.logger.error('Error during JWT validation:', {
                error: error.message,
                stack: error.stack,
                payload
            });
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Authentication failed');
        }
    }
} 