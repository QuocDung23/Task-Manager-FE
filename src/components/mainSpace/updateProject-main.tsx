import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateProject } from "@/features/projects/hooks/useUpdateProject";
import { Label } from "../ui/label";
import { FolderPlus } from "lucide-react";
import { Field, FieldGroup } from "../ui/field";
import { useEffect } from "react";
import type { ProjectResponse } from "@/features/projects/types";

type UpdateProjectDialogProps = {
  project: ProjectResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpdateProjectDialog({
  project,
  open,
  onOpenChange,
}: UpdateProjectDialogProps) {
  const { mutate: update, isPending } = useUpdateProject();

  const formInputUpdate = useForm<{
    name: string;
    description?: string;
  }>({
    defaultValues: {
      name: project.name,
      description: project.description || "",
    },
  });

  const {reset} = formInputUpdate

  useEffect(() => {
    if(open && project) {
      reset({
        name: project.name,
        description: project.description || "",
      })
    }
  }, [open, project, reset])

  const onSubmit = (values: { name: string; description?: string }) => {
    update(
      { id: project.id, data: values },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Content */}
      <DialogContent className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <FolderPlus className="h-5 w-5 text-zinc-600" />
            </div>

            <div>
              <DialogTitle className="text-lg font-semibold ">
                Edit Project
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form
          onSubmit={formInputUpdate.handleSubmit(onSubmit)}
          className="mt-4 space-y-5"
        >
          <FieldGroup className="space-y-4">
            {/* Name */}
            <Field className="space-y-1.5">
              <Label htmlFor="name" className="text-sm ">
                Project name
              </Label>
              <Input
                id="name"
                placeholder="Enter project name..."
                {...formInputUpdate.register("name", { required: true })}
              />
            </Field>

            {/* Description */}
            <Field className="space-y-1.5">
              <Label htmlFor="description" className="text-sm text-zinc-700">
                Description
              </Label>
              <Input
                id="description"
                placeholder="Description..."
                {...formInputUpdate.register("description")}
              />
            </Field>
          </FieldGroup>

          {/* Footer */}
          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full text-white hover:bg-zinc-800"
            >
              {isPending ? "Update..." : "Update Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
