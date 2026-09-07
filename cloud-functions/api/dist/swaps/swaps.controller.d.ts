import { SwapsService } from './swaps.service.js';
import { CreateSwapDto } from './dto/create-swap.dto.js';
export declare class SwapsController {
    private swapsService;
    constructor(swapsService: SwapsService);
    findByUser(userId: bigint): Promise<{
        applied: {
            applicant: {
                id: number;
                realName: any;
            };
            targetUser: {
                id: number;
                realName: any;
            } | null;
            applicantSchedule: {
                id: number;
                workDate: any;
                shiftType: any;
            } | undefined;
            targetSchedule: {
                id: number;
                workDate: any;
                shiftType: any;
            } | null | undefined;
            id: number;
            applicantId: number;
            applicantScheduleId: number;
            targetUserId: number | null;
            targetScheduleId: number | null;
            swapType: number;
            reason: any;
            status: number;
            adminApproved: any;
            createdAt: any;
            updatedAt: any;
            resolvedAt: any;
        }[];
        received: {
            applicant: {
                id: number;
                realName: any;
            };
            targetUser: {
                id: number;
                realName: any;
            } | null;
            applicantSchedule: {
                id: number;
                workDate: any;
                shiftType: any;
            } | undefined;
            targetSchedule: {
                id: number;
                workDate: any;
                shiftType: any;
            } | null | undefined;
            id: number;
            applicantId: number;
            applicantScheduleId: number;
            targetUserId: number | null;
            targetScheduleId: number | null;
            swapType: number;
            reason: any;
            status: number;
            adminApproved: any;
            createdAt: any;
            updatedAt: any;
            resolvedAt: any;
        }[];
    }>;
    create(userId: bigint, dto: CreateSwapDto): Promise<{
        message: string;
    }>;
    approve(userId: bigint, id: string): Promise<{
        message: string;
    }>;
    reject(userId: bigint, id: string): Promise<{
        message: string;
    }>;
    withdraw(userId: bigint, id: string): Promise<{
        message: string;
    }>;
    adminApprove(adminId: bigint, id: string): Promise<{
        message: string;
    }>;
    adminReject(adminId: bigint, id: string): Promise<{
        message: string;
    }>;
}
