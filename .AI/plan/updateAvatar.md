# Plan update Avatar khi `edit === true`

## 1. Kết luận sau khi check BE

Avatar không đi chung với `PATCH /user/me`.

Backend hiện có 2 API tách biệt:

- `PATCH /user/me`
  - update các field profile thường như `name`, `bio`, `address`, `phone`
- `PATCH /user/me/avatar`
  - update avatar riêng
  - request là `multipart/form-data`
  - field file bắt buộc tên `avatar`

Các bằng chứng từ BE:

- router: [user.router.ts](/Users/keke/Meeee/MT/Manage%20-Task/BE/src/modules/user/user.router.ts:87)
- service upload avatar: [user.service.ts](/Users/keke/Meeee/MT/Manage%20-Task/BE/src/modules/user/user.service.ts:67)
- validate file upload: [updateAvatar.req.ts](/Users/keke/Meeee/MT/Manage%20-Task/BE/src/modules/user/dtos/request/updateAvatar.req.ts:1)

=> Vì vậy plan cũ theo hướng gửi `avatar` trong `updateMe()` là không đúng với backend thực tế.

## 2. Contract BE thực tế

### API profile

`PATCH /user/me`

Payload hiện tại chỉ nên chứa:

- `name`
- `bio`
- `address`
- `phone`

### API avatar

`PATCH /user/me/avatar`

Request:

- `Content-Type: multipart/form-data`
- file field: `avatar`

Validation từ BE:

- chỉ nhận:
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
- max size: `5 * 1024 * 1024` = `5MB`

Response:

```ts
{
  avatar: string;
}
```

## 3. Ảnh hưởng lên FE hiện tại

### Chỗ đang chưa khớp

Trong FE hiện tại:

- [user-api.ts](/Users/keke/Meeee/MT/FE/src/features/users/api/user-api.ts:22) chỉ có `updateMe(data)`
- [types/index.ts](/Users/keke/Meeee/MT/FE/src/features/users/types/index.ts:19) vẫn để `UserUpdatePayload` có `avatar`

Điều này dễ gây hiểu nhầm rằng avatar đi chung với update profile, nhưng BE không support theo cách đó.

### Điều cần sửa trong tư duy implement

- không bỏ `avatar` vào `formData` dùng cho `PATCH /user/me`
- avatar phải có state riêng
- avatar save phải gọi API riêng

## 4. Hướng triển khai đúng

Giữ avatar edit ở `ProfileHeader`, nhưng state và submit orchestration đặt ở `profile-user.tsx`.

### State nên có ở `profile-user.tsx`

Giữ `formData` chỉ cho text fields:

```ts
const [formData, setFormData] = useState({
  name: "",
  bio: "",
  address: "",
  phoneNumber: "",
});
```

Thêm state riêng cho avatar:

```ts
const [avatarFile, setAvatarFile] = useState<File | null>(null);
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
```

Ý nghĩa:

- `avatarFile`: file thật sẽ gửi lên `PATCH /user/me/avatar`
- `avatarPreview`: ảnh preview local để render ngay khi đang edit

## 5. FE API cần bổ sung

Trong [user-api.ts](/Users/keke/Meeee/MT/FE/src/features/users/api/user-api.ts:1), thêm API riêng:

```ts
updateMyAvatar: async (file: File): Promise<ApiResponse<{ avatar: string }>> => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await axiosLocal.patch<ApiResponse<{ avatar: string }>>(
    "/user/me/avatar",
    formData,
  );

  return response.data;
}
```

Sau đó tạo hook riêng, ví dụ `useUpdateMyAvatar`.

## 6. Flow UI khi `edit === true`

### `ProfileHeader`

Khi `edit === true`:

- avatar hiển thị overlay icon camera/pencil
- có hidden file input `accept="image/png,image/jpeg,image/gif,image/webp"`
- click avatar hoặc nút overlay để chọn file
- nếu đã chọn file, render `avatarPreview`
- nếu chưa chọn file, render avatar hiện tại từ user

