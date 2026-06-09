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
import { useCreateList } from "@/features/lists/hooks/useCreateList";
import type { CreateListRequest } from "@/features/lists/types";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";

interface CreateListDialogProps {
  boardId: string;
}

export function CreateListDialog({ boardId }: CreateListDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: createList, isPending } = useCreateList(boardId);

  const form = useForm<CreateListRequest>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: CreateListRequest) => {
    createList(data, {
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
          className="mt-5 flex w-72 min-w-72 min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 text-muted-foreground transition-all duration-150 hover:border-muted-foreground/40 hover:bg-secondary/50 hover:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium">Add another list</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new list</DialogTitle>
          <DialogDescription>
            Fill in the information below to add a new list to this board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <Label htmlFor="name">
                List name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. To Do, In Progress, Done"
                {...form.register("name", {
                  required: "List name is required",
                  maxLength: {
                    value: 255,
                    message: "List name must be 255 characters or less",
                  },
                })}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </Field>

            <Field className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this list (optional)"
                rows={3}
                {...form.register("description", {
                  maxLength: {
                    value: 2000,
                    message: "Description must be 2000 characters or less",
                  },
                })}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </Field>
          </FieldGroup>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Creating..." : "Create List"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
