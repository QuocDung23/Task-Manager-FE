# Ke hoach co dinh pagination trang Projects

## Muc tieu

- Loai bo thanh cuon cua toan bo trang Projects khi danh sach co nhieu project.
- Giu pagination luon nam chinh giua, sat vung duoi cua viewport va khong bi noi dung day xuong.
- Van cho phep truy cap day du cac project tren man hinh co chieu cao thap bang cach chi cuon vung danh sach noi dung khi can.
- Bao toan giao dien, animation, dark mode va luong phan trang hien co.

## Pham vi file

### File source se chinh sua sau khi duoc duyet

- `src/components/mainSpace/view-main.tsx`
  - Khoa chieu cao component theo viewport dong (`100dvh`) sau khi tru padding cua layout cha.
  - Dat `min-h-0` va `overflow-hidden` tren page container de document khong tang chieu cao theo grid.
  - Chuyen grid project thanh vung `flex-1`, `min-h-0`, `overflow-y-auto` va `overscroll-contain`.
  - Dat pagination trong footer `shrink-0`, can giua va co khoang cach day on dinh.
  - Khi doi trang, dua vung grid noi bo ve dau thay vi cuon `window`.
  - Bao dam loading/error state cung nam trong khung viewport on dinh.

### File log

- `.AI/working/fixed-main-pagination/progress.md`
  - Ghi lai cac thay doi da hoan tat, file da sua va ket qua kiem tra.

## Trinh tu thuc hien

1. Them `ref` co kieu ro rang cho vung danh sach project va tao handler doi trang.
2. Chuyen root cua `ViewMainPage` sang viewport shell co chieu cao co dinh, khong cho overflow ra document.
3. Cho grid chiem phan khong gian con lai va chi scroll noi bo khi noi dung vuot qua chieu cao kha dung.
4. Dat pagination o footer khong co gian, can giua theo chieu ngang cua content area.
5. Kiem tra responsive tai mobile, tablet va desktop; xac nhan pagination khong dich chuyen khi so luong project thay doi.
6. Chay `npm run build` va `npm run lint`; sua cac loi phat sinh trong pham vi thay doi.
7. Chay dev server va kiem tra truc quan neu moi truong dang nhap/API cho phep.
8. Ghi progress log va tong ket ket qua.

## Tieu chi hoan thanh

- Document khong co vertical scrollbar tren route Projects.
- Pagination luon nam giua va o day content viewport khi co tu 2 trang tro len.
- Grid khong day pagination ra khoi viewport.
- Neu chieu cao khong du, chi grid project cuon; header, toolbar va pagination giu nguyen vi tri.
- Doi trang dua grid ve dau va khong goi `window.scrollTo`.
- Build va lint vuot qua hoac moi loi ton tai san duoc ghi ro.

