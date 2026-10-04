import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MailOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/services/i18n";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  useAcceptProjectInvitation,
  useDeclineProjectInvitation,
  useMyProjectInvitations,
} from "@/features/projects/hooks/useProjectInvitations";
import type { ProjectInvitationResponse } from "@/features/projects/types";

export function InvitationInbox({ selectedId, onNavigate }: { selectedId: string | null; onNavigate?: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const query = useMyProjectInvitations();
  const accept = useAcceptProjectInvitation();
  const decline = useDeclineProjectInvitation();
  const selectedRef = useRef<HTMLLIElement>(null);
  const [now, setNow] = useState<number | null>(null);
  const invitations = query.data?.data ?? [];

  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (selectedId) selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, invitations.length]);

  const handleAction = async (action: "accept" | "decline", invitation: ProjectInvitationResponse) => {
    try {
      if (action === "accept") await accept.mutateAsync(invitation.id);
      else await decline.mutateAsync(invitation.id);
    } catch {
      // Mutation displays a localized error and refreshes the server status.
    }
  };

  if (query.isLoading) return <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t("invitation.loading")}</div>;
  if (query.isError) return <div className="space-y-3 px-5 py-8 text-sm"><p>{t("invitation.actionFailed")}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}><RefreshCw className="size-4" />{t("common.retry")}</Button></div>;

  return <div className="space-y-3 p-3">
    {selectedId && !invitations.some((item) => item.id === selectedId) ?
      <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">{t("invitation.unavailable")} <button type="button" className="ml-1 underline" onClick={() => void query.refetch()}>{t("common.retry")}</button></div> : null}
    {invitations.length === 0 ? <div className="grid min-h-52 place-items-center text-center text-sm text-muted-foreground"><div><MailOpen className="mx-auto mb-3 size-5" />{t("invitation.inboxEmpty")}</div></div> : null}
    <ul className="space-y-2">
      {invitations.map((invitation) => {
        const isExpired = now !== null && new Date(invitation.expiresAt).getTime() <= now;
        const canRespond = now !== null && invitation.status === "PENDING" && !isExpired;
        const isBusy = (accept.isPending && accept.variables === invitation.id) || (decline.isPending && decline.variables === invitation.id);
        const status = isExpired && invitation.status === "PENDING" ? "EXPIRED" : invitation.status;
        const statusKey = status.toLowerCase() as "pending" | "accepted" | "declined" | "revoked" | "expired";
        return <li key={invitation.id} ref={selectedId === invitation.id ? selectedRef : undefined} className={`rounded-2xl p-1 ring-1 ${selectedId === invitation.id ? "bg-primary/8 ring-primary/25" : "bg-foreground/3 ring-foreground/6"}`}>
          <div className="rounded-[calc(1rem-0.25rem)] bg-card px-4 py-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{invitation.projectName}</p><p className="mt-1 text-xs text-muted-foreground">{t("invitation.invitedBy", { name: invitation.invitedByName })}</p></div><span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{t(`invitation.${statusKey}`)}</span></div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("invitation.expires", { date: formatDateTime(invitation.expiresAt) })}</p>
            {canRespond ? <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" className="rounded-full" disabled={isBusy} onClick={() => void handleAction("accept", invitation)}>{isBusy && accept.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}{t("invitation.accept")}</Button><Button size="sm" variant="outline" className="rounded-full" disabled={isBusy} onClick={() => void handleAction("decline", invitation)}>{isBusy && decline.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}{t("invitation.decline")}</Button></div> : null}
            {status === "ACCEPTED" ? <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => { navigate(`/project/${invitation.projectId}`); onNavigate?.(); }}>{t("invitation.openProject")}</Button> : null}
          </div>
        </li>;
      })}
    </ul>
  </div>;
}
