var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsInt, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
class ScheduleItemDto {
    workDate;
    shiftTypeId;
}
__decorate([
    IsNotEmpty({ message: '日期不能为空' }),
    __metadata("design:type", String)
], ScheduleItemDto.prototype, "workDate", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Object)
], ScheduleItemDto.prototype, "shiftTypeId", void 0);
export class SaveScheduleDto {
    year;
    month;
    items;
}
__decorate([
    IsInt({ message: '年份必须是整数' }),
    __metadata("design:type", Number)
], SaveScheduleDto.prototype, "year", void 0);
__decorate([
    IsInt({ message: '月份必须是整数' }),
    __metadata("design:type", Number)
], SaveScheduleDto.prototype, "month", void 0);
__decorate([
    IsArray({ message: '排班数据必须是数组' }),
    ValidateNested({ each: true }),
    Type(() => ScheduleItemDto),
    __metadata("design:type", Array)
], SaveScheduleDto.prototype, "items", void 0);
//# sourceMappingURL=save-schedule.dto.js.map