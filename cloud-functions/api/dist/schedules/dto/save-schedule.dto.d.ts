declare class ScheduleItemDto {
    workDate: string;
    shiftTypeId?: number | null;
}
export declare class SaveScheduleDto {
    year: number;
    month: number;
    items: ScheduleItemDto[];
}
export {};
