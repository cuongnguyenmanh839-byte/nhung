# ATK LIGHT — Trung tâm điều khiển chiếu sáng

Ứng dụng React + TypeScript + Vite và Android Capacitor, tái tạo hai màn hình trong ảnh reference được cung cấp. Giao diện desktop và mobile riêng; dữ liệu mô phỏng, không điều khiển thiết bị thật.

## Chạy Web

Yêu cầu Node.js 22 trở lên và npm.

```sh
npm install
npm run dev
```

Mở địa chỉ Vite in trong terminal, mặc định `http://127.0.0.1:5173`.
Trên Windows, có thể nhấp đúp `CHAY-WEB.cmd`, giữ cửa sổ lệnh mở rồi truy cập địa chỉ trên.
Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` / `npx.cmd` thay cho `npm` / `npx`.

```sh
npm run build
npm run preview
```

Bản production nằm trong `dist/`. Có thể phục vụ bằng bất kỳ static web server nào. Không mở `dist/index.html` trực tiếp bằng `file://`.

## Android / APK

Đã có thư mục dự án native `android/`, không cần chạy `cap add` lần nữa.

```sh
npm run build
npx cap sync android
npx cap open android
```

Trong Android Studio: chọn **Gradle JDK 21**, cài Android SDK Platform 35 và các build tools nếu được yêu cầu; chờ Gradle Sync hoàn tất. Chọn **Build → Build Bundle(s) / APK(s) → Build APK(s)**. APK debug nằm tại `android/app/build/outputs/apk/debug/app-debug.apk`.

Build bằng terminal trên Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

Script dùng JDK 21 cục bộ trong `.tooling/jdk21/` nếu có, hoặc `JAVA_HOME` của máy. Đường dẫn SDK mặc định là `%LOCALAPPDATA%/Android/Sdk`; có thể truyền `-SdkPath`. Script tạo `releases/ATK-LIGHT-debug.apk`. Với đường dẫn dự án có dấu, script tự sao chép phần build sang `%TEMP%/atk-light-build-610a06d8/` và JDK sang `%TEMP%/atk-light-jdk21/` để tránh lỗi Java trên Windows; cache Gradle nằm ở `.gradle-home` bên trong thư mục build. Mã nguồn chính vẫn giữ nguyên vị trí. Thư mục `.tooling/` chỉ chứa công cụ, không thuộc mã nguồn cần phân phối.

APK debug dành cho cài thử. Bản phát hành cần keystore riêng và chọn **Generate Signed App Bundle or APK** trong Android Studio. Ứng dụng chạy toàn màn hình; vuốt cạnh để hiện thanh hệ thống Android.

## Cấu trúc

```text
src/
  components/       # Controls, HeritageMap, Summary, AreaCard
  layouts/          # Desktop và Mobile
  pages/            # Các màn hình phụ trong dialog
  data/             # Khu vực, biểu đồ, cảnh báo, chế độ mock
  hooks/            # Trạng thái điều khiển dùng chung
  services/         # LightingService, adapter sẵn thay REST/WebSocket/MQTT
  styles/           # Màu, kích thước, tỷ lệ, responsive
  App.tsx
  main.tsx
public/reference.jpg # Ảnh gốc: nguồn bản đồ, logo, hoa văn và icon
android/             # Dự án Android Capacitor
scripts/             # Build APK
tests/               # Kiểm thử trình duyệt
qa/                  # Screenshot và trang đối chiếu reference
```

Font Roboto/Noto Serif, gồm bộ ký tự tiếng Việt, được đóng gói tại build time. Không cần tải font hay bản đồ qua mạng trong APK. Dùng trực tiếp các vùng ảnh reference bằng CSS thay vì tạo hình minh họa khác: giữ bản đồ, logo, cảnh rừng, hoa văn trống đồng và biểu tượng di tích. Bản đồ là ảnh minh họa có các điểm tương tác, không phải bản đồ GIS; tên điểm và legend nằm trong raster gốc.

## Chức năng

- Bật/tắt toàn bộ và từng khu di tích; cập nhật số đèn đang bật.
- Chỉnh độ sáng 0–100%, nhiệt độ màu 3000–6000K; bốn chế độ chiếu sáng.
- Chọn điểm trên bản đồ, bật/tắt điểm được chọn, phóng to/thu nhỏ/đặt lại bản đồ.
- Sidebar và mobile navigation mở khu vực, điều khiển, lịch, điện năng, cảnh báo, báo cáo, cài đặt.
- Thêm/xóa lịch mô phỏng; lịch được giữ khi đóng và mở lại màn hình trong cùng phiên.
- Cảnh báo cập nhật khi thao tác; tải báo cáo CSV; đổi tên hiển thị quản trị viên trong phiên.
- Khi kết nối firmware mới, hiển thị độ sáng môi trường từ cảm biến BH1750 qua I²C (GPIO32/33).
- Dialog hỗ trợ Escape, quản lý focus; điều khiển có nhãn trợ năng và thao tác bàn phím.

Tổng 12 phân khu được nhóm trong 4 khu di tích chính với 168 đèn; khởi tạo 148 đèn đang bật, 86,4 kWh, độ sáng 70%, 4000K. Ngày/giờ/thời tiết giữ nguyên nội dung reference. Điện năng là số liệu demo, không phải phép đo trực tiếp. Trạng thái dùng React state và trở về mặc định khi tải lại trang; lịch chưa có bộ thực thi tự động.

## Đối chiếu hình ảnh và kiểm thử

Ảnh reference là mockup chụp cả màn hình máy tính và điện thoại, không phải file thiết kế gốc. Desktop được dựng theo vùng x=65, y=47, w=900, h=556 của ảnh. Mobile theo vùng x≈1010, y≈123, w≈238, h≈514. Ở 390 px, mobile quy đổi về khoảng 844 px chiều cao.

Mở `qa/comparison.html` để xem reference và giao diện cạnh nhau. Các screenshot:

- `qa/desktop-reference-size.png`: dashboard ở kích thước vùng reference.
- `qa/desktop-1280.png`: desktop 1280 × 720.
- `qa/mobile-390.png`: mobile 390 × 844, trạng thái mặc định.
- `qa/mobile-360.png`: mobile 360 × 800, sau kiểm tra tương tác.

Đã sửa các sai lệch thấy qua screenshot: chữ nền bị chồng, cỡ tiêu đề, vòng nguồn, icon khu vực và đóng gói font. Không khẳng định trùng 100% pixel: font và một số icon điều khiển là bản dựng lại; ảnh gốc có độ phân giải thấp, độ mờ phối cảnh và chữ raster.

Chạy kiểm thử (tự khởi động máy chủ ở cổng 5173 nếu chưa chạy):

```sh
npx playwright test
```

Cấu hình kiểm thử hiện dùng Microsoft Edge trên Windows. Kiểm tra desktop/mobile, bật/tắt, số đèn, chế độ, điểm bản đồ, lịch, CSV, dialog và tràn ngang; lưu ảnh vào `qa/`. Điều chỉnh `executablePath` trong `playwright.config.ts` nếu máy khác không có Edge tại đường dẫn này.
