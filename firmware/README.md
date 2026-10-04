# ATK LIGHT — Firmware ESP32

Mã nạp: **`atk_light/atk_light.ino`**. Cấu hình: **`atk_light/config.h`**.

Đã biên dịch bằng **Arduino-ESP32 3.3.11**, **ArduinoJson 7.4.3**, board **ESP32 Dev Module** (`esp32:esp32:esp32`). Đã kiểm tra biên dịch hai cấu hình relay và CCT PWM. Chưa nạp hoặc thử ngõ ra trên bo thật.

## 1. Chọn đúng phần cứng

Bản mặc định dành cho **ESP32 DevKit / ESP32-WROOM-32 thường**, 4 ngõ ra relay. Chân dưới đây là cấu hình mẫu vì chưa có sơ đồ đấu nối thực tế. Không áp dụng nguyên bảng cho ESP32-C3, S3 hoặc WROVER dùng PSRAM.

| Khu vực | ID API | GPIO relay mặc định | GPIO PWM ấm (tùy chọn) | GPIO PWM trắng (tùy chọn) |
|---|---|---:|---:|---:|
| Đồi Khau Tý | khau-ty | 16 | 16 | 17 |
| Lán Tỉn Keo | tin-keo | 17 | 18 | 19 |
| Nhà tưởng niệm | memorial | 18 | 21 | 22 |
| Quảng trường | square | 19 | 25 | 26 |

**Relay:** GPIO nối đầu vào IN1–IN4 của module tương thích logic 3,3V; nguồn module theo thông số của module, GND tín hiệu nối chung với ESP32 theo hướng dẫn module. Mặc định relay kích mức LOW. Nếu module kích mức HIGH, đổi `RELAY_ACTIVE_LOW = false`.

**PWM CCT:** dùng 8 kênh driver/MOSFET phù hợp, hai kênh ấm–trắng cho mỗi khu vực. Không dùng PWM trên relay cơ. PWM 5 kHz, 12 bit; tổng duty hai kênh không vượt mức độ sáng đặt. 3000–6000K là phép trộn gần đúng, cần hiệu chuẩn với loại LED thực tế.

**Cảm biến ánh sáng BH1750 (GY-30):** dùng chung cho cả hai chế độ relay và PWM.

| BH1750 | ESP32 DevKit / WROOM-32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| SDA | GPIO32 |
| SCL | GPIO33 |
| ADDR | GND hoặc để mặc định, địa chỉ `0x23` |

Firmware giao tiếp trực tiếp bằng `Wire`, không cần cài thư viện BH1750. Cấp module từ 3,3V để các điện trở kéo lên I²C không đưa 5V vào GPIO ESP32. Giá trị được đọc mỗi giây, đơn vị lux. Nếu cảm biến mất kết nối, relay/PWM vẫn hoạt động và firmware tự thử nhận lại cảm biến sau mỗi 5 giây.

GPIO ESP32 chỉ là tín hiệu 3,3V. Không nối trực tiếp đèn 220V, tải 12/24V hoặc cuộn relay vào GPIO. Ngõ ra relay phải có mức kéo về OFF phù hợp trong thời gian reset vì firmware chỉ kiểm soát được sau khi ESP32 khởi chạy.

Trong `config.h`, chọn một chế độ:

```cpp
constexpr DriverMode DRIVER_MODE = DriverMode::Relay;
// hoặc
constexpr DriverMode DRIVER_MODE = DriverMode::CctPwm;
```

File hiện dùng `#ifdef ATK_DRIVER_CCT` để có thể biên dịch cả hai cấu hình bằng CLI mà không sửa nguồn; trong Arduino IDE có thể thay cả khối `#ifdef...#endif` đó bằng một dòng ở trên.

## 2. Nạp bằng Arduino IDE

1. Mở `atk_light/atk_light.ino` (tab `config.h` hiện cùng sketch).
2. Boards Manager: cài **esp32 by Espressif Systems**, phiên bản 3.x (đã kiểm tra 3.3.11).
3. Library Manager: cài **ArduinoJson by Benoit Blanchon**, phiên bản 7.x (đã kiểm tra 7.4.3).
4. Chọn **ESP32 Dev Module**, flash 4 MB và cổng COM của ESP32.
5. Sửa chân, loại relay/PWM và Wi-Fi trong `config.h` theo phần cứng.
6. Upload. Nếu bo không vào bootloader tự động, giữ BOOT lúc IDE hiện Connecting rồi thả khi bắt đầu nạp.
7. Mở **Serial Monitor 115200 baud**, nhấn EN/reset để xem thông tin kết nối.

