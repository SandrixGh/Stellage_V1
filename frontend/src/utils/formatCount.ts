/**
 * Компактное сокращение больших чисел для бирок/счётчиков (лайки и т.п.).
 *
 * До 1000 — число как есть. Дальше сокращаем с округлением до десятых и
 * русским суффиксом: К (тысячи), М (миллионы), Б (миллиарды), Т (триллионы).
 * Десятую отбрасываем, если она ноль: 1000 → «1К», 1200 → «1,2К»,
 * 3 400 000 → «3,4М», 5 000 000 000 → «5Б».
 */
const UNITS: { value: number; suffix: string }[] = [
    { value: 1_000_000_000_000, suffix: "Т" },
    { value: 1_000_000_000, suffix: "Б" },
    { value: 1_000_000, suffix: "М" },
    { value: 1_000, suffix: "К" },
];

export function formatCount(n: number): string {
    if (!Number.isFinite(n)) return "0";
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);

    if (abs < 1000) return `${sign}${Math.trunc(abs)}`;

    for (const { value, suffix } of UNITS) {
        if (abs >= value) {
            // Округляем вниз до десятых, чтобы не «раздувать» счётчик
            // (999 999 → 999,9К, а не 1000К=1М).
            const scaled = Math.floor((abs / value) * 10) / 10;
            const text = Number.isInteger(scaled)
                ? String(scaled)
                : scaled.toFixed(1).replace(".", ",");
            return `${sign}${text}${suffix}`;
        }
    }

    return `${sign}${abs}`;
}