### Props nên truyền xuống `ProfileHeader`

- `avatarPreview`
- `onAvatarSelect`
- `isUploadingAvatar`

Ví dụ:

```ts
interface ProfileHeaderProps {
  user: ProfileUser;
  edit: boolean;
  isLoading: boolean;
  onEdit: () => void;
  avatarPreview?: string | null;
  onAvatarSelect?: (file: File | null) => void;
  isUploadingAvatar?: boolean;
}
```

## 7. Xử lý chọn file

Tại `profile-user.tsx`, khi user chọn file:

1. kiểm tra mime type đúng rule của BE
2. kiểm tra size `<= 5MB`
3. tạo preview bằng `URL.createObjectURL(file)`
4. set `avatarFile`
5. set `avatarPreview`

Cleanup:

- revoke object URL cũ khi chọn file mới
- revoke khi `Cancel`
- revoke khi đóng dialog
- revoke khi component unmount

## 8. Cách save đúng với BE

`Save Changes` giờ sẽ có tối đa 2 request:

1. nếu text fields thay đổi thì gọi `PATCH /user/me`
2. nếu `avatarFile` có giá trị thì gọi `PATCH /user/me/avatar`

Pseudo flow:

```ts
const handleSave = async () => {
  try {
    if (hasProfileChanges) {
      await updateUser.mutateAsync({
        name: formData.name,
        bio: formData.bio || null,
        address: formData.address || null,
        phoneNumber: formData.phoneNumber ? Number(formData.phoneNumber) : null,
      });
    }

    if (avatarFile) {
      await updateMyAvatar.mutateAsync(avatarFile);
    }

    setEdit(false);
  } catch (error) {
    console.error("Failed to update profile/avatar:", error);
  }
};
```

## 9. Có nên upload avatar ngay khi chọn file không?

Có 2 lựa chọn:

### Option A. Upload khi bấm `Save Changes`

Ưu điểm:

- đúng semantics với edit mode hiện tại
- `Cancel` thật sự hủy toàn bộ thay đổi, gồm cả avatar

Nhược điểm:

- lúc save có thể phải chờ 2 request

### Option B. Upload ngay sau khi chọn file

Ưu điểm:

- save nhanh hơn sau đó

Nhược điểm:

- `Cancel` không còn đúng nghĩa vì avatar đã lưu thật lên server trước khi bấm save
- flow khó hiểu hơn

=> Với yêu cầu của bạn "update Avatar khi ở trạng thái `edit true`", option phù hợp nhất là `upload khi Save`.

## 10. Validation/UX nên có

- chỉ nhận `jpeg/png/gif/webp`
- size tối đa `5MB`
- preview ngay sau khi chọn file
- disable nút save khi đang upload avatar hoặc đang update profile
- `Cancel` phải xóa `avatarFile` và `avatarPreview`
- đóng modal rồi mở lại không giữ draft avatar cũ

## 11. Các thay đổi code nên làm

### FE types

Sửa [types/index.ts](/Users/keke/Meeee/MT/FE/src/features/users/types/index.ts:19):

- cân nhắc bỏ `avatar` ra khỏi `UserUpdatePayload`

Vì payload `PATCH /user/me` không dùng field này.

### FE API

Sửa [user-api.ts](/Users/keke/Meeee/MT/FE/src/features/users/api/user-api.ts:1):

- giữ `updateMe()` cho profile text fields
- thêm `updateMyAvatar(file)`

### FE hooks

Thêm hook mới:

- `useUpdateMyAvatar`

Hook này nên:

- gọi `userApi.updateMyAvatar`
- invalidate `["current-user"]`
- toast success/error tương tự `useUpdateUser`

### FE component

Sửa:

- [profile-user.tsx](/Users/keke/Meeee/MT/FE/src/components/users/profile-user.tsx:1)
- [profile-header.tsx](/Users/keke/Meeee/MT/FE/src/components/users/profile-header.tsx:1)

