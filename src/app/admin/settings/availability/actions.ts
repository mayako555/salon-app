'use server';
import { listAvailabilitySettings, saveAvailabilitySettings } from '@/lib/availability/service';
import type { AvailabilitySettings } from '@/lib/availability/model';
export async function getSettings() { return listAvailabilitySettings(); }
export async function saveSettings(storeId: string, settings: AvailabilitySettings, rotate = false) { return saveAvailabilitySettings(storeId, settings, rotate); }
