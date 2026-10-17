# Cài game như app (PWA) và chơi offline

Ngày: 2026-10-17 · Trạng thái: đã duyệt thiết kế trong chat

## Mục tiêu

- Người chơi cài Sunny Farm 3D vào màn hình chính (điện thoại, máy tính) và mở như một app, không có thanh trình duyệt.
- Sau một lần mở có mạng, game mở được và chơi được khi mất mạng, bằng save trên máy.
- Khi có mạng, người chơi luôn nhận bản mới nhất; không bao giờ kẹt ở bản build cũ.

Ngoài phạm vi: thông báo đẩy (push), đồng bộ nền, chỉ báo "đang offline" trên HUD, chơi các tính năng online khi mất mạng.

## Thiết kế

### Manifest và icon

`src/app/manifest.ts` (quy ước file của Next 14, tự sinh `/manifest.webmanifest` và `<link rel="manifest">`):

| Trường | Giá trị |
|---|---|
| `name` | Sunny Farm 3D |
| `short_name` | Sunny Farm |
| `description` | như `metadata.description` |
| `id`, `start_url`, `scope` | `/` |
| `display` | `standalone` — HUD chưa né tai thỏ/notch nên không dùng `fullscreen` |
| `orientation` | `any` |
| `background_color`, `theme_color` | `#0f172a` (giống màn hình tải) |
| `lang` | `vi` |
| `icons` | `/icon-192.png`, `/icon-512.png` (purpose `any`), `/icon-maskable-512.png` (purpose `maskable`) |

Icon PNG xuất từ hình đóa hướng dương của `src/app/icon.svg`; bản maskable là hình vuông tràn nền trời, phần hình thu vào vùng an toàn (vòng tròn bán kính 40% ở giữa). Đặt trong `public/`.

`src/app/layout.tsx`: `viewport.themeColor = '#0f172a'`; `metadata.appleWebApp = { capable: true, title: 'Sunny Farm', statusBarStyle: 'default' }` (iOS mở từ màn hình chính không có thanh Safari, nội dung nằm dưới thanh trạng thái).

### Service worker — `public/sw.js`

JS thuần, không thư viện, phục vụ ở `/sw.js` (phạm vi `/`). Một cache tên `sunny-farm-v1` (chỉ đổi khi đổi cách lưu).

Chỉ xử lý request GET cùng nguồn (same-origin); mọi request khác (Supabase, đăng nhập Google, CDN) đi thẳng mạng, không qua cache.

| Loại request | Cách xử lý |
|---|---|
| Điều hướng trang (`mode: navigate`) | Mạng trước. Thành công: lưu bản sao dưới khoá `/`, trả về. Lỗi mạng hoặc quá 4 s: trả `/` đã lưu; chưa có thì trả lỗi |
| `/_next/static/…` (tên file có mã hash) | Cache trước: có thì trả luôn; chưa có thì tải, lưu, trả |
| File tĩnh khác có đuôi (icon, manifest, `/models/…`) | Trả bản đã lưu ngay nếu có, đồng thời tải bản mới ở nền để lần sau dùng (stale-while-revalidate) |
| Còn lại | Không can thiệp |

- `install`: lưu trước `/`, rồi `skipWaiting()`.
- `activate`: xoá các cache tên khác, `clients.claim()`.
- Giới hạn: tối đa 150 mục; vượt thì xoá các mục cũ nhất (thứ tự chèn), riêng `/` không bao giờ bị xoá.
- Tin nhắn `{ type: 'precache', urls }` từ trang: lưu các URL cùng nguồn thuộc hai loại file tĩnh ở trên mà cache chưa có. Nhờ vậy ngay lần mở đầu tiên (trước khi service worker kiểm soát trang) mọi file game đã tải cũng được lưu.

### Đăng ký và nút cài — `src/lib/offline.ts`

- `useOfflineSupport()` gọi trong `src/app/page.tsx` cạnh `useMultiplayerSync()`, `useCloudSync()`…
  - Bản production: sau sự kiện `load`, `navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })`; khi `ready`, gửi `precache` với các URL lấy từ `performance.getEntriesByType('resource')`.
  - `npm run dev`: gỡ mọi service worker đã đăng ký cho trang (tránh phục vụ code dev đã lưu).
- `useInstallPrompt()` → `{ canInstall, install }`: giữ sự kiện `beforeinstallprompt` (Chrome, Edge, Android), ẩn sau khi cài (`appinstalled`) hoặc khi đang chạy dạng app (`display-mode: standalone`).
- Nút **📲 Cài game** trên `TopBar`, cạnh các nút nhỏ (âm thanh, chụp ảnh); chỉ hiện khi `canInstall`. iOS không có API này: cài qua Chia sẻ → Thêm vào MH chính.

### Khi mất mạng

Game mở từ cache và chơi bằng save trong localStorage. Chat, Cloud Save, người chơi khác, xếp hạng, thăm nông trại người chơi tạm dừng — lỗi mạng của chúng đã được bắt sẵn (thông báo hoặc thử lại sau). Có mạng lại thì chạy tiếp.

## Kiểm thử

1. `tsc` sạch, toàn bộ vitest xanh.
2. Bản production (build ở bản sao tạm, không đụng `.next` của dev server): Chrome DevTools protocol `Page.getInstallabilityErrors` trả rỗng, `Page.getAppManifest` không lỗi; HTML có `<link rel="manifest">`, thẻ `apple-mobile-web-app-*`, `theme-color`.
3. Offline: mở một lần có mạng, chờ service worker sẵn sàng và lưu xong → ngắt mạng (`context.setOffline`) → tải lại: game hiện, cày/trồng được, không lỗi console.
4. Cập nhật: build bản khác → mở lại có mạng: trang và file JS là của bản mới.
5. Dev server (`localhost:3000`): không có service worker nào sau khi tải trang.
6. Nút cài: hiện khi trình duyệt phát `beforeinstallprompt`, ẩn sau khi cài.

## Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Người chơi kẹt bản cũ sau khi deploy | HTML lấy mạng trước; file JS/CSS đổi tên theo mỗi build; `sw.js` luôn tải mới (`updateViaCache: 'none'`) |
| Offline thiếu file chưa từng tải | Toàn bộ code game tải ngay lúc mở (các cửa sổ import tĩnh) và được gửi `precache` |
| Code dev bị lưu cache | Không đăng ký ở dev; dev còn gỡ service worker cũ |
| Cache phình to qua nhiều bản build | Tối đa 150 mục, xoá cũ nhất trước |
