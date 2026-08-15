"use client";

import { useCallback, useId, useMemo, useState } from "react";
import {
  ArrowRight,
  Loader2,
  Tag,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTag } from "@/features/tags/hooks/useCreateTag";
import { useUpdateTag } from "@/features/tags/hooks/useUpdateTag";
import type { TagResponse } from "@/features/tags/types";
import {
  EASE_FLUID,
  SPRING_PRESS,
  enterTransitionFor,
  iconHover,
  iconTap,
  pressHover,
  pressTap,
} from "@/lib/motion";
import {
  TAG_COLOR_PRESETS,
  getContrastColor,
  normalizeColor,
  isValidHexColor,
  normalizeTagName,
} from "./tag-utils";

type TagEditorDialogProps = {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: TagResponse;
  onSuccess?: (tag: TagResponse) => void;
};

function getInitialState(tag?: TagResponse) {
  return {
    name: tag?.name ?? "",
    color: tag?.color ?? TAG_COLOR_PRESETS[0],
  };
}

export function TagEditorDialog({
  boardId,
  open,
  onOpenChange,
  tag,
  onSuccess,
}: TagEditorDialogProps) {
  const reduceMotion = useReducedMotion();
  const formId = useId();
  const nameId = `${formId}-name`;
  const colorId = `${formId}-color`;
  const isEditing = Boolean(tag);
  const initialState = getInitialState(tag);

  const [name, setName] = useState(initialState.name);
  const [color, setColor] = useState(initialState.color);
  const [nameError, setNameError] = useState<string | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);

  const createTag = useCreateTag(boardId);
  const updateTag = useUpdateTag(boardId);
  const isPending = createTag.isPending || updateTag.isPending;

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!nameError) return;

      const normalized = normalizeTagName(value);
      if (normalized.length === 0) {
        setNameError("Name is required");
      } else if (normalized.length > 50) {
        setNameError("Name must be 50 characters or less");
      } else {
        setNameError(null);
      }
    },
    [nameError],
  );

  const handleColorChange = useCallback((value: string) => {
    setColor(value);
    setColorError(null);
  }, []);

  const validate = useCallback((): boolean => {
    const normalizedName = normalizeTagName(name);
    let valid = true;

    if (normalizedName.length === 0) {
      setNameError("Name is required");
      valid = false;
    } else if (normalizedName.length > 50) {
      setNameError("Name must be 50 characters or less");
      valid = false;
    } else {
      setNameError(null);
    }

    if (color && !isValidHexColor(color)) {
      setColorError("Use a valid hex color");
      valid = false;
    } else {
      setColorError(null);
    }

    return valid;
  }, [color, name]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const normalizedName = normalizeTagName(name);
    const normalizedColor = normalizeColor(color) || undefined;

    if (isEditing && tag) {
      const hasChanges =
        normalizedName !== normalizeTagName(tag.name) ||
        normalizedColor !== normalizeColor(tag.color);

      if (!hasChanges) {
        onOpenChange(false);
        return;
      }

      updateTag.mutate(
        { tagId: tag.id, data: { name: normalizedName, color: normalizedColor } },
        {
          onSuccess: (response) => {
            onSuccess?.(response.data);
            onOpenChange(false);
          },
        },
      );
      return;
    }

    createTag.mutate(
      { name: normalizedName, color: normalizedColor },
      {
        onSuccess: (response) => {
          onSuccess?.(response.data);
          onOpenChange(false);
        },
      },
    );
  }, [
    color,
    createTag,
    isEditing,
    name,
    onOpenChange,
    onSuccess,
    tag,
    updateTag,
    validate,
  ]);

  const hasChanges = useMemo(() => {
    if (!isEditing) return name.trim().length > 0;
    if (!tag) return false;

    return (
      normalizeTagName(name) !== normalizeTagName(tag.name) ||
      normalizeColor(color) !== normalizeColor(tag.color)
    );
  }, [color, isEditing, name, tag]);

  const previewColor = normalizeColor(color);
  const enterTransition = enterTransitionFor(reduceMotion);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-3xl border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-130"
      >
        <div className="rounded-3xl p-1.5">
          <div className="overflow-hidden rounded-[calc(1.5rem-0.375rem)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enterTransition}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7"
            >
              <div className="rounded-2xl bg-primary/10 p-1.5 ring-1 ring-inset ring-primary/15">
                <div className="grid size-11 place-items-center rounded-[calc(1rem-0.375rem)] bg-card text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-16px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Tag className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </div>
              </div>

              <DialogHeader className="min-w-0 gap-1.5 pt-0.5 text-left">
                <DialogTitle className="font-heading text-[19px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[20px]">
                  {isEditing ? "Edit label" : "Create label"}
                </DialogTitle>
                <DialogDescription className="max-w-[34ch] text-[13px] font-normal leading-relaxed text-muted-foreground">
                  {isEditing
                    ? "Update the name or color of this label."
                    : "Create a new label to organize tasks."}
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
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.6, delay: 0.06, ease: EASE_FLUID }
              }
              className="px-5 pb-5 sm:px-7 sm:pb-7"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor={nameId}
                      className="text-[12.5px] font-medium text-foreground/85"
                    >
                      Label name
                    </Label>
                    <span className="tabular-nums text-[11.5px] font-normal text-muted-foreground/75">
                      {name.length}/50
                    </span>
                  </div>
                  <Input
                    id={nameId}
                    autoComplete="off"
                    autoFocus
                    aria-invalid={Boolean(nameError)}
                    placeholder="e.g. Priority"
                    value={name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    maxLength={50}
                    className="h-12 rounded-2xl border border-foreground/8 bg-background/65 px-4 text-[13.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-background focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 aria-invalid:border-destructive/45 aria-invalid:ring-destructive/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  />
                  {nameError ? (
                    <p className="text-[12px] leading-relaxed text-destructive" role="alert">
                      {nameError}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[12.5px] font-medium text-foreground/85">
                    Color
                  </Label>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Color presets">
                    {TAG_COLOR_PRESETS.map((preset) => {
                      const selected = normalizeColor(color).toLowerCase() === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleColorChange(preset)}
                          aria-label={`Select color ${preset}`}
                          aria-pressed={selected}
                          className="size-8 rounded-full outline-none transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105 focus-visible:ring-4 focus-visible:ring-accent/15"
                          style={{
                            backgroundColor: preset,
                            boxShadow: selected
                              ? "0 0 0 2px var(--card), 0 0 0 4px var(--primary)"
                              : "inset 0 0 0 1px rgb(15 23 42 / 0.10)",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-start gap-2">
                    <Input
                      id={colorId}
                      type="text"
                      aria-invalid={Boolean(colorError)}
                      placeholder="#000000"
                      value={color}
                      onChange={(event) => handleColorChange(event.target.value)}
                      maxLength={7}
                      className="h-11 flex-1 rounded-2xl border border-foreground/8 bg-background/65 px-4 font-mono text-[12px] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground/65 hover:bg-background focus-visible:border-accent/40 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent/10 aria-invalid:border-destructive/45 aria-invalid:ring-destructive/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    />
                    <input
                      type="color"
                      aria-label="Choose a custom color"
                      value={previewColor}
                      onChange={(event) => handleColorChange(event.target.value)}
                      className="size-11 shrink-0 cursor-pointer rounded-2xl border border-foreground/8 bg-background/65 p-1 outline-none transition-[border-color,box-shadow] duration-500 focus-visible:border-accent/40 focus-visible:ring-4 focus-visible:ring-accent/10"
                    />
                  </div>
                  {colorError ? (
                    <p className="text-[12px] leading-relaxed text-destructive" role="alert">
                      {colorError}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[12.5px] font-medium text-foreground/85">
                    Preview
                  </Label>
                  <div
                    className="flex min-h-15 items-center gap-3 rounded-2xl border px-4 py-3 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    style={{
                      backgroundColor: `${previewColor}12`,
                      borderColor: `${previewColor}42`,
                    }}
                  >
                    <span
                      className="size-8 shrink-0 rounded-xl ring-1 ring-inset ring-foreground/10"
                      style={{ backgroundColor: previewColor }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-foreground">
                      {name.trim() || "Label preview"}
                    </span>
                    <span
                      className="ml-auto shrink-0 text-[11.5px] font-medium"
                      style={{ color: getContrastColor(previewColor) }}
                      aria-hidden="true"
                    >
                      {previewColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                <motion.button
                  type="button"
                  disabled={isPending}
                  onClick={() => onOpenChange(false)}
                  whileHover={pressHover(reduceMotion)}
                  whileTap={pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="h-11 whitespace-nowrap rounded-full px-5 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/70 hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={isPending || !hasChanges}
                  aria-live="polite"
                  whileHover={isPending ? undefined : pressHover(reduceMotion)}
                  whileTap={isPending ? undefined : pressTap(reduceMotion)}
                  transition={SPRING_PRESS}
                  className="group inline-flex h-11 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary pl-5 pr-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--primary)_70%,transparent)] outline-none transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-38.5"
                >
                  <span>
                    {isPending
                      ? isEditing
                        ? "Saving"
                        : "Creating"
                      : isEditing
                        ? "Save changes"
                        : "Create label"}
                  </span>
                  <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105">
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
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
