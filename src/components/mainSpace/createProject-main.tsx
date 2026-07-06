import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProject } from "@/features/projects/hooks/useCreateProject";
import type { ProjectRequest } from "@/features/projects/types";
import { FolderPlus, LucideSquarePlus } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface CreateProjectDialogProps {
  trigger?: ReactElement;
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: createProject, isPending } = useCreateProject();

  const formInputProject = useForm<ProjectRequest>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: ProjectRequest) => {
    createProject(data, {
      onSuccess: () => {
        formInputProject.reset();
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            aria-label="Create project"
            className="flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors w-17 h-15 p-0"
          >
            <LucideSquarePlus />
          </Button>
        )}
      </DialogTrigger>

      {/* Content */}
      <DialogContent className="rounded-2xl border border-zinc-200 bg-[#FFFFFF] p-6 shadow-lg sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <FolderPlus className="h-5 w-5 text-zinc-600" />
            </div>

            <div>
              <DialogTitle className="text-lg font-semibold ">
                Create new project
              </DialogTitle>
              <DialogDescription className="text-sm">
                Fill in the information below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form
          onSubmit={formInputProject.handleSubmit(onSubmit)}
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
                {...formInputProject.register("name", { required: true })}
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
                {...formInputProject.register("description")}
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
              {isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
