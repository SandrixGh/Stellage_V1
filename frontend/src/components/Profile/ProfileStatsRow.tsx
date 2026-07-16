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

export const ProfileStatsRow = ({ stats }: { stats: ProfileStats }) => {
    const items = [
        { value: stats.boxes, label: plural(stats.boxes, "коробка", "коробки", "коробок") },
        { value: stats.public_boxes, label: "на витрине" },
        { value: stats.shelves, label: plural(stats.shelves, "стеллаж", "стеллажа", "стеллажей") },
    ];

    return (
        <div className="profile-stats">
            {items.map((it) => (
                <div key={it.label} className="profile-stat">
                    <span className="profile-stat-value">{it.value}</span>
                    <span className="profile-stat-label">{it.label}</span>
                </div>
            ))}
        </div>
    );
};
