import { SettingsService } from './settings.service.js';
export declare class SettingsController {
    private settingsService;
    constructor(settingsService: SettingsService);
    findAll(): Promise<{
        id: any;
        settingKey: any;
        settingValue: any;
        remark: any;
    }[]>;
    updateBatch(items: {
        settingKey: string;
        settingValue: string;
        remark?: string;
    }[]): Promise<{
        id: any;
        settingKey: any;
        settingValue: any;
        remark: any;
    }[]>;
}
