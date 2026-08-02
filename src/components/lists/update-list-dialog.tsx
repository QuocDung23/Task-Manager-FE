import { useEffect, useId } from "react";
import { ArrowRight, ListPlus, Loader2, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateList } from "@/features/lists/hooks/useUpdateList";
import type { ListResponse, UpdateListRequest } from "@/features/lists/types";
import {
  EASE_FLUID,
  SPRING_PRESS,
  enterTransitionFor,
  iconHover,
  iconTap,
  pressHover,
  pressTap,
} from "@/lib/motion";

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
  const reduceMotion = useReducedMotion();
  const formId = useId();
  const nameId = `${formId}-name`;
  const { mutate: updateList, isPending } = useUpdateList(boardId);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<UpdateListRequest>({
    mode: "onTouched",
    defaultValues: {
      name: list.name,
      description: list.description || "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: list.name,
        description: list.description || "",
      });
    }
  }, [open, list.name, list.description, reset]);

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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange?.(nextOpen);
  };

  const enterTransition = enterTransitionFor(reduceMotion);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-3xl border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-122"
      >
        <div className="rounded-3xl p-1.5">
          <div className="overflow-hidden rounded-[calc(1.5rem-0.375rem)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_32px_80px_-32px_rgba(15,23,42,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_32px_80px_-32px_rgba(0,0,0,0.65)]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enterTransition}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7"
            >
              <div className="rounded-2xl bg-primary/10 p-1.5 ring-1 ring-inset ring-primary/15">
                <div className="grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <ListPlus
                    className="size-5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <DialogHeader className="min-w-0 gap-1.5 pt-0.5 text-left">
                <DialogTitle className="font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[20px]">
                  Edit list
                </DialogTitle>
                <DialogDescription className="max-w-[34ch] text-[13px] font-normal leading-relaxed text-muted-foreground">
                  Rename the lane. Changes apply to every task inside it.
                </DialogDescription>
              </DialogHeader>

              <DialogClose asChild>
                <motion.button
                  type="button"
                  aria-label="Close"
                  disabled={isPending}
                  whileHover={iconHover(reduceMotion)}
                  whileTap={iconTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="grid size-9 place-items-center rounded-full bg-muted/70 text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden="true" />
                </motion.button>
              </DialogClose>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.6, delay: 0.06, ease: EASE_FLUID }
              }
              className="flex flex-col gap-5 px-5 pb-5 sm:px-7 sm:pb-7"
            >
              <FieldGroup className="gap-5">
                <Field data-invalid={Boolean(errors.name)} className="gap-2">
                  <Label
                    htmlFor={nameId}
                    className="text-[12.5px] font-medium text-foreground/85"
                  >
                    List name
                  </Label>
                  <Input
                    id={nameId}
                    autoFocus
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    placeholder="Enter list name"
                    maxLength={255}
                    className="h-12 rounded-2xl border border-foreground/8 bg-background/65 px-4 text-[13.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-background focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 aria-invalid:border-destructive/45 aria-invalid:ring-destructive/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    {...register("name", {
                      required: "List name is required",
                      maxLength: {
                        value: 255,
                        message: "Keep the list name under 255 characters.",
                      },
                    })}
                  />
                  <FieldError
                    errors={[errors.name]}
                    className="text-[12px] leading-relaxed"
                  />
                </Field>
              </FieldGroup>

              <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                <motion.button
                  type="button"
                  disabled={isPending}
                  onClick={() => onOpenChange?.(false)}
                  whileHover={pressHover(reduceMotion)}
                  whileTap={pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="h-11 whitespace-nowrap rounded-full px-5 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="submit"
                  disabled={isPending}
                  aria-live="polite"
                  whileHover={
                    isPending ? undefined : pressHover(reduceMotion)
                  }
                  whileTap={isPending ? undefined : pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="group inline-flex h-11 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary pl-5 pr-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--primary)_70%,transparent)] outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-37.5"
                >
                  <span>{isPending ? "Saving" : "Save changes"}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105">
                    {isPending ? (
                      <motion.span
                        animate={
                          reduceMotion
                            ? undefined
                            : { rotate: 360, opacity: [0.6, 1] }
                        }
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: EASE_FLUID,
                        }}
                      >
                        <Loader2 className="size-4" aria-hidden="true" />
                      </motion.span>
                    ) : (
                      <ArrowRight
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </motion.button>
              </div>
            </motion.form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
