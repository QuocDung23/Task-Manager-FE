import { useEffect, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Input } from "../ui/input";

type InputOtpProps = {
  value: string[];
  onChange: (value: string[]) => void;
  length?: number;
};

export function InputOtp({ value, onChange, length = 6 }: InputOtpProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const updateOtpAt = (index: number, nextValue: string) => {
    const nextOtp = [...value];
    nextOtp[index] = nextValue;
    onChange(nextOtp);
  };

  const handleInputChange = (index: number, nextValue: string) => {
    if (!/^\d*$/.test(nextValue)) return;

    const nextDigit = nextValue.slice(-1);
    updateOtpAt(index, nextDigit);

    if (nextDigit && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const pastedData = event.clipboardData.getData("text").slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const nextOtp = Array.from(
      { length },
      (_, index) => pastedData[index] ?? "",
    );
    onChange(nextOtp);

    const nextEmptyIndex = nextOtp.findIndex((digit) => digit === "");
    focusInput(nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex);
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {value.map((digit, index) => (
        <Input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(event) => handleInputChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className="h-12 w-12 text-center text-lg font-semibold"
        />
      ))}
    </div>
  );
}
