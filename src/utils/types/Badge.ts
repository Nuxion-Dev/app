export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    experience: number;
    upgradable: boolean;
    maxUpgrade: number | -1;
    level?: number;
}