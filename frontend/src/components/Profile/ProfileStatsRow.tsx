import type { ProfileStats } from "../../types/Profile/profile";
import "./ProfileStatsRow.css";

// Число + подпись; подпись склоняется под русское число.
const plural = (n: number, one: string, few: string, many: string): string => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
};

interface ProfileStatsRowProps {
    stats: ProfileStats;
    followers?: number;
    following?: number;
    onOpenFollowers?: () => void;
    onOpenFollowing?: () => void;
}

export const ProfileStatsRow = ({
    stats,
    followers,
    following,
    onOpenFollowers,
    onOpenFollowing,
}: ProfileStatsRowProps) => {
    const items: {
        value: number;
        label: string;
        onClick?: () => void;
    }[] = [
        { value: stats.boxes, label: plural(stats.boxes, "коробка", "коробки", "коробок") },
        // Понятнее, чем «на витрине»: сколько коробок видно другим.
        { value: stats.public_boxes, label: "публичных" },
        { value: stats.shelves, label: plural(stats.shelves, "стеллаж", "стеллажа", "стеллажей") },
    ];

    if (followers !== undefined) {
        items.push({
            value: followers,
            label: plural(followers, "подписчик", "подписчика", "подписчиков"),
            onClick: onOpenFollowers,
        });
    }
    if (following !== undefined) {
        items.push({ value: following, label: "подписок", onClick: onOpenFollowing });
    }

    return (
        <div className="profile-stats">
            {items.map((it) =>
                it.onClick ? (
                    <button
                        key={it.label}
                        type="button"
                        className="profile-stat profile-stat-clickable"
                        onClick={it.onClick}
                    >
                        <span className="profile-stat-value">{it.value}</span>
                        <span className="profile-stat-label">{it.label}</span>
                    </button>
                ) : (
                    <div key={it.label} className="profile-stat">
                        <span className="profile-stat-value">{it.value}</span>
                        <span className="profile-stat-label">{it.label}</span>
                    </div>
                ),
            )}
        </div>
    );
};
