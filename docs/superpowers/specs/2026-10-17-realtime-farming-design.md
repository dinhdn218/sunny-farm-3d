# Thời gian thực: một đồng hồ chung, cây lớn theo giờ thật

Ngày: 2026-10-17 · Trạng thái: đã duyệt thiết kế trong chat (4 phần)

## Vấn đề

Game đang chạy bằng hai đồng hồ:

- **Giờ thật (ngày của máy):** bảng xếp hạng tuần, lễ hội, quà đăng nhập, vòng quay casino, hàng xóm tưới giúp và thả tim
  (một lần mỗi ngày theo giờ Việt Nam), máy chế biến.
- **"Ngày ngủ"** (biến `day`, chỉ tăng khi bấm 🛌 hoặc vào nhà): ruộng, mùa, thời tiết, giá chợ, nhiệm vụ ngày, đơn hàng,
  vật nuôi, tổ ong, cây ăn quả, thư, cư dân, câu cá, bắt bọ, thể lực.

Nút 🛌 bấm liền tay được. Mỗi lần bấm là một đêm: cây ăn quả ra trái, tổ ong đầy thêm, máy chế biến xong ngay, cây có Bình
Phun lớn lên, thể lực hồi đầy. Vàng, kinh nghiệm và kẹo lễ hội kiếm theo cách đó được cộng vào bảng xếp hạng tuần, nên với
50 người bảng xếp hạng mất ý nghĩa. Mỗi người còn sống theo lịch riêng: hai người đứng cạnh nhau ở Công Viên có thể một
người đang mùa Hạ, người kia đã sang mùa Đông, thấy giá chợ khác nhau. Lúc tắt game thì không có gì tiến triển, nên ít lý
do để quay lại.

## Mục tiêu

- Mọi người chung một ngày, một mùa, một thời tiết, một bảng giá chợ.
- Cây lớn theo giờ thật, kể cả lúc tắt game: có cây cho người ghé 1, 2 hay 3–4 lần mỗi ngày, và cây cho lúc đang ngồi chơi.
- Không còn cách nào tua thời gian bằng nút bấm. Chỉnh đồng hồ máy không có tác dụng khi có mạng.
- Save cũ chuyển sang kiểu mới mà không mất gì.
- Đồ hoạ giữ nguyên, không làm chậm khung hình (máy yếu nhất: iGPU UHD 730).

Ngoài phạm vi: server tính trạng thái để chống gian lận, thông báo đẩy, ánh sáng trong ngày theo giờ thật (nút 🌤️ giữ
nguyên), vật nuôi/tổ ong/cây ăn quả theo giờ (vẫn theo ngày), cây héo, vật phẩm tăng tốc, cân lại các nguồn thu khác.

## Đồng hồ chung (`src/lib/clock.ts`, `src/app/api/time/route.ts`)

**Giờ server.** Route `GET /api/time` trả `{ now: Date.now() }` (`dynamic = 'force-dynamic'`, `Cache-Control: no-store`).
`syncServerTime()` gọi route, đo thời gian đi về và lấy `offset = serverNow − (t0 + t1) / 2`; bỏ kết quả nếu đi về quá
5 giây. Hỏi lại mỗi 5 phút, khi tab hiện lại (`visibilitychange`) và khi có mạng lại (`online`). `now()` = `Date.now() +
offset`; chưa hỏi được (mất mạng) thì `offset = 0`, tức dùng giờ máy. Ngoài môi trường production có
`window.sunnyClock.skip(ms)` cộng thêm vào offset để tua nhanh khi kiểm thử.

**Ngày.** 1 ngày trong game = 1 ngày thật, sang ngày lúc 0 giờ giờ Việt Nam (UTC+7, không đổi giờ mùa hè). Các hàm thuần
nhận mốc thời gian (ms) để test được:

| Hàm | Trả về |
|---|---|
| `gameDayAt(ms)` | số ngày trong game: Ngày 1 là thứ Hai 12/01/2026 (`CALENDAR_START`) |
| `dayStartMs(day)` | mốc 0 giờ (giờ Việt Nam) của ngày đó |
| `msUntilNextDay(ms)` | còn bao lâu tới 0 giờ |
| `todayKey(ms = now())` | ngày Việt Nam dạng `YYYY-MM-DD` |
| `dayLabel(day)` | "Thứ Bảy 17/10" |
| `formatDuration(ms)` | "2 giờ 15 phút", "45 phút", "dưới 1 phút" |

