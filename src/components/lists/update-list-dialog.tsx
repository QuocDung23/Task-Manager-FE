import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateList } from "@/features/lists/hooks/useUpdateList";
import type { ListResponse, UpdateListRequest } from "@/features/lists/types";
import { Pencil } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

interface UpdateListDialogProps {
  list: ListResponse;
  boardId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UpdateListDialog({
  list,
  boardId,
  open,
  onOpenChange,
}: UpdateListDialogProps) {
  const { mutate: updateList, isPending } = useUpdateList(boardId);

  const form = useForm<UpdateListRequest>({
    defaultValues: {
      name: list.name,
      description: list.description || "",
    },
  });

  const onSubmit = (data: UpdateListRequest) => {
    updateList(
      { id: list.id, data },
      {
        onSuccess: () => {
          onOpenChange?.(false);
        },
      },
    );
  };

  useEffect(() => {
    if (open) {
      form.reset({
        name: list.name,
        description: list.description || "",
      });
    }
  }, [open, list.name, list.description, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border border-zinc-200 bg-white p-6 sm:max-w-md dark:border-zinc-800 dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-zinc-500" />
            Edit list
          </DialogTitle>
          <DialogDescription className="text-sm">
            Tune the name and description for this lane.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-sm">
                List name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="Enter list name..."
                {...form.register("name", {
                  required: "List name is required",
                  maxLength: {
                    value: 255,
                    message: "List name must be 255 characters or less",
                  },
                })}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </Field>

            <Field className="space-y-1.5">
              <Label
                htmlFor="edit-description"
                className="text-sm text-zinc-700"
              >
                Description
              </Label>
              <Textarea
                id="edit-description"
                className="min-h-20"
                placeholder="Description (optional)..."
                rows={3}
                {...form.register("description", {
                  maxLength: {
                    value: 2000,
                    message: "Description must be 2000 characters or less",
                  },
                })}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </Field>
          </FieldGroup>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="h-10 flex-1">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
