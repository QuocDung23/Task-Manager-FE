# Work Management Process

---

## Overview

> This document defines the mandatory workflow for all feature development and source code modifications.

---

## Workflow Steps

### Step 1: Read & Verify the Plan

- **Check** if a specific implementation plan already exists for the requested feature.
- **Clarify Requirements:** If any part of the request or plan is unclear, **you must ask the user for clarification** before proceeding.
- **If NO plan exists:**
  - Create a detailed, step-by-step plan.
  - Specify which files need to be created or modified.
  - Present the plan to the user for approval **before writing any code**.
- **If a plan ALREADY exists:**
  - Thoroughly read and understand the current plan.
  - Grasp the full context before proceeding.

### Step 2: Execute the Plan

- Write complete, production-ready source code.
- Follow the steps outlined in the plan precisely.
- **Do NOT:**
  - Write placeholder code.
  - Leave sections empty.
  - Use comments in critical areas or places with complex logic.

### Step 3: Log Work Progress

- After completing any step, document the finished tasks clearly.
- Include a list of newly created or modified files.
- **Feature-based Organization:** Save logs under `.AI/working/` and organize them into **dedicated subfolders for each specific feature** (e.g., `.AI/working/<feature-name>/...`) so the user can easily track progress per feature.
- This allows the user to easily track progress.

---

## Code Quality Standards

### TypeScript Rules

| Rule                | Description                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Strict NO `any`** | Strict TypeScript is enforced throughout the project. Using the `any` type is strictly prohibited in all cases. |
| **Explicit types**  | Define `interface` or `type` for all data structures, component props, state variables, and WebSocket events.   |

> ⚠️ Using `any` is considered a **severe violation** of the project's coding standards.

### Naming Conventions

Always use clear, meaningful names and adhere to the following standards:

- **Variables:** Use nouns (e.g., `userData`, `totalCount`).
- **Functions:** Use verbs (e.g., `fetchData`, `calculateTotal`).
- **Booleans:** Use prefixes `is`/`has`/`can`/`should` (e.g., `isLoading`, `hasPermission`, `canSubmit`).
- **Arrays:** Use plural nouns (e.g., `users`, `taskLists`).
- **Event Handlers:** Use the `handle` prefix (e.g., `handleSubmit`, `handleClick`).
- **Custom Hooks:** Use the `use` prefix (e.g., `useAuth`, `useFetch`).
- **Components:** Use `PascalCase` (e.g., `TaskCard`, `UserProfile`).

### Code Style & UI Guidelines

- Source code must be **clean** and **clear**.
- **Modularize UI Components:** Do NOT write the entire UI in a single large page or file. Divide the user interface into small, reusable, independent components for better maintainability.
- Include concise comments explaining complex logic (e.g., real-time synchronization flows).
- User interface must be **fully responsive** using Tailwind CSS.

---

## Response Language

| Item              | Language   |
| ----------------- | ---------- |
| **All responses** | Tiếng Việt |
| **Explanations**  | Tiếng Việt |
| **Plans**         | Tiếng Việt |
| **Work logs**     | Tiếng Việt |

> **Note:** Source code definitions (variable names, function names, components) and short inline comments will follow standard international English.

---
