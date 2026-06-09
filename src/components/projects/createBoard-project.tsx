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
import { useCreateBoard } from "@/features/boards/hooks/useCreateBoard";
import type { BoardRequest } from "@/features/boards/types";
import type { ProjectRequest } from "@/features/projects/types";
import { FolderPlus, LucideSquarePlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";

export function CreateBoardDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: createBoard, isPending } = useCreateBoard();
  const { projectId } = useParams<{ projectId: string }>();

  const formInputBoard = useForm<ProjectRequest>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: BoardRequest) => {
    if (!projectId) return;
    createBoard(
      { data, projectId },
      {
        onSuccess: () => {
          formInputBoard.reset();
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors w-17 h-15 p-0">
          <LucideSquarePlus />
        </Button>
      </DialogTrigger>

      {/* Content */}
      <DialogContent className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <FolderPlus className="h-5 w-5 text-zinc-600" />
            </div>

            <div>
              <DialogTitle className="text-lg font-semibold ">
                Create new board
              </DialogTitle>
              <DialogDescription className="text-sm">
                Fill in the information below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form
          onSubmit={formInputBoard.handleSubmit(onSubmit)}
          className="mt-4 space-y-5"
        >
          <FieldGroup className="space-y-4">
            {/* Name */}
            <Field className="space-y-1.5">
              <Label htmlFor="name" className="text-sm ">
                Board name
              </Label>
              <Input
                id="name"
                placeholder="Enter project name..."
                {...formInputBoard.register("name", { required: true })}
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
                {...formInputBoard.register("description")}
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
              {isPending ? "Creating..." : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
