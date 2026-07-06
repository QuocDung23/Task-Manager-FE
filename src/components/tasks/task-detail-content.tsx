import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  CalendarDays,
  Check,
  Pencil,
  Trash2,
  LucideUser,
  LucideUsers,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import type { TaskResponse } from "@/features/tasks/types";

function formatDateField(dateStr: string | undefined): string {
  if (!dateStr) return "Not set";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStatus(status: string | undefined): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatTaskCode(id: string): string {
  const compact = id.replace(/-/g, "").toUpperCase();
  if (!compact) return "TSK";
  if (compact.length <= 8) return `TSK-${compact}`;
  return `TSK-${compact.slice(0, 4)}-${compact.slice(-2)}`;
}

type TaskDetailContentProps = {
  task: TaskResponse;
  isOpen: boolean;
  closeTask: () => void;
};

export default function TaskDetailContent({
  task,
  isOpen,
  closeTask,
}: TaskDetailContentProps) {
  const [nameValue, setNameValue] = useState(task.name);
  const [descValue, setDescValue] = useState(task.description ?? "");
  const [dueDateValue, setDueDateValue] = useState(
    task.dueDate ? task.dueDate.split("T")[0] : "",
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);

  const listId = task?.listId ?? "";
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask(listId);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDesc && descTextareaRef.current) {
      descTextareaRef.current.focus();
    }
  }, [isEditingDesc]);

  useEffect(() => {
    if (isEditingDueDate && dueDateInputRef.current) {
      dueDateInputRef.current.focus();
    }
  }, [isEditingDueDate]);

  const saveName = () => {
    if (!task) return;
    setIsEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== task.name) {
      updateTask(
        { taskId: task.id, data: { name: trimmed } },
        {
          onSuccess: (res) => {
            setNameValue(res.data.name);
          },
        },
      );
    } else {
      setNameValue(task.name);
    }
  };

  const saveDescription = () => {
    if (!task) return;
    setIsEditingDesc(false);
    const trimmed = descValue.trim();
    if (trimmed !== (task.description ?? "")) {
      updateTask(
        { taskId: task.id, data: { description: trimmed || undefined } },
        {
          onSuccess: (res) => {
            setDescValue(res.data.description ?? "");
          },
        },
      );
    }
  };

  const saveDueDate = () => {
    if (!task) return;
    setIsEditingDueDate(false);
    const formatted = dueDateValue
      ? new Date(dueDateValue).toISOString()
      : undefined;
    if (formatted !== task.dueDate) {
      updateTask(
        { taskId: task.id, data: { dueDate: formatted } },
        {
          onSuccess: (res) => {
            setDueDateValue(
              res.data.dueDate ? res.data.dueDate.split("T")[0] : "",
            );
          },
        },
      );
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const isActive = task.status === "ACTIVE";
  const taskCode = formatTaskCode(task.id);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeTask()}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-0 text-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1  sm:max-w-[680px] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] dark:ring-white/10"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{task.name}</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5 sm:px-8 dark:border-zinc-800">
              <div className="rounded-xl"/>
              {isEditingName ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Input
                    ref={nameInputRef}
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") {
                        setNameValue(task.name);
                        setIsEditingName(false);
                      }
                    }}
                    className="h-10 min-w-0 border-zinc-200 bg-zinc-50 px-3 font-heading text-xl font-semibold leading-tight text-zinc-950 shadow-none focus-visible:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-700"
                    disabled={isUpdating}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={saveName}
                    disabled={isUpdating}
                    className="shrink-0 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                    aria-label="Save task name"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setNameValue(task.name);
                      setIsEditingName(false);
                    }}
                    className="shrink-0 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                    aria-label="Cancel task name edit"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="group/title min-w-0 flex-1 rounded-lg text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <h2 className="truncate font-heading text-xl font-semibold leading-tight text-zinc-900 transition-colors group-hover/title:text-zinc-700 dark:text-zinc-50 dark:group-hover/title:text-zinc-200">
                    {task.name}
                  </h2>
                </button>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-8">
              <section>
                <span className="mb-4 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                  Details
                </span>

                <div className="grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                      <Check className="h-3.5 w-3.5" />
                      <span>Status</span>
                    </div>
                    <div
                      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                        isActive
                          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                          : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isActive ? "bg-emerald-500" : "bg-zinc-400"
                        }`}
                      />
                      {formatStatus(task.status)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Due Date</span>
                    </div>
                    {isEditingDueDate ? (
                      <div className="flex items-center gap-2">
                        <Input
                          ref={dueDateInputRef}
                          type="date"
                          value={dueDateValue}
                          onChange={(e) => setDueDateValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveDueDate();
                            if (e.key === "Escape") {
                              setDueDateValue(
                                task.dueDate ? task.dueDate.split("T")[0] : "",
                              );
                              setIsEditingDueDate(false);
                            }
                          }}
                          className="h-10 rounded-lg border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm focus-visible:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus-visible:ring-zinc-700"
                          disabled={isUpdating}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={saveDueDate}
                          disabled={isUpdating}
                          aria-label="Save due date"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setDueDateValue(
                              task.dueDate ? task.dueDate.split("T")[0] : "",
                            );
                            setIsEditingDueDate(false);
                          }}
                          disabled={isUpdating}
                          aria-label="Cancel due date edit"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditingDueDate(true)}
                        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-sm font-medium shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
                          isOverdue
                            ? "border-red-200 text-red-500 dark:border-red-400/30 dark:text-red-300"
                            : task.dueDate
                              ? "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200"
                              : "border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500"
                        }`}
                      >
                        <span>{formatDateField(task.dueDate)}</span>
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                      <LucideUsers className="h-3.5 w-3.5" />
                      <span>Assignees</span>
                    </div>
                    {task.assign && task.assign.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {task.assign.map((user, i) => (
                          <span
                            key={`${user}-${i}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800"
                          >
                            <LucideUser className="h-3.5 w-3.5" />
                            {user}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-sm font-semibold italic text-zinc-300 dark:text-zinc-600">
                        <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-700">
                          <LucideUsers className="h-3.5 w-3.5" />
                        </span>
                        No assignees
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-7">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                    Description
                  </span>
                  {!isEditingDesc && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsEditingDesc(true)}
                      className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                      aria-label="Edit description"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {isEditingDesc ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={descTextareaRef}
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      placeholder="Add a description..."
                      rows={4}
                      className="min-h-28 resize-none rounded-xl border-zinc-200 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-700 shadow-none focus-visible:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:focus-visible:ring-zinc-700"
                      disabled={isUpdating}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={saveDescription}
                        disabled={isUpdating}
                        className="gap-1.5 rounded-lg"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDescValue(task.description ?? "");
                          setIsEditingDesc(false);
                        }}
                        disabled={isUpdating}
                        className="rounded-lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-28 w-full rounded-xl border border-transparent bg-zinc-50/80 px-4 py-4 text-left transition-colors hover:border-zinc-200 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/70 dark:hover:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    {task.description ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {task.description}
                      </p>
                    ) : (
                      <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
                        Click to add a description...
                      </p>
                    )}
                  </button>
                )}
              </section>
            </div>

            <footer className="flex shrink-0 flex-col gap-3 border-t border-zinc-100 bg-zinc-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-zinc-800 dark:bg-zinc-900/60">
              <span
                className="truncate text-[11px] font-semibold text-zinc-300 dark:text-zinc-600"
                title={task.id}
              >
                ID: {taskCode}
              </span>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg px-3 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  onClick={closeTask}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 rounded-lg border border-red-200 bg-red-50 px-4 font-semibold text-red-500 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete this task
                </Button>
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteTaskDialog
        task={task}
        listId={task.listId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={closeTask}
      />
    </>
  );
}
