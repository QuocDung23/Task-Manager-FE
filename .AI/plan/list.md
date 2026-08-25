# FE Plan cho Lists theo BE hien tai

## 1. Muc tieu

Implement man hinh `board detail` tren FE de user co the:

- xem tat ca list trong 1 board
- tao list moi
- sua ten / description cua list
- xoa list
- reorder list bang drag and drop

Plan nay duoc viet dua tren BE trong:

- `Manage -Task/BE/src/modules/lists`
- `Manage -Task/BE/src/modules/board/board.router.ts`

Va dua tren FE hien tai:

- da co feature `boards`
- chua co feature `lists`
- chua co route / page rieng cho `board detail`

## 2. Kien thuc BE can nam truoc khi lam FE

## 2.1 Cac endpoint thuc te

### Lay danh sach list theo board

`GET /list/:boardId/getAllList`

Query:

- `page`
- `limit`
- `name` optional
- `status` optional

Response:

```ts
{
  success: true,
  data: ListResponse[],
  pagination: {
    totalItems: number,
    itemsPerPage: number,
    currentPage: number,
    totalPages: number
  }
}
```

### Lay chi tiet 1 list

`GET /list/:id/getListById`

Response:

```ts
{
  success: true,
  data: ListResponse
}
```

### Tao list moi

`POST /board/:boardId/create-lists`

Request:

```json
{
  "name": "Todo",
  "description": "optional"
}
```

Response:

```ts
{
  success: true,
  data: ListResponse
}
```

Luu y quan trong:

- route create list nam trong `board.router.ts`
- nghia la FE khong duoc goi `POST /list/...` de tao list

### Update list

`PUT /list/:id/update`

Request:

```json
{
  "name": "In Progress",
  "description": "optional",
  "order": 65536
}
```

Luu y:

- `name`, `description`, `order` deu optional
- FE co the dung endpoint nay cho inline edit
- khong nen dung endpoint nay cho reorder chinh, vi BE da co endpoint reorder rieng

### Delete list

`DELETE /list/:id/delete`

Behavior:

- soft delete
- BE set `deletedAt`
- BE set `status = INACTIVE`

### Reorder list

`PATCH /list/:boardId/reorderList`

Request:

```json
{
  "listIds": ["list-id-1", "list-id-2", "list-id-3"]
}
```

Behavior rat quan trong:

- FE phai gui day du tat ca active list trong board
- khong duoc gui mot phan list
- khong duoc gui duplicate id
- BE validate moi list phai thuoc dung `boardId`
- BE tu gan lai `order` theo step `65536`

=> Voi FE, drag and drop xong phai submit toan bo thu tu moi cua board.

## 2.2 Shape cua 1 list

`ListResponse`:

```ts
type ListResponse = {
  id: string;
  name: string;
  description: string;
  order: number;
  boardId: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
```

## 2.3 Permission cua BE

FE can biet de xu ly UX:

- view lists can `VIEW_BOARD`
- create list can `CREATE_LIST`
- update list can `UPDATE_LIST`
- delete list can `DELETE_LIST`
- reorder list can `MOVE_LIST`

Neu user khong duoc phep, BE se chan request. FE nen co UX:

- an / disable action button neu da biet user khong co permission
- neu chua co permission data tren FE thi it nhat phai handle toast loi tu BE

## 3. Danh gia FE hien tai

FE hien tai da co:

- `features/boards/api/board-api.ts`
- `features/boards/hooks/*`
- route `/${APP_ROUTES.PROJECT}/:projectId`
- UI list boards trong `components/projects/detail-project.tsx`

FE hien tai chua co:

- `features/lists`
- page / component cho `board detail`
- navigation tu board card vao board detail
- DnD cho lists

=> Vi vay de implement `lists`, can bo sung 1 tang moi trong FE:

`project -> board detail -> lists`

## 4. Huong implement FE de xai duoc ngay

## 4.1 Them route cho board detail

Can them route moi vi lists la resource cua board.

De xuat:

- giu `APP_ROUTES.BOARD = "/board"`
- them route:
  - `/${APP_ROUTES.BOARD}/:boardId`

Files can update:

- `FE/src/router/constans.ts`
- `FE/src/router/index.tsx`
- tao page moi:
  - `FE/src/pages/board/board-page.tsx`

Muc dich:

- khi click 1 board card o project page, user se vao man board detail
- tai man nay moi render list columns

