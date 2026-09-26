export const DEFAULT_MONTHLY_FEE_YEN = 4_980;
export const DEFAULT_TRIAL_MONTHS = 3;

export const SUBSCRIPTION_STATUSES = [
    "trial",
    "active",
    "past_due",
    "cancelled",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
    trial: "無料お試し",
    active: "契約中",
    past_due: "支払確認待ち",
    cancelled: "解約済み",
};

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
    return typeof value === "string"
        && SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus);
}

/** 既存テナントは契約状態が未保存でも、従来どおり契約中として扱う。 */
export function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
    return isSubscriptionStatus(value) ? value : "active";
}

export function getSubscriptionStatusLabel(value: unknown): string {
    return SUBSCRIPTION_STATUS_LABELS[normalizeSubscriptionStatus(value)];
}

export function isIsoDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year
        && parsed.getMonth() === month - 1
        && parsed.getDate() === day;
}

export function formatLocalIsoDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function addCalendarMonths(isoDate: string, months = DEFAULT_TRIAL_MONTHS): string {
    if (!isIsoDate(isoDate)) throw new Error("日付の形式が正しくありません");
    const [year, month, day] = isoDate.split("-").map(Number);
    const targetFirstDay = new Date(year, month - 1 + months, 1);
    const targetLastDay = new Date(
        targetFirstDay.getFullYear(),
        targetFirstDay.getMonth() + 1,
        0,
    ).getDate();
    targetFirstDay.setDate(Math.min(day, targetLastDay));
    return formatLocalIsoDate(targetFirstDay);
}

export function normalizeMonthlyFee(
    value: unknown,
    fallback = DEFAULT_MONTHLY_FEE_YEN,
): number {
    if (value === "") return fallback;
    const amount = typeof value === "number" ? value : Number(value);
    return Number.isSafeInteger(amount) && amount >= 0 ? amount : fallback;
}

export function createTrialSubscriptionDefaults(startDate = formatLocalIsoDate()) {
    const normalizedStartDate = isIsoDate(startDate) ? startDate : formatLocalIsoDate();
    return {
        subscriptionStatus: "trial" as const,
        fee: DEFAULT_MONTHLY_FEE_YEN,
        startDate: normalizedStartDate,
        trialEndDate: addCalendarMonths(normalizedStartDate),
    };
}
