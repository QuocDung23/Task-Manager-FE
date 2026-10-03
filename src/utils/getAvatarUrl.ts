export function getAvatarUrl(avatar?: string | null) {
    if (!avatar) return undefined;
  
    const cloudinaryUploadPath = "/image/upload/";
    const uploadPathIndex = avatar.indexOf(cloudinaryUploadPath);
  
    if (
      uploadPathIndex === -1 ||
      !avatar.includes("res.cloudinary.com") ||
      avatar.includes(`${cloudinaryUploadPath}f_auto`)
    ) {
      return avatar;
    }
  
    const beforeUploadPath = avatar.slice(
      0,
      uploadPathIndex + cloudinaryUploadPath.length,
    );
    const afterUploadPath = avatar.slice(
      uploadPathIndex + cloudinaryUploadPath.length,
    );
  
    return `${beforeUploadPath}f_auto,q_auto/${afterUploadPath}`;
  }