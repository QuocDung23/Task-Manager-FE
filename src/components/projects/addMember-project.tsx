import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { useUsers } from "@/features/users/hooks/useUsers";
import { useAddMemberProject } from "@/features/projects/hooks/useAddMemberProject";
import { CheckCircle2, Loader2 } from "lucide-react";

interface AddMemberProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DialogAddMemberProject({
  projectId,
  open,
  onOpenChange,
}: AddMemberProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(searchEmail), 500);
    return () => clearTimeout(timer);
  }, [searchEmail]);

  useEffect(() => {
    if (!open) {
      setSearchEmail("");
      setDebouncedEmail("");
      setSelectedUserId(null);
    }
  }, [open]);

  const { data: usersResponse, isLoading: isLoadingUsers } =
    useUsers(debouncedEmail);
  const users = usersResponse?.data || [];
  const { mutate: addMember, isPending } = useAddMemberProject();

  const handleAdd = () => {
    if (!selectedUserId) return;
    addMember(
      { projectId, data: { userId: selectedUserId } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
        <div className="relative">
    <Input
      placeholder="Tìm kiếm theo email..."
      value={searchEmail}
      onChange={(e) => setSearchEmail(e.target.value)}
    />
    
    {debouncedEmail && (
      <div className="relative">
        <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto border border-zinc-200 rounded-md p-2 bg-white">
          {isLoadingUsers ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-zinc-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-4 text-zinc-500 text-sm">Không tìm thấy người dùng hợp lệ</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                  selectedUserId === user.id
                    ? "bg-primary/5 border-primary border"
                    : "hover:bg-zinc-50 border border-transparent"
                }`}
              >
                <div className="flex flex-col overflow-hidden mr-2">
                  <span className="font-semibold text-sm text-zinc-900 truncate">
                    {user.email || "Chưa cập nhật email"}
                  </span>
                  <span className="text-xs text-zinc-500 mt-0.5 truncate">
                    {user.name}
                  </span>
                </div>
                {selectedUserId === user.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )}
  </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedUserId || isPending}>
            {isPending ? "Loading..." : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
