// Form-related type definitions
export interface FormErrors {
  [field: string]: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: FormErrors;
}

// Upload form specific types
export interface UploadFormState {
  title: string;
  description: string;
  file: File | null;
  errors: FormErrors;
  isValid: boolean;
  touched: {
    title: boolean;
    description: boolean;
    file: boolean;
  };
}

// Form field validation status
export interface FieldValidation {
  isValid: boolean;
  error?: string;
  touched: boolean;
}

// Generic form props
export interface FormProps {
  onSubmit?: (data: any) => void;
  onError?: (errors: FormErrors) => void;
  disabled?: boolean;
  className?: string;
}