Không có mật khẩu Wi-Fi cố định trong mã. Mỗi ESP32 tạo mật khẩu AP và khóa API riêng, lưu trong NVS; Serial Monitor sẽ hiện chúng. Không xóa NVS nếu muốn giữ khóa và lịch.

## 3. Kết nối với Web / APK

### Không có router

- Để `WIFI_SSID` / `WIFI_PASSWORD` rỗng rồi nạp.
- Kết nối máy tính/điện thoại vào Wi-Fi **ATK-LIGHT-ESP32**, dùng mật khẩu AP hiện trong Serial Monitor.
- Giữ kết nối Wi-Fi này khi điện thoại báo không có Internet.
- Mở web trên máy tính (`CHAY-WEB.cmd`) hoặc APK đã cài.
- Vào **Cài đặt → Kết nối ESP32**.
- Địa chỉ: **http://192.168.4.1**.
- Khóa API: sao chép dòng `API token` từ Serial Monitor.
- Bấm **Kết nối ESP32**, rồi **Đồng bộ giờ từ điện thoại/máy tính** để chạy lịch khi không có Internet.

### Cùng router Wi-Fi

- Điền `WIFI_SSID` và `WIFI_PASSWORD` trước khi nạp.
- Serial Monitor in `LAN URL` khi đã kết nối router. Nhập địa chỉ đó trong phần Cài đặt.
- Máy tính/điện thoại và ESP32 cần ở cùng mạng, không bật chế độ cô lập các máy khách.
- ESP32 tự thử kết nối lại Wi-Fi; AP vẫn có sẵn để truy cập dự phòng.
- Khi có Internet, ESP32 tự đồng bộ NTP theo múi giờ Việt Nam UTC+7.

Web chạy trên máy tính ở localhost; ESP32 phục vụ **API**, không chứa toàn bộ bộ ảnh React. Nếu dùng điện thoại, cài APK hoặc phục vụ web từ máy tính ra LAN. Trình duyệt có thể hỏi quyền truy cập mạng cục bộ; cho phép cho trang đang dùng. APK đã cấu hình HTTP cục bộ cho ESP32.

API có khóa Bearer, chạy HTTP nội bộ; không chuyển tiếp cổng ESP32 ra Internet. Khóa trong web chỉ lưu theo phiên tab.

## 4. Chức năng và giới hạn thực tế

| Chức năng giao diện | Relay | PWM CCT |
|---|---|---|
| Bật/tắt toàn hệ thống, từng khu vực | Có | Có |
| Độ sáng 0–100% | Không; giao diện khóa thanh kéo | Có |
| Nhiệt độ màu 3000–6000K | Không; giao diện khóa thanh kéo | Có, trộn ấm/trắng gần đúng |
| Bốn chế độ chiếu sáng | Lưu tên cảnh; relay không dim | Áp dụng preset brightness/CCT |
| Lịch tự động | Bật ngõ ra tại giờ hẹn | Bật và áp dụng preset tại giờ hẹn |
| Cảnh báo/ngõ ra/uptime | Có | Có |
| Độ sáng môi trường BH1750 | Có | Có |
| Điện năng kWh | Chưa có cảm biến | Chưa có cảm biến |

