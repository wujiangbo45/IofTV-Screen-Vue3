export type AppConfig = {
  title?: string;
  homeUrl?: string;
  backMainUrl?: string;
  dateFormat?: string;
  timeFormat?: string;
  weekdayLabels?: string[];
};

const defaultConfig: Required<AppConfig> = {
  title: "保险核算统计大屏",
  homeUrl: "/",
  backMainUrl: "/",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "HH:mm:ss",
  weekdayLabels: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
};

let cachedConfig: AppConfig | null = null;

const CONFIG_URL = `${import.meta.env.BASE_URL}config/app-config.json`;

export async function loadAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch(CONFIG_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load app-config.json: ${res.status}`);
    const remote = (await res.json()) as AppConfig;
    cachedConfig = { ...defaultConfig, ...remote };
  } catch (error) {
    cachedConfig = { ...defaultConfig };
    if (import.meta.env.DEV) {
      console.warn("[app-config] fallback to defaults", error);
    }
  }
  return cachedConfig;
}

export function getDefaultAppConfig(): AppConfig {
  return { ...defaultConfig };
}
