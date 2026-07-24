export type OnboardingForm = {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  active: boolean;
  header_text: string | null;
  footer_text: string | null;
};

export type OnboardingFieldOption = { value: string; label: string; category?: string };

export type OnboardingFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiselect"
  | "file"
  | "download";

export type OnboardingField = {
  id: string;
  key: string;
  label: string;
  field_type: OnboardingFieldType;
  options: OnboardingFieldOption[];
  allow_other: boolean;
  // Custom label for the "Other" free-text choice (select/boolean). Null =
  // fall back to the generic "Outro"/"Other" translation.
  other_label: string | null;
  required: boolean;
  position: number;
  mask: string | null;
  width: number;
  rows: number;
  // For 'download' fields: the admin-attached object in the form-attachments
  // bucket + its original filename (null until the admin uploads one).
  download_path: string | null;
  download_filename: string | null;
};

// A 'file' field's answer is an { path, name } object; the rest are scalars or
// string arrays.
export type OnboardingAnswers = Record<
  string,
  string | string[] | number | boolean | { path: string; name: string } | undefined
>;
