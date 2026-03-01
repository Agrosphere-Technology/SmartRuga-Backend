import { RANCH_ROLES } from "../constants/roles";

export function canViewAlerts(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

export function canManageAlerts(role: string) {
    return (
        role === RANCH_ROLES.OWNER ||
        role === RANCH_ROLES.MANAGER ||
        role === RANCH_ROLES.VET
    );
}

export function parseIntSafe(val: any, def: number) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}