# Review: Identify the project/board owner or member (Commit fbe3c9d)

> Scope: `src/lib/membership.ts`, `src/components/ui/membership-badge.tsx`,
> `src/components/mainSpace/view-main.tsx`, `src/components/mainSpace/projectCard-main.tsx`,
> `src/components/projects/detail-project.tsx`, `src/components/projects/boardCard-project.tsx`,
> `src/features/boards/types/index.ts`
> Commit: `fbe3c9d` ("feat: Identify the project/board owner or member")
> Ngày review: 2026-09-16

## Tóm tắt

Commit triển khai plan `project-board-owner-member-distinction` (P0 FE-only): phân biệt
project/board **do current user tạo** (badge "Created by me") với **được chia sẻ**
(badge "Shared with me"), dựa trên so sánh `entity.userId` với `userId` trong JWT.

Data flow đã được verify từ FE type → API → BE DTO/repository:

- `ProjectResponse.userId`: field có sẵn, luôn trả về (required).
- `BoardResponse.userId`: **mới thêm vào** type FE — BE đã trả sẵn (board.res.ts).
- JWT: claim `userId` (auth.service.ts) — `authStorage.getTokenPayload()?.userId` khớp.

→ Logic owner/member hiện **đúng với hợp đồng BE**. Không có bug chức năng nghiêm trọng.

## Findings

### 1. 🟡 Thấp — `resolveMembership` gán nhãn "Shared with me" khi thiếu owner id

`src/lib/membership.ts:13-16`

```ts
if (currentUserId && entityOwnerId === currentUserId) {
  return "created-by-me";
}
return "shared-with-me"; // ← cả khi entityOwnerId hoặc currentUserId null
```

Khi `entityOwnerId` là `null/undefined` hoặc token không parse được `userId`, hàm trả
`"shared-with-me"` và card hiển thị badge "Shared with me" một cách tự tin.

**Hiện tại an toàn:** cả 2 chỗ gọi đều truyền `project.userId` / `board.userId` (field
required, BE luôn trả) và `useMemo` chỉ chạy với token hợp lệ. **Rủi ro chỉ xảy ra nếu**
hợp đồng API drift — ví dụ endpoint realtime payload hoặc response mới thiếu `userId` —
khi đó badge hiển thị sai kiểu "loud" thay vì ẩn đi.

**Đề xuất:** trả về `null` (hoặc optional) khi không biết owner, và để
`MembershipBadge` ẩn badge (`if (typeof owned !== "boolean") return null` đã có sẵn ở
badge, chỉ cần call site truyền `undefined` thay vì `false` khi thiếu thông tin).

### 2. 🟢 Thấp — `isCreatedByCurrentUser` là dead code

`src/lib/membership.ts:19-24`

Hàm được export nhưng **không được dùng ở bất kỳ đâu** — cả 2 call site đều gọi trực
tiếp `resolveMembership(...) === "created-by-me"`. Nên dùng lại ở 2 call site hoặc bỏ đi.

### 3. 🟢 Thấp — `currentUserId` bị "đóng cứng" tại thời điểm mount

`src/components/mainSpace/view-main.tsx:32`, `src/components/projects/detail-project.tsx:47`

```ts
const currentUserId = useMemo(() => getCurrentUserId(), []);
```

Empty deps → không đọc lại token khi page đã mount. Nếu current user đổi (logout →
login account khác) mà **không remount page**, mọi badge giữ nguyên ownership cũ.
Trong SPA này, đổi user thường kéo theo remount nên hiếm gặp. Nếu muốn an toàn, đọc
`currentUserId` qua `useCurrentUser()` (query `/user/me`) hoặc subscribe
`auth-token-changed`.

### 4. 🟢 Thấp — Side effect trong render-phase khi token hết hạn

`src/lib/membership.ts:5-7` → `authStorage.ts:48-58, 69-72`

`getCurrentUserId()` → `getValidToken()` — nếu token hết hạn sẽ `clearToken()` →
`localStorage.removeItem` + `window.dispatchEvent(AUTH_TOKEN_CHANGED_EVENT)` ngay trong
render (useMemo). `useTaskSocket` có lắng nghe event này để reconnect (`useTaskSocket.ts`).
React Strict Mode (dev) sẽ double-fire. Chỉ xảy ra khi token hết hạn trong lúc page mở.
Có thể tránh bằng cách wrap vào `useEffect` + state, hoặc chấp nhận vì hậu quả nhỏ.

### 5. 🟢 Thấp (cosmetic) — Có thể chồng lấn badge với nút menu

`projectCard-main.tsx:62-67`, `boardCard-project.tsx:62-67` vs `view-main.tsx:184-188`

Badge nằm cuối hàng tiêu đề (right-aligned), trong khi `MenuSettingProject` /
`MenuSettingBoard` được absolute tại `right-3.5 top-3.5 z-10` cùng góc phải trên của card.
Trên geometry card thường (ảnh họa), glyph menu (`size-8`) có thể phủ lên cạnh phải của
badge "Created by me". Nên xem trực quan; nếu vướng, thêm right padding cho hàng tiêu đề
hoặc đặt badge dưới tiêu đề description.

## Đã verify — không phải issue

- Guard `owned != null` trong cả 2 card: call site luôn truyền boolean (vì
  `resolveMembership` luôn trả 1 trong 2 giá trị) → badge luôn render — đúng chủ đích.
- Claim `userId` đồng nhất: `authStorage` dùng `payload.userId`; BE ký token với `userId`
  → 2 bên khớp.
- Ternaries lặp owner/member class giữa `projectCard-main.tsx` và `boardCard-project.tsx`
  là copy-paste nhưng nhỏ và nhất quán — chấp nhận được.

## Kết luận

Commit chạy đúng với hợp đồng BE hiện tại; không có bug chức năng. Toàn bộ issue ở mức
thấp. Ưu tiên xử lý **#1** (làm fallback label rõ ràng khi thiếu `entityOwnerId`) vì đây
là nơi duy nhất có thể trở thành bug nếu API drift; **#2** dọn dead code ngay khi sửa.
#3/#4 chỉ bảo nếu có kế hoạch đổi user "in-place" trong SPA.