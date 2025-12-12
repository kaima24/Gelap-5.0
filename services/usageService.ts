export const DAILY_LIMIT = 20;

const getTodayKey = () => {
  const date = new Date().toISOString().split('T')[0];
  return `gelap_usage_${date}`;
};

export const getDailyUsage = (): number => {
  const key = getTodayKey();
  const usage = localStorage.getItem(key);
  return usage ? parseInt(usage, 10) : 0;
};

export const getDailyLimit = (): number => DAILY_LIMIT;

export const incrementUsage = (): number => {
  const key = getTodayKey();
  const current = getDailyUsage();
  const newUsage = current + 1;
  localStorage.setItem(key, newUsage.toString());
  return newUsage;
};

export const checkDailyLimit = (): boolean => {
  return getDailyUsage() < DAILY_LIMIT;
};