Không cần nhét avatar vào:

- [edit-form.tsx](/Users/keke/Meeee/MT/FE/src/components/users/edit-form.tsx:1)

vì avatar thuộc phần header, không thuộc form text.

## 12. Thứ tự implement đề xuất

1. bỏ assumption `avatar` đi chung `PATCH /user/me`
2. thêm `updateMyAvatar(file)` vào API layer
3. thêm `useUpdateMyAvatar`
4. thêm `avatarFile` + `avatarPreview` state ở `profile-user.tsx`
5. truyền props edit avatar xuống `ProfileHeader`
6. thêm file picker + preview trong `ProfileHeader`
7. update `handleSave()` để gọi 2 API riêng nếu cần
8. cleanup preview object URL và test cancel/close/save

## 13. Acceptance checklist

- Khi `edit === true`, user chọn được file avatar mới
- Preview avatar hiện ngay trước khi save
- `Save Changes` update đúng avatar qua `PATCH /user/me/avatar`
- `Save Changes` vẫn update text fields qua `PATCH /user/me`
- `Cancel` không upload avatar thật
- file sai mime type hoặc > 5MB bị chặn từ FE

## 14. Kết luận

Plan đúng với BE là:

- avatar phải đi bằng API riêng
- dùng `File` + `FormData`
- không gộp `avatar` vào `formData` của profile text fields
- save avatar ở cùng thời điểm bấm `Save Changes`, nhưng gọi endpoint riêng

## 15. Plan tối ưu performance cho `useUpdateMyAvatar`

### Vấn đề hiện tại

Hook hiện tại ở [useUpdateMyAvatart.ts](/Users/keke/Meeee/MT/FE/src/features/users/hooks/useUpdateMyAvatart.ts:1) đang làm:

1. upload avatar qua `PATCH /user/me/avatar`
2. sau khi success thì `invalidateQueries(["current-user"])`
3. UI chờ query `/user/me` fetch lại để nhận avatar mới

Điều này làm cảm giác chậm vì:

- user đã chọn ảnh và upload xong nhưng vẫn phải chờ thêm 1 round trip nữa
- toàn bộ dữ liệu `current-user` bị refetch chỉ để cập nhật một field `avatar`
- nếu mạng chậm, preview local và dữ liệu server dễ bị “giật” qua lại

### Mục tiêu tối ưu

- avatar đổi gần như ngay lập tức trên UI
- hạn chế refetch không cần thiết
- chỉ rollback khi upload lỗi
- giữ cache `current-user` nhất quán

## 16. Hướng tối ưu đề xuất

### Option nên ưu tiên: Optimistic update + patch cache trực tiếp

Thay vì luôn `invalidateQueries`, `useUpdateMyAvatar` nên:

1. nhận thêm `previewUrl` để hiển thị ngay
2. snapshot cache cũ của `["current-user"]`
3. `setQueryData` để cập nhật tạm `data.avatar = previewUrl`
4. gọi API upload
5. khi success:
   - lấy `response.data.avatar`
   - `setQueryData` lại bằng URL thật từ server
6. khi error:
   - rollback cache cũ
7. chỉ `invalidateQueries` khi thực sự cần đồng bộ lại sau cùng, hoặc bỏ hẳn nếu payload response đã đủ

Lợi ích:

- user thấy avatar đổi ngay
- không cần chờ `/user/me` refetch mới thấy kết quả
- giảm 1 request đọc sau mỗi lần upload avatar

## 17. Cách sửa hook

