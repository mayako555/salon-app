export const LINE_TEMPLATE_VARIABLES = [
  "{customer_name}",
  "{store_name}",
  "{date}",
  "{time}",
  "{menu_name}",
  "{staff_name}",
  "{reservation_url}",
  "{store_phone}",
  "{next_reservation_date}",
  "{next_reservation_time}",
] as const;

export type LineTemplateVariable = typeof LINE_TEMPLATE_VARIABLES[number];

export function validateLineTemplate(template: string): { isValid: boolean; invalidVariables: string[] } {
  if (!template) {
    return { isValid: false, invalidVariables: [] };
  }

  const regex = /\{[^}]+\}/g;
  const matches = template.match(regex);
  const invalidVariables: string[] = [];

  if (matches) {
    for (const match of matches) {
      if (!LINE_TEMPLATE_VARIABLES.includes(match as LineTemplateVariable)) {
        invalidVariables.push(match);
      }
    }
  }

  return {
    isValid: invalidVariables.length === 0,
    invalidVariables,
  };
}

export interface LineTemplateData {
  customer_name: string;
  store_name: string;
  date: string;
  time: string;
  menu_name: string;
  staff_name: string;
  reservation_url: string;
  store_phone: string;
  next_reservation_date?: string;
  next_reservation_time?: string;
}

export function replaceLineTemplate(template: string, data: LineTemplateData): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    // Replace all occurrences of {key} with value
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || "");
  }

  return result;
}

export function hasUnreplacedVariables(text: string): boolean {
  const regex = /\{[^}]+\}/;
  return regex.test(text);
}
