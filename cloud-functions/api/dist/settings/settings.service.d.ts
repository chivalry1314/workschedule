import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
export declare class SettingsService {
    private cloudbase;
    constructor(cloudbase: CloudBaseService);
    private mapSetting;
    findAll(): Promise<{
        id: any;
        settingKey: any;
        settingValue: any;
        remark: any;
    }[]>;
    getValue(key: string, defaultValue?: string): Promise<any>;
    upsert(key: string, value: string, remark?: string): Promise<{
        id: any;
        settingKey: any;
        settingValue: any;
        remark: any;
    }>;
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