## 4.2 Noi navigation tu board card hien tai

Trong `FE/src/components/projects/detail-project.tsx`:

- wrap card bang `Link` hoac `useNavigate`
- click vao board thi dieu huong den `/board/:boardId`
- co the truyen `boardName`, `projectId` qua `location.state` de hien breadcrumb nhanh hon

De xuat state:

```ts
{
  boardName: string;
  projectId: string;
  projectName?: string;
}
```

## 5. Cau truc feature `lists`

De xuat tao feature moi:

- `FE/src/features/lists/api/list-api.ts`
- `FE/src/features/lists/types/index.ts`
- `FE/src/features/lists/hooks/useLists.ts`
- `FE/src/features/lists/hooks/useList.ts`
- `FE/src/features/lists/hooks/useCreateList.ts`
- `FE/src/features/lists/hooks/useUpdateList.ts`
- `FE/src/features/lists/hooks/useDeleteList.ts`
- `FE/src/features/lists/hooks/useReorderLists.ts`

De xuat tao UI:

- `FE/src/pages/board/board-page.tsx`
- `FE/src/components/boards/detail-board.tsx`
- `FE/src/components/lists/list-column.tsx`
- `FE/src/components/lists/create-list-dialog.tsx`
- `FE/src/components/lists/update-list-dialog.tsx`
- `FE/src/components/lists/delete-list-dialog.tsx`

Neu muon di nhanh hon phase 1:

- co the gop `detail-board.tsx` va `list-column.tsx` truoc
- dialog create / edit / delete co the dung chung `AlertDialog` / `Dialog` pattern dang co

## 6. Types can them

Trong `FE/src/features/lists/types/index.ts`

```ts
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: PaginationResponse;
};

export type PaginationResponse = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
};

export type ListStatus = "ACTIVE" | "INACTIVE";

export type ListResponse = {
  id: string;
  name: string;
  description: string;
  order: number;
  boardId: string;
  status: ListStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type GetListsParams = {
  boardId: string;
  page?: number;
  limit?: number;
  name?: string;
  status?: ListStatus;
};

export type CreateListRequest = {
  name: string;
  description?: string;
};

export type UpdateListRequest = {
  name?: string;
  description?: string;
  order?: number;
};

export type ReorderListsRequest = {
  listIds: string[];
};
```

## 7. API layer can them

Trong `FE/src/features/lists/api/list-api.ts`

```ts
import { axiosLocal } from "@/services/axios";
import type {
  ApiResponse,
  CreateListRequest,
  GetListsParams,
  ListResponse,
  ReorderListsRequest,
  UpdateListRequest,
} from "../types";

export const listApi = {
  getAllByBoardId: async ({
    boardId,
    page = 1,
    limit = 50,
    name,
    status,
  }: GetListsParams): Promise<ApiResponse<ListResponse[]>> => {
    const response = await axiosLocal.get<ApiResponse<ListResponse[]>>(
      `/list/${boardId}/getAllList`,
      {
        params: {
          page,
          limit,
          name: name || undefined,
          status: status || undefined,
        },
      },
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ListResponse>> => {
    const response = await axiosLocal.get<ApiResponse<ListResponse>>(
      `/list/${id}/getListById`,
    );
    return response.data;
  },

  create: async (
    boardId: string,
    data: CreateListRequest,
  ): Promise<ApiResponse<ListResponse>> => {
    const response = await axiosLocal.post<ApiResponse<ListResponse>>(
      `/board/${boardId}/create-lists`,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateListRequest,
  ): Promise<ApiResponse<ListResponse>> => {
    const response = await axiosLocal.put<ApiResponse<ListResponse>>(
      `/list/${id}/update`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<ListResponse>> => {
    const response = await axiosLocal.delete<ApiResponse<ListResponse>>(
      `/list/${id}/delete`,
    );
    return response.data;
  },

  reorder: async (
    boardId: string,
    data: ReorderListsRequest,
  ): Promise<ApiResponse<ListResponse[]>> => {
    const response = await axiosLocal.patch<ApiResponse<ListResponse[]>>(
      `/list/${boardId}/reorderList`,
      data,
    );
    return response.data;
  },
};
```

## 8. React Query hooks

Nen lam giong pattern `boards` hien tai.

### `useLists`

Query key de xuat:

```ts
["lists", boardId, page, limit, name, status]
```

Dung cho:

