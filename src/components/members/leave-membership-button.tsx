import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/services/i18n";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import { useLeaveProject } from "@/features/projects/hooks/useLeaveProject";
import { useLeaveBoard } from "@/features/boards/hooks/useLeaveBoard";
import { boardApi } from "@/features/boards/api/board-api";

type ControlledProps = { open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean };
type Props = ControlledProps & ({ scope: "project"; id: string; ownerUserId: string } | { scope: "board"; id: string; projectId: string; ownerUserId: string });

export function LeaveMembershipButton(props: Props) {
  const t = useT();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = props.onOpenChange ?? setInternalOpen;
  const currentUser = useCurrentUser();
  const leaveProject = useLeaveProject();
  const leaveBoard = useLeaveBoard(props.scope === "board" ? props.projectId : "");
  const isOwner = !currentUser.data?.data?.id || currentUser.data.data.id === props.ownerUserId;
  const isPending = props.scope === "project" ? leaveProject.isPending : leaveBoard.isPending;
  if (isOwner) return null;

  const handleLeave = async () => {
    try {
      if (props.scope === "project") {
        await leaveProject.mutateAsync(props.id);
        navigate("/projects", { replace: true });
      } else {
        await leaveBoard.mutateAsync(props.id);
        try {
          await boardApi.getById(props.id);
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 403 || status === 404) navigate(`/project/${props.projectId}`, { replace: true });
        }
      }
      setOpen(false);
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404 && props.scope === "project") {
        navigate("/projects", { replace: true });
        setOpen(false);
      } else if (status === 404 && props.scope === "board") {
        try {
          await boardApi.getById(props.id);
        } catch (accessError) {
          const accessStatus = (accessError as { response?: { status?: number } }).response?.status;
          if (accessStatus === 403 || accessStatus === 404) navigate(`/project/${props.projectId}`, { replace: true });
        }
        setOpen(false);
      }
    }
  };

  return <>
    {props.hideTrigger ? null : <Button type="button" variant="ghost" size="sm" className="gap-2 rounded-full text-destructive hover:text-destructive" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}><LogOut className="size-4" />{props.scope === "project" ? t("leave.project") : t("leave.board")}</Button>}
    <Dialog open={open} onOpenChange={(value) => { if (!isPending) setOpen(value); }}>
      <DialogContent className="max-w-sm rounded-3xl p-1.5"><div className="rounded-[calc(1.5rem-0.375rem)] bg-card p-6"><DialogHeader><DialogTitle>{props.scope === "project" ? t("leave.projectTitle") : t("leave.boardTitle")}</DialogTitle><DialogDescription className="pt-2 leading-relaxed">{props.scope === "project" ? t("leave.projectHelp") : t("leave.boardHelp")}</DialogDescription></DialogHeader><DialogFooter className="mt-6 flex gap-2"><Button variant="outline" className="rounded-full" disabled={isPending} onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button variant="destructive" className="rounded-full" disabled={isPending} onClick={() => void handleLeave()}>{isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}{props.scope === "project" ? t("leave.project") : t("leave.board")}</Button></DialogFooter></div></DialogContent>
    </Dialog>
  </>;
}
