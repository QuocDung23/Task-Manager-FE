import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import { useUpdateUser } from "@/features/users/hooks/useUpdateUser";
import { ProfileHeader } from "./profile-header";
import { ProfileInfo } from "./profile-info";
import { EditForm } from "./edit-form";

export function ViewProfileUser({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: userRes, isLoading } = useCurrentUser();
  const updateUser = useUpdateUser();
  const user = userRes?.data;

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    address: "",
    phoneNumber: "",
  });
  const [edit, setEdit] = useState(false);

  const handleEditOpen = () => {
    setFormData({
      name: user?.name || "",
      bio: user?.bio || "",
      address: user?.address || "",
      phoneNumber: user?.phoneNumber?.toString() || "",
    });
    setEdit(true);
  };

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({
        name: formData.name,
        bio: formData.bio || null,
        address: formData.address || null,
        phoneNumber: formData.phoneNumber ? Number(formData.phoneNumber) : null,
      });
      setEdit(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setEdit(false);
  };

  const displayUser = {
    name: user?.name || "No name",
    email: user?.email || "No email",
    bio: user?.bio || "No bio",
    avatar: user?.avatar || null,
    address: user?.address || "No address",
    phoneNumber: user?.phoneNumber?.toString() ?? "No phone",
    phoneNumberRaw: user?.phoneNumber?.toString() ?? "",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[480px]">
        <ProfileHeader
          user={displayUser}
          edit={edit}
          isLoading={isLoading}
          onEdit={handleEditOpen}
        />

        <Separator />

        <div className="px-6 py-4">
          {edit ? (
            <EditForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleSave}
              onCancel={() => setEdit(false)}
              isSaving={updateUser.isPending}
            />
          ) : (
            <ProfileInfo user={displayUser} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