- load columns khi vao board detail
- search list theo ten neu can
- filter status neu can

Luu y:

- phase board detail nen de `limit` lon, vi man kanban can full columns de reorder
- de xuat `limit = 50` hoac `100`
- neu board co rat nhieu list thi phai tinh tiep strategy pagination ngang, nhung phase 1 co the chua can

### `useList`

Dung khi can lay chi tiet 1 list rieng cho modal edit.

Neu UI da co data list trong board page thi phase 1 co the bo hook nay, chi edit truc tiep tu list object da load.

### `useCreateList`

Behavior:

- goi `listApi.create`
- toast success
- invalidate `["lists", boardId]`

### `useUpdateList`

Behavior:

- goi `listApi.update`
- toast success
- invalidate `["lists", boardId]`

### `useDeleteList`

Behavior:

- goi `listApi.delete`
- toast success
- invalidate `["lists", boardId]`

### `useReorderLists`

Behavior:

- goi `listApi.reorder`
- co the optimistic update local order truoc
- neu muon di an toan, phase 1 chi can mutate xong roi invalidate query

Khuyen nghi:

- phase 1: optimistic update UI + rollback neu fail
- phase 2: fine tune de tranh flicker

## 9. UI cua board detail

## 9.1 Muc tieu man hinh

Board detail page nen hien:

- title cua board
- breadcrumb `Projects / {projectName} / {boardName}`
- search / filter list neu can
- nut `Add list`
- danh sach list render theo chieu ngang
- moi list la 1 column

## 9.2 Data flow de xuat

`board-page.tsx`

- lay `boardId` tu params
- goi `boardApi.getById(boardId)` de lay thong tin board
- goi `useLists(boardId, 1, 50)` de lay tat ca lists
- pass data xuong `detail-board.tsx`

Neu muon giam so file:

- co the render truc tiep trong `board-page.tsx`
- nhung tach `detail-board.tsx` se de maintain hon khi co them tasks sau nay

## 9.3 Render lists

Moi list column nen co:

- ten list
- description ngan neu can
- menu action
- button edit
- button delete

Phase sau khi lam `tasks`:

- list column co the chua cards tasks ben trong

Nhung voi module BE hien tai chi cho `lists`, phase nay moi render shell cua column la du.

## 10. Reorder bang drag and drop

## 10.1 Y nghia nghiep vu

BE dang ho tro reorder o cap `lists`, tuc la doi thu tu cac column trong board.

## 10.2 Tool de xuat

Neu FE chua co DnD:

- uu tien `@dnd-kit/core`
- them `@dnd-kit/sortable`

Ly do:

- phu hop cho horizontal sortable columns
- control state tot
- de mo rong cho task cards sau nay

## 10.3 Flow reorder tren FE

1. user keo tha 1 list sang vi tri moi
2. FE cap nhat local array order ngay lap tuc
3. FE tao `listIds` moi theo thu tu tren UI
4. FE goi `PATCH /list/:boardId/reorderList`
5. neu thanh cong:
   giu state moi hoac invalidate lai query
6. neu that bai:
   rollback local state cu
   toast loi

## 10.4 Rang buoc bat buoc khi goi API reorder

FE phai dam bao:

- `listIds.length === total active lists dang render`
- khong co id trung
- chi gui id cua lists thuoc dung board hien tai

De xuat helper:

```ts
const nextListIds = orderedLists.map((item) => item.id);
```

Khong duoc:

- chi gui 2 item vua swap
- chi gui 1 phan visible data sau khi filter

Luu y rat quan trong:

- neu FE dang filter theo search ma van cho reorder, payload se de sai vi khong con full active lists

=> De xuat UX:

- chi cho reorder khi dang hien full list cua board
- neu dang search / filter thi disable drag hoac an reorder

## 11. Search va pagination

BE co support:

- `name`
- `status`
- `page`
- `limit`

Nhung doi voi board detail render list ngang:

- search theo ten list la hop ly
- pagination ngang cho list co the lam UX ro

Khuyen nghi:

- phase 1: load full list voi `page=1`, `limit=50`
- neu can search thi goi lai query voi `name`
- khi search dang active thi disable reorder

Neu board sau nay co rat nhieu list:

- moi toi uu pagination / virtual scroll

## 12. UX cho create / update / delete

## 12.1 Create list

De xuat:

- button `Add list`
- mo `Dialog`
- fields:
  - `name` required
  - `description` optional

