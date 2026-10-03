import { MapPin, Phone, FileText } from "lucide-react";
import { Separator } from "../ui/separator";
import { InfoRow } from "./info-row";
import { useT } from "@/services/i18n";

export interface ProfileUser {
  name: string;
  email: string;
  bio: string;
  avatar: string | null;
  address: string;
  phoneNumber: string;
  phoneNumberRaw: string | number;
}

interface ProfileInfoProps {
  user: ProfileUser;
}

export function ProfileInfo({ user }: ProfileInfoProps) {
  const t = useT();
  return (
    <div className="space-y-1 rounded-xl border border-border bg-muted/30 p-3">
      <InfoRow
        icon={<MapPin className="size-4" />}
        label={t("profile.address")}
        value={user.address}
      />
      <Separator className="my-1" />
      <InfoRow
        icon={<Phone className="size-4" />}
        label={t("profile.phone")}
        value={user.phoneNumberRaw?.toString() || t("profile.notSet")}
      />
      <Separator className="my-1" />
      <InfoRow
        icon={<FileText className="size-4" />}
        label={t("profile.bio")}
        value={user.bio}
      />
    </div>
  );
}
