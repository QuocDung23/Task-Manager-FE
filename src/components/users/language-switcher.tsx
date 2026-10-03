import { Check, Translate } from "@phosphor-icons/react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLocale, useT, type Locale } from "@/services/i18n";
import { toast } from "sonner";

const options: { locale: Locale; label: string }[] = [
  { locale: "en", label: "English" },
  { locale: "vi", label: "Tiếng Việt" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const handleSelect = (next: Locale) => {
    if (next === locale) return;
    toast.dismiss();
    setLocale(next);
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-card/95 p-1 shadow-[0_12px_35px_-20px_rgba(0,0,0,0.45)] ring-1 ring-border/70" role="group" aria-label={t("common.language")}>
        {options.map((option) => (
          <button key={option.locale} type="button" lang={option.locale} aria-pressed={locale === option.locale}
            onClick={() => handleSelect(option.locale)}
            className={`min-h-9 rounded-full px-3 text-xs font-medium transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${locale === option.locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="px-2 py-1.5" role="group" aria-label={t("common.language")}>
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
        <Translate size={16} weight="light" aria-hidden />
        <span>{t("common.language")}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
        {options.map((option) => (
          <DropdownMenuItem key={option.locale} onSelect={(event) => { event.preventDefault(); handleSelect(option.locale); }}
            lang={option.locale} aria-checked={locale === option.locale} role="menuitemradio"
            className={`min-h-9 justify-center gap-1.5 rounded-md px-2 text-xs cursor-pointer transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${locale === option.locale ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {option.label}{locale === option.locale && <Check size={13} weight="bold" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </div>
    </div>
  );
}
