import React, { useEffect, useState } from "react";
import { useUpdateProject } from "./useUpdateProject";

export const useEditTitleProject = (
  projectId: string,
  initialTitle: string,
) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const { mutate: updateProject } = useUpdateProject();

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const handleSave = () => {
    setEditing(false);
    const trimmedTitle = title.trim();

    if (trimmedTitle && trimmedTitle !== initialTitle) {
      updateProject({ id: projectId, data: { name: trimmedTitle } });
    } else {
      setTitle(initialTitle);
    }
  };

  const handleKeyBoard = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setTitle(initialTitle);
    }
  };

  return {
    editing,
    setEditing,
    title,
    setTitle,
    handleSave,
    handleKeyBoard,
  }
};
