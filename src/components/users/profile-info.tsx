import { MapPin, Phone, FileText } from "lucide-react";
import { Separator } from "../ui/separator";
import { InfoRow } from "./info-row";

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
  return (
    <div className="space-y-1 rounded-xl border border-border bg-muted/30 p-3">
      <InfoRow
        icon={<MapPin className="size-4" />}
        label="Address"
        value={user.address}
      />
      <Separator className="my-1" />
      <InfoRow
        icon={<Phone className="size-4" />}
        label="Phone"
        value={user.phoneNumberRaw?.toString() || "—"}
      />
      <Separator className="my-1" />
      <InfoRow
        icon={<FileText className="size-4" />}
        label="Bio"
        value={user.bio}
      />
    </div>
  );
}
