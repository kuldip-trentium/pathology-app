import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserType } from './roles.decorator';

export interface CurrentUser {
    id: string;
    userType: UserType;
}

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
); 