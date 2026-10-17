# Multiplayer theo khu: đủ cho 50 người

Ngày: 2026-10-17 · Trạng thái: đã duyệt thiết kế trong chat (giữ danh sách online toàn server)

## Vấn đề

`src/lib/multiplayer.ts` phát vị trí 5 lần/giây lên một kênh chung, mọi người nhận của tất cả. Supabase tính một tin
broadcast tới N người nghe là 1 + N tin, nên tải là 5 × N² tin/giây: 50 người là ~12.500 tin/giây, trong khi gói Free
chỉ cho 100 và Pro 500 (vượt thì bị ngắt kết nối). Ngoài ra người chơi ở nông trại riêng thấy nhau, người chơi khác
trôi đi không có bước chân, và mỗi tin nhận được làm React vẽ lại cả nhân vật.

## Mục tiêu

- 50 người online với gói Pro; gói Free đủ khi người chơi rải ở các khu (xem Ngân sách tin).
- Ai ở khu công cộng nào thì chỉ thấy (và chỉ tốn tin cho) người cùng khu; ở nông trại riêng thì không thấy ai.
- Sảnh vẫn liệt kê mọi người đang online, đang ở khu nào, và nút Ghé thăm khu của họ.
- Chuyển động mượt, có bước chân.

Ngoài phạm vi: chia phòng khi một khu quá đông, server realtime riêng, chống giả mạo tin (kênh broadcast không xác thực
người gửi), giới hạn tần suất chat.

## Kênh

| Kênh | Vào khi | Nội dung |
|---|---|---|
| `sunny_zone_v4:<khu>` | đang ở khu công cộng (park, beach, mall, cinema, casino); rời khu thì rời kênh | sự kiện `p`: trạng thái người chơi |
| `sunny_lobby_v4` | luôn | Presence `{ n, w, l }` (tên, khu, cấp) — chỉ `track()` lại khi đổi khu, tên hoặc cấp; sự kiện `chat` |

Không có Supabase (các tab cùng trình duyệt): hai BroadcastChannel `sunny_zone_v4` và `sunny_lobby_v4`; tin vị trí mang
thêm khu `w` để bên nhận bỏ qua khu khác, danh sách online thay Presence bằng tin `roster` mỗi 5 giây (hết hạn sau 15 giây).
Hậu tố `v4` tách hẳn khỏi các tab còn chạy bản cũ (`v3`).

## Tin trạng thái (`p`)

`{ u, n, w, x, z, vx, vz, r, c, l, m?, e?, bye? }` — mã người chơi, tên (≤ 24 ký tự), khu, vị trí, vận tốc (đơn vị/giây,
0 khi đứng), hướng mặt, trang phục, cấp, bong bóng chat (≤ 120 ký tự), biểu cảm, và `bye` khi rời khu. Gửi đủ thông tin
trong mỗi tin vì Supabase tính theo số tin, không theo dung lượng; người mới vào khu dựng được nhân vật từ tin đầu tiên
nhận được. Tin sai kiểu, số không hữu hạn, khu lạ đều bị bỏ qua; chuỗi bị cắt ngắn.

### Khi nào gửi (lấy mẫu vị trí người chơi mỗi 100 ms, vận tốc tính từ hai mẫu liền nhau)

- vừa vào khu, hoặc tên / trang phục / cấp / bong bóng chat / biểu cảm đổi: gửi ngay;
- bắt đầu đi hoặc dừng lại (tốc độ vượt / xuống dưới 0,2): gửi ngay;
- đang đi: đổi hướng quá 20° hoặc tốc độ đổi quá 25%, cách tin trước ít nhất 250 ms; và cứ 1 giây một tin;
- đứng yên: 8 giây một tin;
- rời khu: một tin `bye`.

### Bên nhận

- Giữ vị trí ở một bảng ngoài React (`livePeers` trong `multiplayer.ts`); mỗi khung `RemotePlayers` đọc từ đó: vị trí
  ngoại suy `x + vx × t` (t tính từ lúc nhận, tối đa 1,5 giây), làm mượt về vị trí đó, quay mặt theo hướng đi (đứng yên
  thì theo `r`), chân bước khi đang đi.
- Store (`remotePlayers`) chỉ đổi khi có người vào / ra khu hoặc đổi tên, trang phục, cấp, bong bóng chat, biểu cảm.
- Không nghe thấy ai 25 giây thì xoá; nhận `bye` thì xoá ngay.

## Store và giao diện

- `remotePlayers: Record<uid, RemotePlayer>`: người cùng khu (thông tin để vẽ, không có vị trí).
- `onlinePlayers: Record<uid, OnlinePlayer>` mới: mọi người đang online `{ uid, name, world, level }`.
- Số người trên thanh trên cùng: bạn + người cùng khu + cư dân + khách (đúng như comment hiện có).
- Sảnh (`AuthModal`): danh sách từ `onlinePlayers`; người đang ở nông trại hiện "🏡 Ở nông trại", không có nút Ghé thăm.
- Chat vẫn chung toàn server, gửi ngay khi người chơi bấm gửi (không còn dò mỗi 200 ms).

## Ngân sách tin (50 người online, 40% người trong khu đang đi)

Một khu N người tốn khoảng N² × 0,55 tin/giây.

| Tình huống | Tin/giây | Free (100) | Pro (500) |
|---|---|---|---|
| 25 ở nông trại, 25 rải đều 5 khu | ~70 + sảnh ~15 | sát ngưỡng | đủ |
| 25 người tụ một khu | ~350 | không | đủ |
| Thiết kế cũ | ~12.500 | không | không |

## Kiểm thử

1. Vitest, viết trước khi code — `src/lib/netSync.test.ts`:
   - quyết định gửi: đi thẳng 10 giây ≈ 10 tin; rẽ quá 20° gửi ngay (không dày hơn 250 ms); dừng gửi ngay; đứng yên
     8 giây một tin; đổi trang phục / chat gửi ngay;
   - ngoại suy vị trí, giới hạn 1,5 giây;
   - kiểm tra tin: bỏ tin hỏng, số vô hạn, khu lạ; cắt chuỗi dài.
2. Vitest cho phần kênh với client Supabase giả: đổi khu thì gửi `bye`, rời kênh cũ, vào kênh mới; ở nông trại không vào
   kênh khu nào; Presence `track()` lại khi đổi khu.
3. Chạy thật bản production, 3 tab (BroadcastChannel): cùng khu thấy nhau, nông trại không; chat qua lại giữa các khu;
   Sảnh liệt kê đủ người kèm khu; đếm tin/giây (đứng yên ≈ 0,125, đi bộ ≈ 1–2); nhân vật bên kia bám đường đi của người
   gửi và có bước chân.
4. `tsc` sạch, toàn bộ vitest xanh.

## Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Người mới vào khu chưa thấy người đứng yên | Thấy trong tối đa 8 giây (tin định kỳ); người đang đi thấy trong 1 giây |
| Ngoại suy chạy quá đà khi mất tin | Giới hạn 1,5 giây rồi đứng chờ tin mới |
| Presence vượt hạn mức khi cả nhóm vào cùng lúc | Chỉ `track()` khi đổi khu / tên / cấp; vượt thì chỉ danh sách online chậm, kênh khu không ảnh hưởng |
| Không thử được Supabase thật khi chưa có project | Phần kênh có test với client giả; thử thật khi có URL và anon key |