**Mùa.** `seasonOf(day)` và `SEASON_DAYS = 7` giữ nguyên: mỗi mùa là một tuần thật từ thứ Hai, trùng tuần của bảng xếp
hạng. 19/10/2026 cách `CALENDAR_START` đúng 280 ngày (10 vòng 28 ngày), nên tuần bắt đầu thứ Hai 19/10/2026 là Mùa Xuân.
Muốn đổi mốc thì đổi `CALENDAR_START` sang một thứ Hai khác: tuần chứa nó là Mùa Xuân.

**Thời tiết, giá chợ, nhiệm vụ ngày, đơn hàng, cá, côn trùng, cư dân** vẫn tính theo `day` như hiện nay, nên tự động
giống nhau cho mọi người.

**Mọi chỗ khác dùng chung đồng hồ:** `localDateKey(new Date())` (lễ hội, quà đăng nhập, vòng quay, khách tham quan,
nhạc, cửa hàng lễ hội...) đổi thành `todayKey()`; `weekKey(new Date())` và `weekDaysLeft(new Date())` của bảng xếp hạng
tính theo ngày Việt Nam của `now()`.

## Sang ngày mới (`src/lib/dayCycle.ts`)

`day` trong save đổi nghĩa: ngày cuối cùng đã được xử lý sang ngày. Hook `useGameClock()` (gắn ở `src/app/page.tsx`) chờ
lần hỏi giờ đầu tiên (tối đa 3 giây), rồi gọi `tickClock()` ngay và cứ 5 giây một lần. `tickClock()` lấy `today =
gameDayAt(now())`; nếu `today > day` thì gọi `startNewDay(today)`, sau đó tính lại thể lực và giai đoạn cây (xem dưới). Đồng
hồ lùi (chỉnh giờ máy lúc offline) không làm gì lùi theo: ngày không giảm, cây không nhỏ lại, thể lực không mất.

`advanceDays(save, today, nowMs)` là hàm thuần, thay phần "qua đêm" của `nextDay` hiện nay. Nó chỉ xử lý tối đa 7 ngày
gần nhất (vắng lâu hơn thì những ngày trước đó bỏ qua). Với mỗi ngày `d` được xử lý:

| Việc | Cách tính |
|---|---|
| Thùng giao hàng | bán hết một lần (ngày đầu), giá `seasonalPrice(id, day)` của ngày đã gửi hàng |
| Vật nuôi | đã cho ăn thì có sản phẩm (một lần, vì chỉ được cho ăn trong ngày đã chơi); `fedToday` về `false` |
| Tổ ong | cộng mật mỗi ngày, tối đa sức chứa |
| Cây ăn quả | `ripenTrees(pieces, d)` mỗi ngày, tối đa 3 trái mỗi cây |
| Thư | thư lễ hội đang diễn ra vào ngày `d` (không trùng); thư cảm ơn đơn hàng một lần |
| Thú cưng | quà và đồ Shiba nhặt được theo từng ngày; Mèo Máy tưới tối đa 6 ô khô, tính giờ từ `dayStartMs(d)` |
| Mưa, giông, tuyết | ngày `d` ướt thì mọi ô khô (có cây hoặc đã cuốc) được tưới, tính giờ từ `dayStartMs(d)` |
| Đơn hàng, nhiệm vụ ngày | làm một lần theo ngày `today` |
| Món ăn có hiệu ứng | hết tác dụng (`buff: null`) |

Máy chế biến không còn được làm xong ngay (`readyAt` giữ nguyên; mẻ dài nhất 4 phút). Hàm trả về save mới cùng bảng tổng
kết: hàng đã bán và số vàng, sản phẩm vật nuôi, mật ong, trái cây, thư mới, đơn mới, số ô được mưa hoặc Mèo Máy tưới,
số ô đang chín chờ thu, thời tiết hôm nay và dự báo ngày mai, số ngày đã qua.

