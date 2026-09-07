import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: {
        sub: bigint;
        username: string;
        isAdmin: boolean;
        roleId: bigint;
    }): Promise<{
        sub: bigint;
        username: string;
        isAdmin: boolean;
        roleId: bigint;
    }>;
}
export {};
