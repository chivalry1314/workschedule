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
                shiftType: any;
                id: number;
                workDate: any;
            } | null;
            targetSchedule: {
                shiftType: any;
                id: number;
                workDate: any;
            } | null;
            id: number;
            applicantId: number;
            applicantScheduleId: number;
            applicantShiftTypeId: number | null;
            targetUserId: number | null;
            targetScheduleId: number | null;
            targetShiftTypeId: number | null;
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
                shiftType: any;
                id: number;
                workDate: any;
            } | null;
            targetSchedule: {
                shiftType: any;
                id: number;
                workDate: any;
            } | null;
            id: number;
            applicantId: number;
            applicantScheduleId: number;
            applicantShiftTypeId: number | null;
            targetUserId: number | null;
            targetScheduleId: number | null;
            targetShiftTypeId: number | null;
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
    findAllNonAdmin(): Promise<{
        all: {
            applicant: {
                id: number;
                realName: any;
            };
            targetUser: {
                id: number;
                realName: any;
            } | null;
            applicantSchedule: {
                shiftType: any;
                id: number;
                workDate: any;
            } | null;
            targetSchedule: {
                shiftType: any;
                id: number;
                workDate: any;
            } | null;
            id: number;
            applicantId: number;
            applicantScheduleId: number;
            applicantShiftTypeId: number | null;
            targetUserId: number | null;
            targetScheduleId: number | null;
            targetShiftTypeId: number | null;
            swapType: number;
            reason: any;
            status: number;
            adminApproved: any;
            createdAt: any;
            updatedAt: any;
            resolvedAt: any;
        }[];
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
