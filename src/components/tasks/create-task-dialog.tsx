import { useEffect, useId, useState } from "react";
import { ClipboardList, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTask } from "@/features/tasks/hooks/useCreateTask";
import type { CreateTaskRequest } from "@/features/tasks/types";

type CreateTaskDialogProps = {
  listId: string;
  trigger?: React.ReactNode;
};

export function CreateTaskDialog({ listId, trigger }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  const nameId = `${formId}-name`;
  const descriptionId = `${formId}-description`;
  const { mutate: createTask, isPending } = useCreateTask(listId);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateTaskRequest>({
    mode: "onTouched",
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) reset({ name: "", description: "" });
  }, [open, reset]);

  const onSubmit = (data: CreateTaskRequest) => {
    createTask(data, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger === undefined ? (
          <Button size="sm">
            <Plus />
            New task
          </Button>
        ) : (
          trigger
        )}
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 space-y-0 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <ClipboardList
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle>Create new task</DialogTitle>
            <DialogDescription className="max-w-[34ch]">
              Add a task to this list so it appears immediately in the board.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              disabled={isPending}
              className="text-muted-foreground"
            >
              <X />
            </Button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <Label htmlFor={nameId}>Task name</Label>
              <Input
                id={nameId}
                autoFocus
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                placeholder="e.g. Draft onboarding flow"
                maxLength={255}
                {...register("name", {
                  required: "Task name is required",
                  maxLength: {
                    value: 255,
                    message: "Keep the task name under 255 characters.",
                  },
                })}
              />
              <FieldError
                errors={[errors.name]}
                className="text-[12px] leading-relaxed"
              />
            </Field>

            <Field data-invalid={Boolean(errors.description)}>
              <div className="flex items-center justify-between">
                <Label htmlFor={descriptionId}>Description</Label>
                <span className="text-[11.5px] text-muted-foreground">
                  Optional
                </span>
              </div>
              <Textarea
                id={descriptionId}
                aria-invalid={Boolean(errors.description)}
                placeholder="Add context, checklist, or notes for this task"
                rows={4}
                maxLength={2000}
                className="resize-none"
                {...register("description", {
                  maxLength: {
                    value: 2000,
                    message: "Keep the description under 2000 characters.",
                  },
                })}
              />
              <FieldError
                errors={[errors.description]}
                className="text-[12px] leading-relaxed"
              />
            </Field>
          </FieldGroup>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="ghost"
              type="button"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} aria-live="polite">
              {isPending ? "Creating" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
