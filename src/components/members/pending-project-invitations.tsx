import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/services/i18n";
import { formatDateTime } from "@/utils/formatDateTime";
import { usePendingProjectInvitations } from "@/features/projects/hooks/usePendingProjectInvitations";
import { useRevokeProjectInvitation } from "@/features/projects/hooks/useProjectInvitations";

export function PendingProjectInvitations({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const t = useT();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const query = usePendingProjectInvitations(projectId, enabled);
  const revoke = useRevokeProjectInvitation(projectId);
  if (!enabled) return null;
  return <section className="mt-1 border-t border-foreground/8 pt-4" aria-label={t("invitation.pendingTitle")}>
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t("invitation.pendingTitle")}</h3>
    {query.isLoading ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />{t("invitation.loading")}</p> : null}
    {query.isError ? <Button size="sm" variant="outline" onClick={() => void query.refetch()}><RefreshCw className="size-3.5" />{t("common.retry")}</Button> : null}
    {query.data?.data.length === 0 ? <p className="text-xs text-muted-foreground">{t("invitation.pendingEmpty")}</p> : null}
    <ul className="max-h-48 space-y-1 overflow-y-auto">
      {(query.data?.data ?? []).map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/45 px-3 py-2.5">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12.5px] font-medium">{invitation.inviteeName}</p><span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] text-primary">{t("invitation.pending")}</span></div><p className="truncate text-[11px] text-muted-foreground">{invitation.inviteeEmail} · {t("invitation.invitedBy", { name: invitation.invitedByName })}</p><p className="text-[10px] text-muted-foreground">{t("invitation.expires", { date: formatDateTime(invitation.expiresAt) })}</p></div>
        {confirmId === invitation.id ? <div className="w-full rounded-xl bg-destructive/5 p-2" role="alert"><p className="text-xs font-medium">{t("invitation.revokeTitle")}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("invitation.revokeHelp")}</p><div className="mt-2 flex justify-end gap-1"><Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => setConfirmId(null)}>{t("common.cancel")}</Button><Button size="sm" variant="destructive" disabled={revoke.isPending} onClick={async () => { try { await revoke.mutateAsync(invitation.id); setConfirmId(null); } catch { setConfirmId(null); } }}>{revoke.isPending && revoke.variables === invitation.id ? <Loader2 className="size-3.5 animate-spin" /> : null}{t("invitation.revoke")}</Button></div></div> : <Button size="sm" variant="ghost" className="text-destructive" aria-label={t("invitation.revoke")} onClick={() => setConfirmId(invitation.id)}>{t("invitation.revoke")}</Button>}
      </li>)}
    </ul>
  </section>;
}