`startNewDay(today)` (action của store) áp kết quả, gọi `incrementQuest('earn_gold', vàng bán được)` và
`incrementQuest('sleep', 1)` mỗi thứ một lần, rồi `syncToCloud()`. Lượt sang ngày ở lần `tickClock()` đầu tiên sau khi mở
game tính là "mở game vào ngày mới": giờ trong ngày về Buổi Sáng, bảng tổng kết hiện trước, đóng xong mới tới quà đăng
nhập (kiểm tra quà chuyển từ lúc mount sang sau lần `tickClock()` đầu tiên). Các lượt sau tính là "đang chơi lúc 0 giờ":
giờ trong ngày giữ nguyên, không huỷ việc đang làm, hiện thông báo "🌅 Ngày mới!", bảng tổng kết chỉ tự mở nếu không có
cửa sổ nào đang mở và không câu cá, bắt bọ, xây dựng hay đặt đồ trang trí.

`nextDay` bị bỏ cùng nút 🛌.

## Cây trồng theo giờ thật (`src/lib/growth.ts`)

**Thời gian và giá** (`src/config/crops.ts`: `daysPerStage` thay bằng `growMinutes`, thêm `regrowMinutes` cho cây thu
nhiều lần; mô tả ghi theo giờ):

| Cây | `growMinutes` | `regrowMinutes` | Giá bán |
|---|---|---|---|
| 🥕 Cà Rốt | 60 | | 40 |
| 🌾 Lúa Mì | 90 | | 70 |
| 🌽 Bắp | 120 | | 80 |
| 🥬 Cải Bắp | 300 | | 85 → 115 |
| 🍓 Dâu Tây | 300 | 150 | 55 |
| 🍅 Cà Chua | 360 | 180 | 65 |
| 🍉 Dưa Hấu | 720 | | 190 → 220 |
| 🎃 Bí Ngô | 1440 | | 210 → 300 |

Ba món chế biến dùng những cây tăng giá giữ nguyên tỉ lệ giá so với nguyên liệu (quy tắc sẵn có: món chế biến đáng
1,4–1,65 lần nguyên liệu): Bánh Bí Ngô 480 → 610 (1 Bí Ngô, 1 Trứng, 1 Lúa Mì), Đá Bào Dưa Hấu 280 → 325 (1 Dưa Hấu),
Dưa Bắp Cải 250 → 340 (2 Cải Bắp). Lời mỗi ô mỗi ngày (chưa tính thưởng mùa): ghé 1
lần/ngày thì Bí Ngô lời nhất (220), 2 lần thì Dưa Hấu (300), 3–4 lần thì Cải Bắp (240–320); đang ngồi chơi thì Lúa Mì,
Cà Rốt, Bắp lời nhất tính theo giờ (25–30/giờ). Cà Chua, Dâu Tây lời ít hơn một chút nhưng không phải gieo lại.

**Dữ liệu ô** (`TileData`): bỏ `daysWatered`, thêm

- `growMs?: number`: lứa hiện tại cần bao lâu kể từ lúc được tưới. Đặt lúc gieo (`growMinutes`, hoặc 5 phút với cây của
  người mới), lúc thu cây thu nhiều lần (`regrowMinutes`), hoặc lúc chuyển save.
- `midAt?: number | null`: lúc lên giai đoạn 2. Chỉ có ở lứa bắt đầu từ giai đoạn 1 (`= bắt đầu + growMs / 2`).
- `readyAt?: number | null`: lúc chín (`= bắt đầu + growMs`). Chưa tưới thì `null`.

`watered` giữ nghĩa "đất ướt trong lứa này", `stage` giữ nguyên và được cập nhật theo giờ, nên hình cây (`CropMesh`), điều
kiện thu hoạch (`stage === 3`) và các chỗ đang đọc `stage` không phải đổi.

**Quy tắc:**

- Gieo: ô đã cuốc còn trống, tốn 1 hạt và 2 thể lực như cũ; `stage = 1`, `growMs` như trên. Ô đã ướt sẵn thì cây bắt đầu
  tính giờ ngay.
