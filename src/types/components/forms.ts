// Form-related type definitions (simplified for React Hook Form)
export interface FormErrors {
  [field: string]: string;
}

// Generic form props
export interface FormProps {
  onSubmit?: (data: any) => void;
  onError?: (errors: FormErrors) => void;
  disabled?: boolean;
  className?: string;
}