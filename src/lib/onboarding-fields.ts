export type OnboardingForm = {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  active: boolean;
};

export type OnboardingFieldOption = { value: string; label: string; category?: string };

export type OnboardingFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiselect";

export type OnboardingField = {
  id: string;
  key: string;
  label: string;
  field_type: OnboardingFieldType;
  options: OnboardingFieldOption[];
  allow_other: boolean;
  required: boolean;
  position: number;
  mask: string | null;
  width: number;
};

export type OnboardingAnswers = Record<string, string | string[] | number | boolean | undefined>;