### Hiện tại

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["current-user"] });
  toast.success("Update Avatar Successfully");
}
```

### Nên chuyển sang

```ts
type UpdateAvatarInput = {
  file: File;
  previewUrl?: string;
};
```

Hook flow:

```ts
return useMutation({
  mutationFn: ({ file }: UpdateAvatarInput) => userApi.updateMyAvatar(file),
  onMutate: async ({ previewUrl }) => {
    await queryClient.cancelQueries({ queryKey: ["current-user"] });

    const previousUser = queryClient.getQueryData(["current-user"]);

    if (previewUrl) {
      queryClient.setQueryData(["current-user"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            avatar: previewUrl,
          },
        };
      });
    }

    return { previousUser };
  },
  onSuccess: (response) => {
    queryClient.setQueryData(["current-user"], (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: {
          ...old.data,
          avatar: response.data.avatar,
        },
      };
    });
    toast.success("Update Avatar Successfully");
  },
  onError: (_error, _variables, context) => {
    if (context?.previousUser) {
      queryClient.setQueryData(["current-user"], context.previousUser);
    }
    toast.error("Update Avatar Failed");
  },
});
```

## 18. Cách sửa chỗ gọi hook trong `ProfileHeader`

Hiện tại `ProfileHeader` đã có `avatarPreview` local state, đây là nền tảng tốt. Để tận dụng tối đa:

1. user chọn file
2. tạo `previewUrl`
3. set local preview ngay
4. gọi mutation với cả `file` và `previewUrl`

Ví dụ:

```ts
const previewUrl = URL.createObjectURL(file);
setAvatarPreview(previewUrl);

updateMyAvatar(
  { file, previewUrl },
  {
    onSuccess: (response) => {
      setAvatarPreview(response.data.avatar);
    },
    onError: () => {
      setAvatarPreview(null);
      URL.revokeObjectURL(previewUrl);
    },
  },
);
```

Điểm quan trọng:

- local preview cho cảm giác tức thì
- cache update cho phần còn lại của app thấy avatar mới ngay
- server response thay thế preview blob URL bằng URL thật

## 19. Tối ưu phụ nên làm

### Giảm refetch thừa

Nếu response của `PATCH /user/me/avatar` chỉ trả về:

```ts
{ avatar: string }
```

thì không cần refetch lại `/user/me` ngay sau upload.

Chỉ nên refetch nếu:

- backend còn mutate thêm field khác ngoài `avatar`
- hoặc có logic transform phức tạp mà FE không tự dựng được

### Chặn upload lặp

- disable click khi `isPending === true`
- reset `input.value = ""` sau mỗi lần chọn file
- nếu user chọn lại đúng file cũ vẫn trigger được `onChange`

### Giới hạn file sớm

- validate mime type trước upload
- validate size trước upload

Điều này không làm upload nhanh hơn trên server, nhưng giảm các lần request thất bại vô ích.

## 20. Nếu vẫn thấy chậm sau khi bỏ refetch

Khi đó bottleneck nhiều khả năng không còn nằm ở React Query nữa mà nằm ở:

- ảnh quá nặng
- upload lên Cloudinary chậm
- mạng chậm

Khi đó plan tiếp theo là:

1. resize/compress ảnh ở FE trước khi upload
2. convert sang WebP khi phù hợp
3. giới hạn chiều rộng/chiều cao trước khi gửi

Nhưng đây nên là phase 2, vì:

- tăng độ phức tạp
- cần kiểm tra chất lượng ảnh
- chưa chắc cần nếu vấn đề chính chỉ là refetch sau upload

## 21. Thứ tự implement tối ưu đề xuất

1. sửa `useUpdateMyAvatar` nhận `{ file, previewUrl }`
2. thêm `onMutate` để optimistic update cache `current-user`
3. thay `invalidateQueries` bằng `setQueryData` trong `onSuccess`
4. rollback cache trong `onError`
5. chỉ giữ refetch fallback nếu phát sinh inconsistency thật
6. nếu vẫn chậm mới làm thêm resize/compress phía client

## 22. Expected outcome

Sau khi áp dụng plan này:

- avatar đổi gần như ngay khi user chọn file
- không còn cảm giác chậm do chờ `GET /user/me` chạy lại
- số request giảm
- UX mượt hơn mà không cần đổi BE API
