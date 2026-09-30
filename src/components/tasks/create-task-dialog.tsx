import { useClearOnLocaleChange } from "@/services/i18n";
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
import { useT } from "@/services/i18n";

type CreateTaskDialogProps = {
  listId: string;
  trigger?: React.ReactNode;
};

export function CreateTaskDialog({ listId, trigger }: CreateTaskDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const formId = useId();
  const nameId = `${formId}-name`;
  const descriptionId = `${formId}-description`;
  const { mutate: createTask, isPending } = useCreateTask(listId);

  const {
    formState: { errors },
    clearErrors,
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
  useClearOnLocaleChange(() => clearErrors());

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
            {t("task.new")}
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
            <DialogTitle>{t("task.createTitle")}</DialogTitle>
            <DialogDescription className="max-w-[34ch]">
              {t("task.createHelp")}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("crud.close")}
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
              <Label htmlFor={nameId}>{t("task.name")}</Label>
              <Input
                id={nameId}
                autoFocus
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                placeholder={t("task.namePlaceholder")}
                maxLength={255}
                {...register("name", {
                  required: t("task.nameRequired"),
                  maxLength: {
                    value: 255,
                    message: t("task.nameLength"),
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
                <Label htmlFor={descriptionId}>{t("crud.description")}</Label>
                <span className="text-[11.5px] text-muted-foreground">
                  {t("crud.optional")}
                </span>
              </div>
              <Textarea
                id={descriptionId}
                aria-invalid={Boolean(errors.description)}
                placeholder={t("task.descriptionPlaceholder")}
                rows={4}
                maxLength={2000}
                className="resize-none"
                {...register("description", {
                  maxLength: {
                    value: 2000,
                    message: t("task.descriptionLength"),
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
              {t("crud.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} aria-live="polite">
              {isPending ? t("crud.creating") : t("task.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
