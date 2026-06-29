// Russian pluralization helper: picks the right form based on the number.
// forms = [one, few, many] e.g. ["минуту", "минуты", "минут"]
function pluralize(n: number, forms: [string, string, string]): string {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 >= 11 && mod100 <= 14) return forms[2];
    if (mod10 === 1) return forms[0];
    if (mod10 >= 2 && mod10 <= 4) return forms[1];
    return forms[2];
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Returns a human-readable Russian online status from a last-seen ISO timestamp.
 * "В сети" if seen within the last 5 minutes, otherwise "Был(а) онлайн N ... назад".
 */
export function onlineStatus(lastSeen?: string | null): string {
    if (!lastSeen) return "Не в сети";

    const diffMs = Date.now() - new Date(lastSeen).getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return "Не в сети";
    if (diffMs < 5 * MINUTE) return "В сети";

    if (diffMs < HOUR) {
        const minutes = Math.floor(diffMs / MINUTE);
        return `Был онлайн ${minutes} ${pluralize(minutes, ["минуту", "минуты", "минут"])} назад`;
    }
    if (diffMs < DAY) {
        const hours = Math.floor(diffMs / HOUR);
        return `Был онлайн ${hours} ${pluralize(hours, ["час", "часа", "часов"])} назад`;
    }
    const days = Math.floor(diffMs / DAY);
    return `Был онлайн ${days} ${pluralize(days, ["день", "дня", "дней"])} назад`;
}

/** True when the user was active within the last 5 minutes. */
export function isOnline(lastSeen?: string | null): boolean {
    if (!lastSeen) return false;
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    return !Number.isNaN(diffMs) && diffMs >= 0 && diffMs < 5 * MINUTE;
}