- Tưới ô có cây đang khô: `watered = true`, `readyAt = lúc tưới + growMs`, `midAt` như trên. Tưới ô đã cuốc chưa gieo thì
  chỉ làm đất ướt. Ô đang tính giờ hoặc đã chín thì không tưới thêm, không tốn nước.
- Thu hoạch (cây chín): như cũ, phân bón ×2. Cây thường: ô về đất đã cuốc, khô. Cây thu nhiều lần: `stage = 2`, khô,
  `growMs = regrowMinutes`, chờ tưới lại.
- `stageAt(tile, nowMs)`: chưa tưới thì giữ `stage`; `nowMs ≥ readyAt` → 3; `midAt` có và `nowMs ≥ midAt` → 2. Giai đoạn
  không bao giờ giảm. `msLeft(tile, nowMs)` cho nhãn "Còn …".
- `refreshStages(tiles, nowMs)` trả mảng cũ nếu không ô nào đổi giai đoạn, nên `tickClock()` không làm React vẽ lại khi
  không có gì thay đổi; khu nông trại chỉ gộp lại hình (StaticMerge) khi một cây lên giai đoạn mới.

**Tưới tự động** cho ô đang khô (`autoWater`, tính giờ từ thời điểm ghi bên cạnh):

| Nguồn | Khi nào | Tính giờ từ |
|---|---|---|
| Bình Phun (8 ô xung quanh) | lúc gieo, lúc thu cây thu nhiều lần, lúc đặt Bình Phun, lúc sang ngày | lúc đó |
| Ngày mưa, giông, tuyết (mọi ô) | lúc gieo, lúc thu cây thu nhiều lần trong ngày đó, lúc sang ngày | lúc đó / 0 giờ ngày đó |
| Mèo Máy (6 ô) | lúc sang ngày | 0 giờ ngày đó |
| Hàng xóm (4 ô mỗi lượt tưới) | lúc nhận lượt thăm (`receiveNeighborVisits`) | lúc hàng xóm tưới (`created_at` của `farm_visits`) |

`fetchFarmVisits` lấy thêm `created_at`; `NeighborVisit` có thêm `at` (ms); `waterForNeighbors` nhận mốc thời gian. Không
cần sửa bảng trên Supabase.

**Người mới:** save mới có `fastCropsLeft = 5`. Mỗi lần gieo khi còn lượt thì `growMs = 5 phút` và trừ một lượt. Nhiệm vụ
"Vụ Mùa Đầu Tiên" (5 nông sản) vì thế làm xong được ngay buổi đầu. Save cũ có `fastCropsLeft = 0`.

**Hiển thị:**

- Ô có cây đang khô hiện giọt nước 💧 nhỏ trên ngọn: hai khối tĩnh (cầu + nón) cùng loại vật liệu với đất, nên
  StaticMerge gộp chúng vào hình của lô đất mà không thêm lần vẽ nào. Ô được tưới thì đất đổi màu, lô đất vốn đã gộp lại
  hình, nên giọt nước biến mất không tốn thêm gì.
