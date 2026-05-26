import { format } from "date-fns";

export type DailyWeather = {
  date: string;
  weatherCode: number;
  weatherText: "晴れ" | "曇り" | "雨";
  tempMean: number;
  precipSum: number;
};

// 神戸の緯度経度
const KOBE_LAT = 34.6901;
const KOBE_LON = 135.1955;

function parseWeatherCode(code: number | null): "晴れ" | "曇り" | "雨" {
  if (code === null || code === undefined) return "晴れ"; // fallback
  // WMO Weather interpretation codes
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  // 45, 48: Fog
  // 51-99: Drizzle, Rain, Snow, Thunderstorm
  if (code === 0 || code === 1) return "晴れ";
  if (code === 2 || code === 3 || code === 45 || code === 48) return "曇り";
  return "雨";
}

export async function fetchHistoricalWeather(startDateStr: string, endDateStr: string): Promise<Record<string, DailyWeather>> {
  const result: Record<string, DailyWeather> = {};
  
  // 1. Open-Meteo Archive API (for data older than 5 days)
  const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${KOBE_LAT}&longitude=${KOBE_LON}&start_date=${startDateStr}&end_date=${endDateStr}&daily=weather_code,temperature_2m_mean,precipitation_sum&timezone=Asia%2FTokyo`;

  try {
    const resArchive = await fetch(archiveUrl);
    if (resArchive.ok) {
      const data = await resArchive.json();
      if (data.daily && data.daily.time) {
        data.daily.time.forEach((t: string, i: number) => {
          result[t] = {
            date: t,
            weatherCode: data.daily.weather_code[i],
            weatherText: parseWeatherCode(data.daily.weather_code[i]),
            tempMean: data.daily.temperature_2m_mean[i] || 15,
            precipSum: data.daily.precipitation_sum[i] || 0
          };
        });
      }
    }

    // 2. Open-Meteo Forecast API (for recent past 10 days to fill the gap)
    const recentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${KOBE_LAT}&longitude=${KOBE_LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FTokyo&past_days=10&forecast_days=1`;
    const resRecent = await fetch(recentUrl);
    if (resRecent.ok) {
      const data = await resRecent.json();
      if (data.daily && data.daily.time) {
        data.daily.time.forEach((t: string, i: number) => {
          const tMax = data.daily.temperature_2m_max[i] || 15;
          const tMin = data.daily.temperature_2m_min[i] || 15;
          const tMean = (tMax + tMin) / 2;
          
          // Overwrite or fill if archive data is missing (usually last 5 days)
          if (!result[t] || result[t].tempMean === null || result[t].tempMean === undefined) {
            result[t] = {
              date: t,
              weatherCode: data.daily.weather_code[i],
              weatherText: parseWeatherCode(data.daily.weather_code[i]),
              tempMean: tMean,
              precipSum: data.daily.precipitation_sum[i] || 0
            };
          }
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch weather data", err);
  }

  return result;
}
