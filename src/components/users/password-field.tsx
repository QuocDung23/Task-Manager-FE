import { Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FieldError } from "../ui/field";

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  isVisible: boolean;
  onVisibilityToggle: () => void;
  onInputChange: () => void;
  minLength: number;
  maxLength: number;
  error?: string;
  isAutoFocus?: boolean;
}

export function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  isVisible,
  onVisibilityToggle,
  onInputChange,
  minLength,
  maxLength,
  error,
  isAutoFocus = false,
}: PasswordFieldProps) {
  const isInvalid = Boolean(error);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {/* Uncontrolled: read via FormData, cleared by formRef.current.reset() */}
        <Input
          id={id}
          name={id}
          type={isVisible ? "text" : "password"}
          onChange={onInputChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          autoFocus={isAutoFocus}
          aria-invalid={isInvalid}
          className="pr-9"
        />
        <button
          type="button"
          onClick={onVisibilityToggle}
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
        >
          {isVisible ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <FieldError errors={error ? [{ message: error }] : undefined} />
    </div>
  );
}