- Nhãn khi rê chuột hoặc chạm vào ô thay "Giai đoạn x/3" bằng "💧 Cần tưới", "Còn 2 giờ 15 phút" hoặc "Đã chín" (kèm "🪴
  Đã bón phân" như cũ).
- Bấm Giỏ vào cây chưa chín: "⏳ Còn 1 giờ 5 phút nữa mới chín" hoặc "💧 Cây chưa được tưới".
- Cửa hàng hạt ghi thời gian lớn (và thời gian thu lại) bằng giờ.
- Khi thăm nông trại người khác, `refreshStages` chạy trên ruộng của họ với `now()`, nên cây hiện đúng giai đoạn lúc xem.

## Thể lực

`energyAt: number` mới trong save: mốc tính hồi thể lực. Cứ 3 phút (`ENERGY_REGEN_MS`) hồi 1 điểm, kể cả lúc tắt game, tới
tối đa (`maxEnergyFor`, 100 hoặc hơn khi có món ăn tăng thể lực); đầy thì `energyAt = now`. `settleEnergy` cộng phần đã hồi
và giữ phần lẻ; `spendEnergy` (cuốc, tưới, gieo, câu cá, bắt bọ) tính lại trước khi trừ và bắt đầu đếm từ lúc trừ nếu
trước đó đang đầy. Ăn uống hồi thêm như cũ (tính lại trước khi cộng). Thanh thể lực khi chưa đầy ghi "+1 sau 2:41" (đếm
từng giây trong chính thành phần đó). Thông báo hết thể lực: "⚡ Hết thể lực! Ăn Bánh Mì hoặc chờ hồi (3 phút 1 điểm)".

## Giao diện và chữ

- Thanh trên cùng: bỏ nút 🛌; dòng ngày thành "Thứ Bảy 17/10 • Buổi Sáng", dòng mùa giữ "🌸 Mùa Xuân 3/7 • ☀️"; nút 🌤️ giữ.
- Bấm vào nhà: nhãn "Nhà Nông Trại", hiện "🏠 Ngày mới bắt đầu lúc 0 giờ (còn 5 giờ 12 phút)".
- Bảng tổng kết: tiêu đề theo `dayLabel`; bỏ dòng "cây lớn qua đêm" và "Bình Phun tưới"; thêm số ô đang chín chờ thu, số ô
  được mưa/Mèo Máy tưới, và "Bạn vắng N ngày" khi N > 1.
- Chữ nhắc tới "Qua Ngày" hoặc "đi ngủ" đổi theo: rương bán hàng ("đủ giá lúc 0 giờ"), món ăn ("đến hết ngày"), nhiệm vụ
  hằng ngày ("đổi mới lúc 0 giờ"), thư chào mừng, thông báo cây chưa chín, thông báo hết thể lực.
- Chỗ hiện "Ngày N" (cửa sổ chọn save khi trùng với cloud) đổi sang cấp và giờ lưu, vì mọi save giờ cùng một ngày.

## Nhiệm vụ

- Bỏ "Giấc Ngủ Ngon" (`m_sleep`) khỏi chuỗi chương 1. Save đang làm dở nhiệm vụ này được chuyển sang "Vụ Mùa Đầu Tiên";
  mô tả nhiệm vụ đó thêm "(5 cây đầu tiên chỉ mất 5 phút)".
- Thành tựu "Nông Dân Kiên Trì" (`a_days`, loại `sleep`) đếm số ngày có ghé nông trại: +1 mỗi lần sang ngày. Mô tả: "Ghé
  nông trại vào {n} ngày khác nhau."
- Nhiệm vụ hằng ngày giữ nguyên (đều làm được trong ngày với cây 1–6 giờ).

## Chuyển save cũ (`SAVE_VERSION` 5 → 6)

`fromV5(save, nowMs)` trong `src/lib/saveData.ts`, chạy cho save trên máy (persist `migrate`) và save trên cloud
(`saveFromCloud`); `nowMs` lấy từ `now()` (lúc mới mở có thể vẫn là giờ máy, sai lệch nhỏ chấp nhận được):

- Giữ nguyên vàng, đồ, đất, công cụ, vật nuôi, trang trí, nhiệm vụ.
- Cây đang lớn: giai đoạn 1 → `growMs = growMinutes`; giai đoạn 2 → `regrowMinutes` nếu là cây thu nhiều lần, ngược lại
  nửa `growMinutes`. Ô đã tưới bắt đầu tính giờ từ `nowMs`; ô chưa tưới chờ được tưới. Cây chín giữ nguyên.
- `energyAt = nowMs`; `fastCropsLeft = 0`; bỏ `buff`.
- `day = gameDayAt(nowMs) − 1`: lần `tickClock()` đầu tiên chạy một lượt sang ngày (bán rương, vật nuôi, nhiệm vụ mới...) và
  hiện bảng tổng kết. Cây ăn quả (`planted`) và thư (`day`) dời theo cùng khoảng chênh để giữ số ngày đã lớn.
- Các mốc "trong ngày" (`dailyDay`, `residentDay`, `bugDay`, `beachDay`, `lastFreeSnackDay`) tự làm mới vì khác ngày mới.

Save mới (`createNewGameSave`): `day = gameDayAt(now())`, `energyAt = now()`, `fastCropsLeft = 5`; ô Cà Chua sẵn có (giai
đoạn 2, đã tưới) tính giờ thu lại từ lúc tạo.

## Kiểm thử

- Vitest:
  - `clock`: 0 giờ Việt Nam (23:59:59 và 00:00:00), `gameDayAt`/`dayStartMs` ngược nhau, `todayKey`, mùa của tuần
    19/10/2026, `dayLabel`, `formatDuration`.
  - `growth`: gieo trước/tưới trước, giai đoạn theo giờ, cây thu nhiều lần, cây của người mới, giai đoạn không giảm khi
    đồng hồ lùi, `refreshStages` trả mảng cũ khi không đổi, `autoWater` với Bình Phun/mưa/hàng xóm.
  - Thể lực: hồi theo giờ, giữ phần lẻ, không vượt tối đa, bắt đầu đếm lúc trừ từ khi đầy.
  - `advanceDays`: một ngày, vắng 3 ngày, vắng 20 ngày (chỉ 7), rương bán một lần, mưa và Mèo Máy tính giờ từ 0 giờ.
  - `fromV5`: cây giai đoạn 1/2/3, đã tưới/chưa tưới, cây ăn quả, `m_sleep`.
  - Các test hiện có vẫn qua (sửa những test đang dựa vào `nextDay` hoặc `daysWatered`).
- Trình duyệt (Chrome thật, Playwright như các lần trước): dùng `window.sunnyClock.skip` để tua qua 5 phút, 1 giờ, 0 giờ;
  xem cây lên giai đoạn, nhãn còn lại, giọt nước, bảng tổng kết lúc mở game và lúc 0 giờ, thể lực hồi. Đo số lần vẽ và
  thời gian khung hình ở nông trại trước/sau để chắc không chậm hơn.
- `next build` chạy trong bản sao ở scratchpad (không đụng `.next` của `npm run dev` đang chạy).

## Rủi ro

- Người vừa chặn mạng vừa chỉnh giờ máy vẫn ăn gian được lúc offline. Chấp nhận ở quy mô 50 người.
- Thời gian lớn và giá là ước lượng ban đầu; nên xem lại sau khoảng một tuần có người chơi thật.
- Nếu app được đưa lên dạng web tĩnh (không có server Next.js) thì `/api/time` không chạy; khi đó cần lấy giờ từ Supabase
  (một hàm SQL trả `now()`).
- Spec PWA chơi offline (`2026-10-17-pwa-offline-design.md`, chưa làm): service worker không được cache `/api/time`;
  mất mạng thì dùng giờ máy, khớp với thiết kế này.

## Các file

| File | Thay đổi |
|---|---|
| `src/lib/clock.ts`, `src/app/api/time/route.ts` | mới: giờ server, ngày Việt Nam, nhãn ngày, định dạng thời lượng |
| `src/lib/growth.ts` | mới: thời gian lứa, giai đoạn theo giờ, tưới tự động |
| `src/lib/dayCycle.ts` | mới: `advanceDays` (thay phần qua đêm của `nextDay`) |
| `src/store/useGameStore.ts` | `tickClock`, `startNewDay`, thể lực hồi, gieo/tưới/thu theo giờ, bỏ `nextDay` |
| `src/types/game.ts`, `src/config/crops.ts`, `src/config/items.ts` | `TileData`, `CropConfig`, `SaveData`; thời gian và giá |
| `src/lib/food.ts`, `src/lib/neighbors.ts`, `src/lib/supabase.ts`, `src/lib/leaderboard.ts` | thể lực, mốc tưới của hàng xóm, tuần theo giờ Việt Nam |
| `src/lib/saveData.ts`, `src/lib/newGame.ts`, `src/config/quests.ts`, `src/lib/mail.ts` | save v6, người mới, nhiệm vụ, thư chào mừng |
| `src/app/page.tsx`, `src/components/hud/TopBar.tsx`, các modal (tổng kết, rương, nhiệm vụ, hạt giống, trùng save) | đồng hồ, giao diện, chữ |
| `src/components/canvas/worlds/FarmWorld.tsx` | nhãn ô, giọt nước, nhà |
| Các chỗ dùng `localDateKey(new Date())` | `todayKey()` |
