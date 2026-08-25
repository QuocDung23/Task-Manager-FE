# BE Change Plan - Search User By Email And Add Multiple Project Members

## 1. Mục tiêu

Điều chỉnh BE để đáp ứng đúng yêu cầu mới từ FE:

- search user bằng `email`
- kết quả trả về đủ `name + email`
- add nhiều member vào project trong một request

Mục tiêu cuối:

- FE có thể search user theo email để chọn member
- FE có thể submit nhiều `userIds` trong một lần add
- BE xử lý rõ các case thành công, duplicate, user không tồn tại

## 2. Hiện trạng BE

### 2.1 Search user

Hiện tại `GET /user` chỉ đang hỗ trợ:

- `name`
- `status`

Code hiện tại chưa hỗ trợ:

- query `email`
- filter user theo `email`

### 2.2 Add project member

Hiện tại `POST /project/:projectId/members` chỉ nhận:

```json
{
  "userId": "uuid"
}
```

Service hiện tại chỉ xử lý:

- 1 user mỗi request

Nó chưa hỗ trợ:

- `userIds: string[]`
- add nhiều user trong một lần gọi

## 3. Phạm vi thay đổi BE

## 3.1 Thay đổi search user theo email

Phần này là bắt buộc nếu FE muốn search bằng email thật sự.

### Cần đổi ở DTO

File:

- `Manage -Task/BE/src/modules/user/dtos/request/getUsers.req.ts`

Việc cần làm:

- thêm field `email?: string` vào `GetUsersRequestDto`
- thêm `email` vào `zod query schema`

Shape mong muốn:

```ts
export class GetUsersRequestDto {
  name?: string;
  email?: string;
  status?: UserStatus;
}
```

Query schema mong muốn:

```ts
z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(UserStatus).optional(),
})
```

### Cần đổi ở repository

File:

- `Manage -Task/BE/src/modules/user/user.repository.ts`

Việc cần làm:

- mở rộng `findUsers` để nhận thêm `email`
- filter theo `email` thay vì chỉ theo `name`

Khuyến nghị:

- nếu business là search email:
  - ưu tiên filter bằng `email`
- nếu muốn hỗ trợ cả hai:
  - cho phép `name` hoặc `email`

Ví dụ hướng xử lý:

```ts
where: {
  email: email,
  name: name,
  status: status,
}
```

Nếu cần search gần đúng:

- cân nhắc dùng `contains`
- có thể thêm `mode: "insensitive"` nếu Prisma config hỗ trợ

Ví dụ:

```ts
email: email ? { contains: email, mode: "insensitive" } : undefined
```

Khuyến nghị mạnh:

- nên search email bằng `contains` hoặc `startsWith`
- exact match sẽ làm UX kém khi user gõ từng phần email

### Cần đổi ở service

File:

- `Manage -Task/BE/src/modules/user/user.service.ts`

Việc cần làm:

- đọc thêm `email` từ `GetUsersRequestDto`
- truyền `email` xuống `findUsers`
- sửa lại pagination đang hardcode

Hiện đang có:

- `skip: 1`
- `take: 10`

Nên đổi thành:

- dùng đúng `paginationUtils.extractSkipTakeFromPagination(...)`

### Cần đổi ở response

Đảm bảo `GetUserResponseDto` hoặc response user hiện tại có ít nhất:

- `id`
- `name`
- `email`

Đây là bắt buộc để FE hiển thị đúng `name + email` trong search result.

## 3.2 Thay đổi add nhiều project members trong một request

Phần này là bắt buộc nếu muốn "thêm 1 lần nhiều người" đúng nghĩa business.

### Khuyến nghị về API contract

Giữ nguyên route:

```http
POST /project/:projectId/members
```

Nhưng đổi body từ:

```json
{
  "userId": "uuid"
}
```

thành:

```json
{
  "userIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

Lý do nên giữ nguyên route:

- không cần thêm endpoint mới
- semantics vẫn đúng: add members vào project
- FE dễ dùng hơn

Nếu team muốn tránh breaking change:

- có thể thêm endpoint mới như `/project/:projectId/members/batch`

Nhưng nếu FE mới chưa release, đổi luôn payload ở endpoint hiện tại sẽ gọn hơn.

## 4. Các file cần sửa

### 4.1 DTO request add member

File:

- `Manage -Task/BE/src/modules/projects/dtos/request/addProjectMember.req.ts`

Việc cần làm:

- đổi `userId` thành `userIds: string[]`
- validation:
  - array bắt buộc
  - mỗi item là UUID
  - array không được rỗng
  - nên unique nếu muốn chặn duplicate ngay từ request

Shape mong muốn:

```ts
export class AddProjectMembersRequestDto {
  userIds: string[];
}
```

Validation gợi ý:

```ts
z.object({
  userIds: z.array(z.string().uuid()).min(1),
})
```

Nếu muốn chặt hơn:

- có thể check unique ids trong service hoặc custom validation

### 4.2 Controller

File:

- `Manage -Task/BE/src/modules/projects/projects.controller.ts`

Việc cần làm:

- đọc body mới `userIds`
- truyền DTO mới xuống service

### 4.3 Router / OpenAPI

File:

- `Manage -Task/BE/src/modules/projects/projects.router.ts`

Việc cần làm:

- update schema request cho body mới
- update OpenAPI docs cho batch add members

### 4.4 Service

File:

- `Manage -Task/BE/src/modules/projects/projects.service.ts`

Việc cần làm:

- đổi logic `addMember` thành `addMembers`
- xử lý nhiều `userIds`

Logic nên có:

1. Kiểm tra project tồn tại
2. Lấy role `PROJECT_MEMBER`
3. Validate toàn bộ `userIds`
4. Kiểm tra user nào không tồn tại hoặc không `ACTIVE`
5. Kiểm tra user nào đã là member
6. Thêm các user hợp lệ còn lại
7. Trả response tổng hợp

## 5. Thiết kế xử lý nghiệp vụ cho batch add

Có 2 hướng xử lý.

### Option A - All or nothing

Nếu có 1 user lỗi:

- reject toàn bộ request

Ưu điểm:

- dễ hiểu
- dữ liệu nhất quán

Nhược điểm:

- UX kém hơn khi add nhiều người mà chỉ 1 người lỗi

### Option B - Partial success

Request vẫn chạy, BE trả ra:

- user add thành công
- user bị duplicate
- user không tồn tại
- user không active

Ưu điểm:

- hợp với use case add nhiều người
- FE dễ hiển thị kết quả thực tế

Nhược điểm:

- response phức tạp hơn

Khuyến nghị:

- chọn `partial success`

Vì business đã đổi sang add nhiều người, việc một phần thành công sẽ thực tế hơn.

## 6. Response contract đề xuất

Nếu dùng `partial success`, response nên có dạng:

```json
{
  "success": true,
  "data": {
    "added": [
      {
        "userId": "uuid-1",
        "projectId": "project-id"
      }
    ],
    "skipped": [
      {
        "userId": "uuid-2",
        "reason": "ALREADY_IN_PROJECT"
      }
    ],
    "invalid": [
      {
        "userId": "uuid-3",
        "reason": "USER_NOT_FOUND"
      }
    ]
  }
}
```

Nếu muốn FE map tốt hơn khi search theo email, có thể trả thêm:

- `email`
- `name`

ví dụ:

```json
{
  "userId": "uuid-3",
  "email": "a@b.com",
  "name": "User A",
  "reason": "USER_NOT_FOUND"
}
```

## 7. Repository changes cho project members

File liên quan:

- `Manage -Task/BE/src/modules/projectMember/projectMember.repository.ts`

Hiện tại repo có:

- `findProjectMember`
- `addMemberToProject`

Việc nên bổ sung:

- method kiểm tra nhiều member cùng lúc
- method createMany nếu muốn tối ưu insert batch

Khuyến nghị:

- thêm hàm kiểu `findProjectMembersByUserIds(projectId, userIds)`
- cân nhắc `createMany` nếu schema và Prisma setup phù hợp

Ví dụ hướng triển khai:

```ts
findMany({
  where: {
    projectId,
    userId: { in: userIds },
    deletedAt: null,
  },
})
```

## 8. Validation và rule nghiệp vụ

BE nên validate thêm:

- `userIds` không rỗng
- `userIds` không chứa duplicate trong cùng request
- tất cả `userIds` phải là UUID hợp lệ

Rule nên rõ ràng:

- user inactive không được add
- user đã trong project không được add lại
- project không tồn tại thì fail ngay toàn bộ request

## 9. Error handling

### Với search user

Các case chính:

- query sai format email
- không có kết quả

Khuyến nghị:

- query sai email -> `400`
- không có kết quả -> `200` với mảng rỗng

### Với add multiple members

Nếu dùng `partial success`:

- không nên dùng `409` cho cả request chỉ vì 1 user duplicate
- nên trả `200` với kết quả tổng hợp

Nếu dùng `all or nothing`:

- có thể trả `409` hoặc `400` tùy case

## 10. Checklist implementation

- [ ] Thêm `email` vào `GetUsersRequestDto`
- [ ] Thêm `email` vào `getUsersRequestQuery`
- [ ] Sửa `UserRepository.findUsers` để filter theo `email`
- [ ] Sửa `UserService.getAllUsers` để truyền `email`
- [ ] Sửa pagination của `getAllUsers` để không hardcode `skip/take`
- [ ] Đảm bảo response user có `id + name + email`
- [ ] Đổi DTO add member từ `userId` sang `userIds`
- [ ] Update validation schema cho batch add members
- [ ] Update OpenAPI schema trong `projects.router.ts`
- [ ] Update controller để nhận DTO mới
- [ ] Đổi service từ add 1 member sang add nhiều members
- [ ] Bổ sung check duplicate trong cùng request
- [ ] Bổ sung check user tồn tại và `ACTIVE`
- [ ] Bổ sung check user đã là member của project
- [ ] Bổ sung response tổng hợp cho batch add
- [ ] Cân nhắc thêm repository method cho query nhiều members cùng lúc
- [ ] Cân nhắc dùng `createMany` để tối ưu insert

## 11. Manual test checklist

- [ ] `GET /user?email=a` trả về list user active phù hợp
- [ ] response user có `name` và `email`
- [ ] search email không hợp lệ trả `400`
- [ ] `POST /project/:projectId/members` với nhiều `userIds` hợp lệ add thành công
- [ ] request có user duplicate trong project được report đúng
- [ ] request có user không tồn tại được report đúng
- [ ] request có user inactive được report đúng
- [ ] request có `userIds` rỗng bị reject
- [ ] request có `userIds` trùng nhau trong cùng body được handle đúng

## 12. Definition of done

Task được xem là hoàn thành khi:

- BE hỗ trợ search user theo `email`
- response search user có đủ `id`, `name`, `email`
- BE hỗ trợ add nhiều member trong một request
- contract response đủ rõ để FE hiển thị kết quả success/fail
- OpenAPI và validation đã đồng bộ với behavior mới