- Khởi động: tất cả ngõ ra OFF, không khôi phục lệnh bật cũ từ flash.
- Lưu vào NVS: độ sáng, nhiệt độ, chế độ, danh sách lịch, trạng thái bật lịch, khóa API và mật khẩu AP. Ghi sau khoảng 1,5 giây hết thao tác để hạn chế ghi flash khi kéo slider.
- Lịch: tối đa 16 giờ khác nhau mỗi ngày, lưu trên ESP32 và chạy độc lập khi đóng web. Ban đầu danh sách rỗng và lịch tự động tắt. Chỉ chạy sau khi đồng hồ đã đồng bộ. Mỗi lịch bật cả 4 khu vực; không có lịch tắt trong giao diện hiện tại. Không chạy bù lịch đã lỡ trong lúc mất điện.
- Mất Internet: điều khiển LAN/AP vẫn hoạt động, đồng hồ tiếp tục chạy sau khi đã đồng bộ. Khởi động lại ngoại tuyến cần đồng bộ giờ từ giao diện.
- Mất kết nối web: ESP32 giữ ngõ ra cuối cùng và tiếp tục lịch đã bật. Web báo mất kết nối, không giả lập lệnh thành công.
- 38/32/56/42 là số lượng đèn cấu hình theo reference; ESP32 điều khiển 4 nhóm, không biết bóng nào hỏng. Số đang bật là số bóng được ra lệnh bật, không phải phản hồi 168 thiết bị.
- API trả `energyKwh: null`, `capabilities.energy: false`. Web hiện dấu `—` và không vẽ biểu đồ giả khi kết nối thật. Cần biết loại công tơ/cảm biến mới viết đúng phần đo điện năng.
- API trả `ambientLux` và `ambientSensorConnected`. Web hiển thị số lux trong trạng thái hệ thống và trang Cài đặt. Cảm biến hiện chỉ dùng để giám sát; chưa tự bật/tắt đèn theo ngưỡng.
- Các mục bản đồ, zoom, báo cáo CSV, sidebar và bottom navigation thuộc web, không phải chức năng GPIO.

## 5. API

Mọi `/api/*` cần header `Authorization: Bearer <API_TOKEN>`. JSON UTF-8. `OPTIONS` phục vụ CORS; `GET /` chỉ là thông tin API.

| Method | Đường dẫn | Nội dung |
|---|---|---|
| GET | /api/state | Toàn bộ trạng thái, khả năng, cảnh báo và lịch |
| POST | /api/control | Một lệnh: `{"systemOn":true}` |
| POST | /api/control | `{"area":{"id":"tin-keo","on":false}}` |
| POST | /api/control | `{"brightness":70}` hoặc `{"temperature":4000}` (PWM) |
| POST | /api/control | `{"mode":0}`; 0 tham quan, 1 tưởng niệm, 2 an ninh, 3 tiết kiệm |
| PUT | /api/schedules | `{"enabled":true,"schedules":[{"id":"1","time":"18:00","mode":"Tham quan"}]}` |
| POST | /api/time | `{"epoch":<Unix timestamp giây>}` |

Lệnh thành công trả trạng thái mới. Sai khóa: 401. Payload/giới hạn sai: 400. Khu vực không tồn tại: 404. Chỉnh PWM trên relay: 409. Lỗi khởi tạo ngõ ra: 503. Thời gian không đồng bộ: lịch vẫn lưu nhưng chưa chạy.

## 6. Biên dịch CLI / file BIN

Chạy từ thư mục dự án:

```powershell
arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir firmware/build/relay firmware/atk_light
arduino-cli compile --fqbn esp32:esp32:esp32 --build-property "compiler.cpp.extra_flags=-DATK_DRIVER_CCT" --output-dir firmware/build/cct-pwm firmware/atk_light
```

File `atk_light.ino.merged.bin` là ảnh flash gộp, nạp từ địa chỉ **0x0** trên ESP32 thường, flash 4 MB. File `atk_light.ino.bin` chỉ là application; không nạp nó vào 0x0. Nên dùng Arduino IDE nếu chưa quen các offset flash. Hai bản BIN đóng gói dùng chân mẫu ở bảng trên và Wi-Fi AP, chưa có thông tin router của bạn.

Ví dụ chỉ khi đã chọn đúng COM và đúng bản phần cứng:

```powershell
arduino-cli upload --fqbn esp32:esp32:esp32 --port COM5 --input-dir firmware/build/relay firmware/atk_light
```

Đổi `COM5` thành cổng của bo thực tế. Không chạy lệnh upload vào bo chưa xác định.

## Tài liệu API nền tảng

- [Espressif — LEDC/PWM Arduino ESP32](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/ledc.html)
- [Espressif — Wi-Fi STA/AP](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html)
- [Espressif — WebServer example](https://github.com/espressif/arduino-esp32/tree/master/libraries/WebServer/examples/WebServer)
