# Bug review: project realtime `delete`, `update`, `addMember`

## Ket luan

Ba event da co contract, BE emit va FE listener. Bug khong nam o ten event ma nam o
pham vi delivery:

- `project:updated` va `project:deleted` chi duoc emit vao `project:{projectId}`.
- FE chi join room nay khi mo trang project detail.
- Main project list khong join project room, nen tab dang o main page khong nhan event.
- `project:member_added` cung chi emit vao project room. User vua duoc add chua o
  room nay va truoc mutation con chua co quyen join room, nen chinh user moi khong
  nhan duoc event.
- Ke ca emit `project:member_added` vao `user:{newUserId}`, payload hien tai chi co
  member, khong co project canonical. FE handler chi patch members cache, khong the
  them project vao project-list cache cua user moi.

Do do behavior "chi realtime khi dang mo project detail" la dung voi code hien
tai, nhung khong dung voi ky vong realtime cua project list.

## Findings

### [P1] `update` va `delete` khong den project-list client

**BE:** `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts:605-644`

Ca hai publisher chi gui vao:

```ts
this.io.to(projectRoom(args.projectId)).emit("project:updated", payload);
this.io.to(projectRoom(args.projectId)).emit("project:deleted", payload);
```

**FE:**

- `src/features/realtime/hooks/useProjectRoom.ts:18-24` chi acquire mot project room.
- `src/components/projects/detail-project.tsx:53-56` la noi duy nhat mount hook nay.
- `src/components/mainSpace/view-main.tsx:40-50` chi fetch project list, khong join
  bat ky project room nao.

`registerProjectEventHandlers` trong
`src/features/realtime/handlers/project-event-handlers.ts:101-162` da dung va duoc
mount global. Tuy nhien listener khong the xu ly event ma socket khong duoc server
gui toi.

**Anh huong:** user B dang o main page se giu project card cu sau khi user A update,
va van thay project da bi delete cho den khi refetch/reload.

### [P1] User moi khong nhan duoc `addMember`

**BE:** `Manage -Task/BE/src/modules/realtime/realtime-event.service.ts:647-669`

`project:member_added` chi emit vao `project:{projectId}`. Truoc khi DB commit add
member, user moi khong co project membership; vi vay user do khong the join room qua
`project:join`. Sau commit, server cung khong tu dong dua cac socket hien co cua user
do vao project room.

Moi socket da tu join `user:{userId}` khi connect tai
`Manage -Task/BE/src/modules/realtime/socket.server.ts:64-68`, nhung publisher khong
emit event add-member vao user room cua member moi.

**Anh huong:** khi admin add user B, project khong xuat hien realtime trong project
list cua B. Reload/refetch moi doc duoc membership vua tao tu REST API.

### [P1] Payload `member_added` khong du de them project vao list cua user moi

Contract hien tai:

```ts
type ProjectMemberAddedPayload = RealtimeEnvelope<{
  projectId: string;
  member: ProjectMemberResponseDto;
}>;
```

FE handler tai `src/features/realtime/handlers/project-event-handlers.ts:123-127`
chi goi `applyProjectMemberAdded`, tuc patch member list/detail count. No khong goi
`applyProjectCreated` va payload cung khong co `ProjectResponse` de goi an toan.

Vi endpoint project list tra cac project ma user own **hoac** la active member
(`Manage -Task/BE/src/modules/projects/projects.repository.ts:24-61`), add-member la
mot event lam thay doi membership cua project list. Reducer hien tai chua model hoa
thay doi do.

### [P2] Reconcile hien tai khong the bu cac event bi miss o main page

Reconcile chi chay sau khi `project:join` ack trong project detail. Main page khong
co join/ack, khong co invalidation khi socket reconnect, va `useProjects` khong co
polling. Vi vay comment trong BE noi "client khac refetch qua reconcile" khong dung
cho project-list client.

## Huong fix de xuat

Dung `user:{userId}` lam kenh project-list/access event, va giu
`project:{projectId}` cho activity ben trong project detail.

### Backend

