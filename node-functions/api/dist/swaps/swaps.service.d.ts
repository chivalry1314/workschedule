import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { ScheduleWindowsService } from '../schedule-windows/schedule-windows.service.js';
import { CreateSwapDto } from './dto/create-swap.dto.js';
export declare class SwapsService {
    private cloudbase;
    private scheduleWindows;
    constructor(cloudbase: CloudBaseService, scheduleWindows: ScheduleWindowsService);
    private assertWindowEditable;
    private mapRawSwap;
    private enrichSwaps;
    private loadShiftTypes;
    private fetchSwapById;
    create(applicantId: bigint, dto: CreateSwapDto): Promise<{
        message: string;
    }>;
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
    remove(id: bigint): Promise<{
        message: string;
    }>;
    approve(id: bigint, currentUserId: bigint): Promise<{
        message: string;
    }>;
    adminApprove(id: bigint, adminId: bigint, approved: boolean): Promise<{
        message: string;
    }>;
    reject(id: bigint, currentUserId: bigint): Promise<{
        message: string;
    }>;
    withdraw(id: bigint, currentUserId: bigint): Promise<{
        message: string;
    }>;
    private assertSwapRules;
    private executeSwap;
}
