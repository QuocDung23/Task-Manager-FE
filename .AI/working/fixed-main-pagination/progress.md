# Tien do co dinh pagination trang Projects

## Trang thai

Hoan tat implementation va kiem tra ma nguon.

## Cong viec da hoan thanh

- Khoa `ViewMainPage` trong chieu cao `calc(100dvh - 4rem)` de tong chieu cao khop voi viewport sau padding cua `MainLayout`.
- Them `min-h-0` va `overflow-hidden` cho viewport shell de grid khong day document cao hon viewport.
- Chuyen grid project thanh vung noi dung `flex-1` co `overflow-y-auto`, `overscroll-contain` va scrollbar gutter on dinh.
- Dat pagination trong footer `shrink-0`, can giua va nam o day viewport shell.
- Thay `window.scrollTo` bang `scrollTo` tren chinh grid project khi doi trang.
- Ton trong `prefers-reduced-motion`: grid cuon tuc thi khi nguoi dung giam motion, cuon muot trong truong hop con lai.
- Dua viec reset page khi tim kiem vao callback debounce de tranh `setState` dong bo trong effect.
- Dieu chinh dependency cua `useMemo` de React Compiler co the bao toan memoization.

## File da tao hoac chinh sua

- `src/components/mainSpace/view-main.tsx`
- `.AI/working/fixed-main-pagination/plan.md`
- `.AI/working/fixed-main-pagination/progress.md`

## Ket qua kiem tra

- `npm run build`: Dat.
- `npx eslint src/components/mainSpace/view-main.tsx`: Dat.
- `git diff --check -- src/components/mainSpace/view-main.tsx`: Dat.
- `npm run lint`: Chua dat do 34 loi ton tai san o cac file ngoai pham vi feature. `view-main.tsx` khong con loi.
- Full `git diff --check`: Chua dat do whitespace ton tai san trong `.gitignore` va `src/components/mainSpace/createProject-main.tsx`. File feature dat khi kiem tra rieng.
- Vite dev server: Dang chay tai `http://127.0.0.1:5174/`.
- QA truc quan: Khong the chay vi browser runtime khong kha dung trong phien lam viec. Khong su dung cong cu browser khac de thay the trai voi quy trinh cua Browser skill.

## Ghi chu build

Vite bao canh bao bundle JavaScript lon hon 500 kB. Day la canh bao hieu nang hien co, khong lam build that bai va khong phat sinh tu thay doi layout nay.

## Dieu chinh bo sung sau khi kiem tra thuc te

- Chuyen pagination sang lop `absolute` tai `bottom-0`, co chieu cao co dinh `5rem` va can giua bang `inset-x-0`.
- Grid project luon chua san `margin-bottom: 5rem`, nen so luong card khong the tac dong den toa do cua pagination.
- Ghi de `margin-top` noi bo cua `PaginationLayout` ve `0` trong rieng man hinh Projects.
- Them `placeholderData: keepPreviousData` cho `useProjects`, giu pagination trong DOM khi query dang chuyen tu page cu sang page moi.
- `npx eslint src/components/mainSpace/view-main.tsx src/features/projects/hooks/useProjects.ts`: Dat.
- `npm run build`: Dat sau thay doi bo sung.
- `git diff --check -- src/components/mainSpace/view-main.tsx src/features/projects/hooks/useProjects.ts`: Dat.
