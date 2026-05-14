import { Camera, PencilIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import type { ProfileUser } from "./profile-info";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useUpdateMyAvatar } from "@/features/users/hooks/useUpdateMyAvatart";

interface ProfileHeaderProps {
  user: ProfileUser;
  edit: boolean;
  isLoading: boolean;
  onEdit: () => void;
}

export function ProfileHeader({
  user,
  edit,
  isLoading,
  onEdit,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { mutate: updateMyAvatar, isPending: uploadingAvatar } =
    useUpdateMyAvatar();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypesImg = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ].includes(file.type);
    if (!validTypesImg) {
      toast.error("Please select a valid image file (jpeg, png, gif, webp)");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    updateMyAvatar(
      { file, previewUrl },
      {
        onError: () => {
          setAvatarPreview(null);
          URL.revokeObjectURL(previewUrl);
        },
      },
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClickAvatar = () => {
    if (!uploadingAvatar) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      {/* Cover gradient */}
      <div className="relative h-32 from-zinc-300 bg-linear-to-br via-zinc-200 to-zinc-100 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900" />

      {/* Avatar + name block */}
      <div className="relative px-6 pb-6">
        <div className="-mt-20 mb-4 flex items-end justify-between">
          <div
            className="group relative cursor-pointer"
            onClick={handleClickAvatar}
          >
            <Avatar className="ring-4 ring-background size-35">
              <AvatarImage
                src={avatarPreview || user.avatar || ""}
                alt={user.name}
              />
              <AvatarFallback className="text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileChange}
              disabled={uploadingAvatar}
            />
          </div>
          {!edit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="mb-1.5 gap-1.5"
              type="button"
            >
              <PencilIcon className="size-3.5" />
              Edit
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold leading-tight text-foreground">
              {user.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </>
        )}
      </div>
    </>
  );
}
