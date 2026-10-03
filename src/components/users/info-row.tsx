import type { ReactNode } from "react";
import { useLocale, useT } from "@/services/i18n";

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium text-muted-foreground ${locale === "vi" ? "tracking-normal" : "uppercase tracking-wider"}`}>
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm text-foreground">{value || t("profile.notSet")}</p>
      </div>
    </div>
  );
}
