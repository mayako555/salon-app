// Shared types for setup/adoption - NOT a server action file

export interface AdoptionProgress {
  storeInfo: boolean;
  businessHours: boolean;
  menu: boolean;
  staff: boolean;
  payroll: boolean;
  lineSettings: boolean;
  salesInputStarted: boolean;
  karteUsageStarted: boolean;
}

export const defaultAdoptionProgress: AdoptionProgress = {
  storeInfo: false,
  businessHours: false,
  menu: false,
  staff: false,
  payroll: false,
  lineSettings: false,
  salesInputStarted: false,
  karteUsageStarted: false,
};