1. Lay danh sach userId co access project (owner + active project members) truoc
   khi update/delete. Voi delete, bat buoc snapshot recipients **truoc** soft-delete
   de query sau delete khong lam mat tap nguoi nhan.
2. `project:updated`: emit cung mot envelope/eventId toi project room va user rooms
   cua tat ca recipients. Socket.IO chain room co union semantics, socket nam trong
   nhieu room chi nhan mot lan.
3. `project:deleted`: emit toi project room va cac user rooms da snapshot truoc
   delete.
4. `project:member_added`: payload nen kem project canonical va emit:
   - project room cho cac client dang mo detail;
   - `user:{newMember.userId}` de user moi them project vao list.
5. Khong query recipient list ben trong publisher. Service/repository resolve du
   lieu da authorize va truyen vao publisher de flow data/test ro rang.

Contract de xuat:

```ts
type ProjectMemberAddedPayload = RealtimeEnvelope<{
  projectId: string;
  project: ProjectResponseDto;
  member: ProjectMemberResponseDto;
}>;
```

Neu muon tach semantics sach hon, co the them event `project:access_granted` va
`project:access_revoked` cho user room. Day la huong tot hon khi sau nay ho tro
remove-member/disable-member; con mo rong `member_added` la thay doi nho nhat.

### Frontend

1. Mirror contract moi co `data.project`.
2. Trong `handleMemberAdded`, sau validate/dedupe:
   - goi `applyProjectMemberAdded` cho members cache;
   - neu `member.userId` la current user, goi `applyProjectCreated` voi project
     canonical, hoac invalidate `projectKeys.lists()` neu khong muon dua identity
     current user vao handler.
3. `project:updated` va `project:deleted` tiep tuc dung reducer hien co; khi BE fan-out
   qua user room, main page se nhan va patch/remove ngay.
4. Khi reconnect, invalidate `projectKeys.lists()` mot lan de bu khoang disconnect.
   Rejoin room khong the replay project-list event da mat.
5. Sau `project:deleted`, neu route hien tai dang o project vua delete, navigate ve
   main page hoac hien access-removed state. Cache removal mot minh khong doi route.

## Khong de xuat

Khong nen map moi project card thanh `useProjectRoom(project.id)` tren main page:

- mot page se tao toi 12 join/leave va tang theo page size;
- user moi van khong biet projectId de join truoc khi nhan add-member;
- project ngoai page hien tai van bi miss update/delete, lam cache pagination cu;
- coupling project-list delivery vao visible UI thay vi access cua user.

## Reproduction va acceptance tests

Dung hai browser profile/socket khac nhau, A la owner va B la member.

1. A va B cung dung o main project list. A update project. Card cua B doi name va
   description ma khong reload/network refetch bat buoc.
2. A delete project. Card cua B bien mat, pagination `totalItems/totalPages` cap nhat.
3. B dang online o main page nhung chua la member. A add B. Project xuat hien trong
   list cua B ngay lap tuc va member cache cua A khong bi count hai lan.
4. B dang offline khi duoc add. B connect/login sau do va REST initial query van tra
   project dung.
5. B mat mang, A update/delete, sau do B reconnect. Project lists duoc invalidate va
   hoi tu ve state server.
6. B dang o project detail khi A delete. B nhan event, cache bi xoa va UI roi khoi
   route khong con quyen truy cap.
7. Kiem tra mot socket dang nam trong ca `user:*` va `project:*` chi apply mot event
   mot lan; `eventId` dedupe o FE la lop bao ve thu hai.

## Thu tu implement

1. Them repository query recipients + test owner/member active/inactive.
2. Mo rong BE payload/publisher va unit test room fan-out.
3. Mirror FE contract + guard + reducer cho project-list access.
4. Them reconnect invalidation.
5. Chay test hai session cho update, delete, add-member va delete-while-in-detail.

## Ghi chu worktree

Tai thoi diem review, FE dang co thay doi chua commit trong
`useAddMemberProject.ts`, `project-cache.ts`, `useProjectRoom.ts` va
`board-api.ts`. Review nay khong sua/ghi de cac thay doi do.
