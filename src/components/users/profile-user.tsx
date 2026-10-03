import { TranslateText } from "@/services/i18n";
import { useT } from "@/services/i18n";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import { useUpdateUser } from "@/features/users/hooks/useUpdateUser";
import { ProfileHeader } from "./profile-header";
import { ProfileInfo } from "./profile-info";
import { EditForm } from "./edit-form";
import { ChangePasswordForm } from "./change-password-form";

type ProfileTab = "profile" | "password";

export function ViewProfileUser({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("profile");
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
    if (!isOpen) {
      setEdit(false);
      setTab("profile");
    }
  };

  // `edit` is only meaningful on the "profile" tab: leaving it clears the edit
  // state so returning never shows a stale edit form.
  const handleTabChange = (value: string) => {
    setTab(value as ProfileTab);
    if (value !== "profile") setEdit(false);
  };

  const displayUser = {
    name: user?.name || t("profile.noName"),
    email: user?.email || t("profile.noEmail"),
    bio: user?.bio || t("profile.noBio"),
    avatar: user?.avatar || null,
    address: user?.address || t("profile.noAddress"),
    phoneNumber: user?.phoneNumber?.toString() ?? t("profile.noPhone"),
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
          showEditButton={tab === "profile"}
        />

        <Separator />

        <Tabs value={tab} onValueChange={handleTabChange} className="gap-0">
          <div className="px-6 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="profile"><TranslateText id="profile.profile" /></TabsTrigger>
              <TabsTrigger value="password"><TranslateText id="profile.password" /></TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="px-6 py-4">
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
          </TabsContent>

          <TabsContent value="password" className="px-6 py-4">
            <ChangePasswordForm onCancel={() => setTab("profile")} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
