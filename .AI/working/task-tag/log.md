# Task Tag Feature - Work Log

## Ngày: 2026-08-12

## Tóm tắt

Đã triển khai thành công Task Tag/Label feature theo plan `.AI/FE/plan/tag-task.md`.

## Các file đã tạo mới

### Feature Layer (`src/features/tags/`)

| File | Mô tả |
|------|--------|
| `types/index.ts` | TagResponse, TagStatus, CreateTagRequest, UpdateTagRequest, GetTasksByTagParams, etc. |
| `api/tag-api.ts` | API methods: getByBoard, create, update, delete, getTasksByTag |
| `utils/tag-query-keys.ts` | Query key factory với `tagKeys.board()` và `tagKeys.tasks()` |
| `hooks/useTags.ts` | Hook lấy tags theo board |
| `hooks/useCreateTag.ts` | Hook tạo tag mới |
| `hooks/useUpdateTag.ts` | Hook cập nhật tag |
| `hooks/useDeleteTag.ts` | Hook xóa mềm tag |
| `hooks/useTasksByTag.ts` | Hook lấy tasks theo tag |

### Task Feature Updates (`src/features/tasks/`)

| File | Thay đổi |
|------|-----------|
| `types/index.ts` | Thêm `tags: TaskTagSummary[]` vào TaskResponse, `tagIds`, `tagMode` vào TaskListFilters, `ReplaceTaskTagsRequest` |
| `api/task-api.ts` | Thêm methods: `replaceTags`, `attachTag`, `detachTag`. Cập nhật `buildListParams` cho tag filters |
| `utils/task-query-keys.ts` | Cập nhật `filtersAreEqual` và `cleanFilters` cho tag filters |
| `utils/task-cache.ts` | Cập nhật `matchesFilters` để match tag filters (ANY/ALL mode) |
| `hooks/useTaskTags.ts` | Hooks cho tag mutations trên task |

### Component Layer (`src/components/tags/`)

| File | Mô tả |
|------|--------|
| `index.ts` | Barrel export cho all tag components |
| `tag-utils.ts` | Utils: `normalizeColor`, `getContrastColor`, `formatTagDisplay`, `TAG_COLOR_PRESETS` |
| `task-tag-badge.tsx` | Badge hiển thị tag màu trên task card |
| `task-tags-picker.tsx` | Popover picker cho việc chọn tags trên task detail |
| `tag-editor-dialog.tsx` | Dialog tạo/sửa tag với color picker |
| `board-tags-manager-dialog.tsx` | Dialog quản lý tags của board |
| `tag-filter.tsx` | Filter chip cho board header với ANY/ALL mode |

### Component Updates

| File | Thay đổi |
|------|-----------|
| `task-detail-meta-bar.tsx` | Thay `LabelChip` placeholder bằng `TaskTagsPicker` |
| `task-card.tsx` | Thêm `TaskTagBadge` để hiển thị tags |
| `detail-board.tsx` | Tích hợp `TagFilter` và `BoardTagsManagerDialog` |

## Triển khai theo Phase

### Phase 1: Contract và Data Layer ✅
- Types cho Tag response/request
- Tag API endpoints
- Tag query keys
- Task tag API (replace/attach/detach)
- Task filters cho tagIds/tagMode
- Cache helper cập nhật cho tag filters
- Tag hooks (useTags, useCreateTag, useUpdateTag, useDeleteTag, useTasksByTag)
- useReplaceTaskTags hook

### Phase 2: Task Detail Picker ✅
- TaskTagsPicker với multi-select
- Draft local state trước khi apply
- Apply/Cancel/Clear all
- Inline tag creation
- OVERDUE_LOCKED handling
- Thay thế LabelChip placeholder

### Phase 3: Board Tag Management ✅
- BoardTagsManagerDialog với list tags
- TagEditorDialog cho create/edit
- Delete confirmation
- Color presets và native color picker
- Cache invalidation sau CRUD

### Phase 4: Board Filter và Display ✅
- TagFilter component với search
- ANY/ALL mode segmented control
- TaskTagBadge trên task card
- Integration vào DetailBoard

### Phase 5: Polish ✅
- Build verification passed
- Pre-existing lint issues trong codebase (không liên quan đến feature mới)

## Kết quả Build

```
✓ 7098 modules transformed
✓ built in 835ms
```

## API Endpoints được tích hợp

| Method | Endpoint | Mục đích |
|--------|----------|-----------|
| GET | `/task/boards/:boardId/tags` | Lấy tags theo board |
| POST | `/task/boards/:boardId/tags` | Tạo tag mới |
| PATCH | `/task/boards/:boardId/tags/:tagId` | Cập nhật tag |
| DELETE | `/task/boards/:boardId/tags/:tagId` | Xóa mềm tag |
| GET | `/task/boards/:boardId/tags/:tagId/tasks` | Lấy tasks theo tag |
| PATCH | `/task/:taskId/tags` | Replace all tags |
| POST | `/task/:taskId/tags/:tagId` | Attach tag (phase utility) |
| DELETE | `/task/:taskId/tags/:tagId` | Detach tag (phase utility) |

## Error Handling

- Duplicate name: Toast error, giữ form mở
- Permission denied: Toast error
- OVERDUE_LOCKED: Disable mutation, hướng dẫn reschedule
- Not found: Invalidate cache, đóng picker
- Network error: Toast fallback

## Design Implementation

Theo `.AI/workfollow/agent.md` và design skills:
- Linear-style minimalist UI
- Spring physics transitions (`cubic-bezier(0.16,1,0.3,1)`)
- Double-bezel card architecture patterns
- Consistent typography scale
- Proper loading/empty/error states
