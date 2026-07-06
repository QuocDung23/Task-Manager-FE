import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateTask } from "@/features/tasks/hooks/useCreateTask";
import type { CreateTaskRequest } from "@/features/tasks/types";

type CreateTaskDialogProps = {
  listId: string;
};

export function CreateTaskDialog({ listId }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: createTask, isPending } = useCreateTask(listId);

  const form = useForm<CreateTaskRequest>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: CreateTaskRequest) => {
    createTask(data, {
      onSuccess: () => {
        form.reset();
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border/80 bg-background/70 px-3 py-3 text-left text-sm text-muted-foreground transition-all duration-150 hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Plus className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">Add task</p>
            <p className="text-xs text-muted-foreground">Create a new task in this list</p>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new task</DialogTitle>
          <DialogDescription>
            Add a task to this list so it appears immediately in the board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <Label htmlFor="task-name">
                Task name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-name"
                placeholder="e.g. Draft onboarding flow"
                {...form.register("name", {
                  required: "Task name is required",
                  maxLength: {
                    value: 255,
                    message: "Task name must be 255 characters or less",
                  },
                })}
              />
              {form.formState.errors.name ? (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </Field>

            <Field className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Add context, checklist, or notes for this task"
                rows={4}
                {...form.register("description", {
                  maxLength: {
                    value: 2000,
                    message: "Description must be 2000 characters or less",
                  },
                })}
              />
              {form.formState.errors.description ? (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </Field>
          </FieldGroup>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
