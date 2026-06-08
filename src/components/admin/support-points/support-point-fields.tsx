import { AdminSelectField, AdminTextField } from "@/components/admin/admin-form-fields";
import { SUPPORT_POINT_TYPES } from "@/lib/support-points/form";
import type { SupportPointType } from "@/types/support-point";

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
};

export function SupportPointTextField(props: TextFieldProps) {
  return <AdminTextField {...props} />;
}

type SelectFieldProps = {
  label: string;
  value: SupportPointType;
  onChange: (value: SupportPointType) => void;
  error?: string;
};

export function SupportPointSelectField({ label, value, onChange, error }: SelectFieldProps) {
  return (
    <AdminSelectField
      label={label}
      value={value}
      options={SUPPORT_POINT_TYPES}
      onChange={onChange}
      error={error}
    />
  );
}