Validation FE:

- `name.trim().length > 0`
- `name.length <= 255`
- `description.length <= 2000`

Success:

- dong dialog
- toast success
- refresh list

## 12.2 Update list

Co 2 huong:

### Option A. Dialog edit

Uu diem:

- de lam
- it bug

### Option B. Inline edit title / description

Uu diem:

- nhanh hon cho kanban UX

Khuyen nghi:

- phase 1 dung `Dialog edit`
- phase 2 moi nang cap inline edit

## 12.3 Delete list

De xuat:

- mo confirm dialog truoc khi xoa
- warning ro rang vi list se bien mat khoi board

Sau khi delete:

- invalidate query lists
- neu dang dung local ordered state cho DnD thi sync lai state tu server

## 13. Checklist file can tao / can sua

## 13.1 Router

- `FE/src/router/constans.ts`
- `FE/src/router/index.tsx`
- `FE/src/pages/board/board-page.tsx`

## 13.2 Features

- `FE/src/features/lists/types/index.ts`
- `FE/src/features/lists/api/list-api.ts`
- `FE/src/features/lists/hooks/useLists.ts`
- `FE/src/features/lists/hooks/useList.ts`
- `FE/src/features/lists/hooks/useCreateList.ts`
- `FE/src/features/lists/hooks/useUpdateList.ts`
- `FE/src/features/lists/hooks/useDeleteList.ts`
- `FE/src/features/lists/hooks/useReorderLists.ts`

## 13.3 Components

- `FE/src/components/boards/detail-board.tsx`
- `FE/src/components/lists/list-column.tsx`
- `FE/src/components/lists/create-list-dialog.tsx`
- `FE/src/components/lists/update-list-dialog.tsx`
- `FE/src/components/lists/delete-list-dialog.tsx`

## 13.4 Integration voi project page

- `FE/src/components/projects/detail-project.tsx`

## 14. Thu tu implement de tranh roi

## Phase 1: Dat duong dan va load duoc data

1. tao route `/board/:boardId`
2. tao `board-page.tsx`
3. tao `features/lists/types`
4. tao `list-api.ts`
5. tao `useLists`
6. render danh sach list text don gian de verify API

Expected outcome:

- click board card vao duoc board detail
- load duoc lists theo `boardId`

## Phase 2: CRUD co ban

1. them `useCreateList`
2. them `useUpdateList`
3. them `useDeleteList`
4. tao dialog create / edit / delete
5. invalidate query sau moi mutation

Expected outcome:

- user tao, sua, xoa list duoc

## Phase 3: DnD reorder

1. them thu vien DnD neu chua co
2. render horizontal sortable lists
3. them local ordered state
4. call `useReorderLists`
5. rollback neu fail

Expected outcome:

- keo tha list xong BE luu thu tu moi dung theo toan bo board

## Phase 4: UX polish

1. disable reorder khi dang search
2. loading skeleton cho board detail
3. empty state khi board chua co list
4. toast message ro rang
5. optimistic UI neu can

## 15. Rui ro can luu y

## 15.1 Route create list khac voi nhom list

Rui ro:

- FE de quen va goi nham `POST /list/...`

Cach tranh:

- comment ro trong `list-api.ts`
- dat method `create(boardId, data)` de nhin vao la thay board-scoped

## 15.2 Reorder khong chap nhan partial list

Rui ro:

- UI dang filter / search ma van goi reorder

Cach tranh:

- chi cho reorder tren state full list
- disable drag khi co search term

## 15.3 Pagination co the xung dot voi kanban UI

Rui ro:

- query co `page/limit`, nhung DnD can full data

Cach tranh:

- phase 1 luon load 1 page lon cho board detail

## 15.4 FE hien tai chua co task cards

Rui ro:

- user co the ky vong list column chua task ngay

Cach xu ly:

- xac dinh ro phase nay chi implement `lists`
- de san component structure de them `tasks` vao sau

## 16. Ket luan

De implement `lists` vao FE hien tai, huong dung nhat la:

1. mo them man `board detail`
2. tao feature `lists` rieng giong pattern `boards`
3. noi navigation tu `project detail` sang `board detail`
4. implement CRUD lists truoc
5. sau do them DnD reorder voi payload full `listIds`

Neu lam theo thu tu nay, FE se di dung voi BE hien tai va cung de mo rong sang `tasks` o buoc tiep theo.
