#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <time.h>
#include <sys/time.h>
#include "config.h"

WebServer server(80);
Preferences preferences;
const char* AREA_IDS[] = {"khau-ty", "tin-keo", "memorial", "square"};
const char* AREA_NAMES[] = {"Đồi Khau Tý", "Lán Tỉn Keo", "Nhà tưởng niệm", "Quảng trường"};
const char* MODE_NAMES[] = {"Tham quan", "Lễ tưởng niệm", "An ninh", "Tiết kiệm"};
const unsigned MODE_BRIGHTNESS[] = {70, 50, 100, 35};
const unsigned MODE_TEMPERATURE[] = {4000, 3000, 6000, 3000};
bool areaOn[4] = {false, false, false, false};
unsigned brightness = 70, temperature = 4000, lightingMode = 0;
bool hardwareReady = true, schedulesEnabled = false, dirty = false;
uint32_t dirtyAt = 0, lastWifiAttempt = 0, lastMinute = 0;
uint32_t lastLightRead = 0;
bool ambientSensorConnected = false;
float ambientLux = NAN;
String apiToken, apPassword;
struct Schedule { String id; unsigned minute; unsigned mode; };
Schedule schedules[MAX_SCHEDULES];
unsigned scheduleCount = 0;
struct Event { String time; String title; String detail; };
Event events[24];
unsigned eventCount = 0;

String timeText() {
  const time_t now = time(nullptr);
  if (now < 1704067200) return "--:--";
  tm local; localtime_r(&now, &local);
  char out[6]; strftime(out, sizeof(out), "%H:%M", &local);
  return String(out);
}

void addEvent(const String& title, const String& detail) {
  for (unsigned i = min(eventCount, 23U); i > 0; --i) events[i] = events[i-1];
  events[0] = {timeText(), title, detail};
  eventCount = min(eventCount + 1, 24U);
}

bool isPwm() { return DRIVER_MODE == DriverMode::CctPwm; }
void markDirty() { dirty = true; dirtyAt = millis(); }

void applyOutputs() {
  for (unsigned i = 0; i < 4; ++i) {
    if (!isPwm()) {
      digitalWrite(RELAY_PINS[i], (areaOn[i] && hardwareReady) ? (RELAY_ACTIVE_LOW ? LOW : HIGH) : (RELAY_ACTIVE_LOW ? HIGH : LOW));
      continue;
    }
    const unsigned maxDuty = (1U << PWM_BITS) - 1;
    const uint32_t total = areaOn[i] && hardwareReady ? maxDuty * brightness / 100 : 0;
    // Constant total duty; CCT mixing is approximate and needs driver calibration.
    const unsigned cool = total * (temperature - 3000) / 3000;
    const unsigned warm = total - cool;
    ledcWrite(WARM_PINS[i], PWM_ACTIVE_LOW ? maxDuty - warm : warm);
    ledcWrite(COOL_PINS[i], PWM_ACTIVE_LOW ? maxDuty - cool : cool);
  }
}

void setupOutputs() {
  for (unsigned i = 0; i < 4; ++i) {
    if (isPwm()) {
      digitalWrite(WARM_PINS[i], PWM_ACTIVE_LOW ? HIGH : LOW);
      digitalWrite(COOL_PINS[i], PWM_ACTIVE_LOW ? HIGH : LOW);
      pinMode(WARM_PINS[i], OUTPUT); pinMode(COOL_PINS[i], OUTPUT);
      if (!ledcAttach(WARM_PINS[i], PWM_HZ, PWM_BITS)) hardwareReady = false;
      if (!ledcAttach(COOL_PINS[i], PWM_HZ, PWM_BITS)) hardwareReady = false;
    } else {
      digitalWrite(RELAY_PINS[i], RELAY_ACTIVE_LOW ? HIGH : LOW);
      pinMode(RELAY_PINS[i], OUTPUT);
    }
  }
  applyOutputs(); // Outputs always start OFF, including after power loss.
}

bool lightSensorCommand(uint8_t command) {
  Wire.beginTransmission(LIGHT_SENSOR_ADDRESS);
  Wire.write(command);
  return Wire.endTransmission() == 0;
}

void setupLightSensor() {
  Wire.begin(LIGHT_SENSOR_SDA_PIN, LIGHT_SENSOR_SCL_PIN, 100000);
  // Power on, reset the data register, then continuously measure at 1 lx resolution.
  ambientSensorConnected = lightSensorCommand(0x01) && lightSensorCommand(0x07) && lightSensorCommand(0x10);
  if (ambientSensorConnected) Serial.println("BH1750: connected on I2C address 0x23");
  else Serial.println("BH1750: not detected; lighting control remains available");
}

void readLightSensor() {
  const uint32_t now = millis();
  const uint32_t interval = ambientSensorConnected ? LIGHT_SENSOR_INTERVAL_MS : 5000U;
  if (now - lastLightRead < interval) return;
  lastLightRead = now;

  if (!ambientSensorConnected) {
    ambientSensorConnected = lightSensorCommand(0x01) && lightSensorCommand(0x10);
    if (!ambientSensorConnected) { ambientLux = NAN; return; }
  }

  if (Wire.requestFrom(LIGHT_SENSOR_ADDRESS, uint8_t(2)) != 2) {
    ambientSensorConnected = false; ambientLux = NAN; return;
  }
  const uint16_t raw = (uint16_t(Wire.read()) << 8) | Wire.read();
  ambientLux = raw / 1.2f;
}

void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.sendHeader("Cache-Control", "no-store");
}
void errorResponse(unsigned status, const char* message) {
  JsonDocument doc; doc["error"] = message;
  String body; serializeJson(doc, body); cors(); server.send(status, "application/json; charset=utf-8", body);
}
bool authorized() {
  if (server.header("Authorization") == "Bearer " + apiToken) return true;
  errorResponse(401, "Sai khóa API. Xem khóa trên Serial Monitor."); return false;
}
bool parseBody(JsonDocument& doc) {
  if (server.arg("plain").length() > 4096) { errorResponse(413, "Nội dung quá lớn"); return false; }
  if (deserializeJson(doc, server.arg("plain")) || !doc.is<JsonObject>()) { errorResponse(400, "JSON không hợp lệ"); return false; }
  return true;
}

void schedulesJson(JsonArray list) {
  for (unsigned i = 0; i < scheduleCount; ++i) {
    JsonObject row = list.add<JsonObject>();
    row["id"] = schedules[i].id;
    char clockText[6]; snprintf(clockText, sizeof(clockText), "%02u:%02u", schedules[i].minute / 60, schedules[i].minute % 60);
    row["time"] = clockText; row["mode"] = MODE_NAMES[schedules[i].mode];
  }
}

void sendState() {
  JsonDocument doc;
  doc["apiVersion"] = 1; doc["device"] = "ATK-ESP32";
  doc["driver"] = isPwm() ? "cct-pwm" : "relay";
  doc["hardwareReady"] = hardwareReady;
  doc["brightness"] = brightness; doc["temperature"] = temperature; doc["mode"] = lightingMode;
  doc["uptimeSeconds"] = millis() / 1000;
  doc["timeSynced"] = time(nullptr) >= 1704067200;
  doc["schedulesEnabled"] = schedulesEnabled;
  doc["ip"] = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  doc["wifiConnected"] = WiFi.status() == WL_CONNECTED;
  doc["energyKwh"] = nullptr; // No fabricated telemetry: attach a meter adapter first.
  doc["ambientSensorConnected"] = ambientSensorConnected;
  if (ambientSensorConnected && !isnan(ambientLux)) doc["ambientLux"] = roundf(ambientLux * 10.0f) / 10.0f;
  else doc["ambientLux"] = nullptr;
  JsonObject cap = doc["capabilities"].to<JsonObject>();
  cap["brightness"] = isPwm(); cap["temperature"] = isPwm(); cap["energy"] = false;
  cap["ambientLight"] = true;
  JsonArray areas = doc["areas"].to<JsonArray>();
  for (unsigned i = 0; i < 4; ++i) {
    JsonObject area = areas.add<JsonObject>();
    area["id"] = AREA_IDS[i]; area["on"] = areaOn[i]; area["lamps"] = LAMP_COUNTS[i];
    area["lit"] = areaOn[i] ? LAMP_COUNTS[i] : 0;
  }
  schedulesJson(doc["schedules"].to<JsonArray>());
  JsonArray logs = doc["alerts"].to<JsonArray>();
  for (unsigned i = 0; i < eventCount; ++i) {
    JsonObject event = logs.add<JsonObject>();
    event["time"] = events[i].time; event["title"] = events[i].title; event["detail"] = events[i].detail;
  }
  String body; serializeJson(doc, body); cors(); server.send(200, "application/json; charset=utf-8", body);
}

void handleControl() {
  if (!authorized()) return;
  if (!hardwareReady) { errorResponse(503, "Lỗi khởi tạo ngõ ra. Kiểm tra chân PWM."); return; }
  JsonDocument doc; if (!parseBody(doc)) return;
  if (doc.size() != 1) { errorResponse(400, "Mỗi yêu cầu cần đúng một lệnh"); return; }
  if (doc["systemOn"].is<bool>()) {
    for (bool& on : areaOn) on = doc["systemOn"].as<bool>();
    addEvent(areaOn[0] ? "Đã bật toàn bộ hệ thống" : "Đã tắt toàn bộ hệ thống", "Lệnh đã được ESP32 áp dụng lên ngõ ra");
  } else if (doc["area"].is<JsonObject>()) {
    JsonObject area = doc["area"];
    if (!area["id"].is<const char*>() || !area["on"].is<bool>()) { errorResponse(400, "Khu vực không hợp lệ"); return; }
    int index = -1; for (unsigned i=0;i<4;++i) if (area["id"].as<String>() == AREA_IDS[i]) index = i;
    if (index < 0) { errorResponse(404, "Không tìm thấy khu vực"); return; }
    areaOn[index] = area["on"].as<bool>();
    addEvent(String(areaOn[index] ? "Đã bật " : "Đã tắt ") + AREA_NAMES[index], "Trạng thái ngõ ra, không phải phản hồi từng bóng đèn");
  } else if (!doc["brightness"].isNull()) {
    if (!isPwm()) { errorResponse(409, "Relay không hỗ trợ chỉnh độ sáng"); return; }
    if (!doc["brightness"].is<unsigned>() || doc["brightness"].as<unsigned>() > 100) { errorResponse(400, "Độ sáng phải từ 0 đến 100"); return; }
    brightness = doc["brightness"]; markDirty();
  } else if (!doc["temperature"].isNull()) {
    if (!isPwm()) { errorResponse(409, "Relay không hỗ trợ nhiệt độ màu"); return; }
    if (!doc["temperature"].is<unsigned>() || doc["temperature"].as<unsigned>() < 3000 || doc["temperature"].as<unsigned>() > 6000) { errorResponse(400, "Nhiệt độ màu phải từ 3000 đến 6000K"); return; }
    temperature = doc["temperature"]; markDirty();
  } else if (!doc["mode"].isNull()) {
    if (!doc["mode"].is<unsigned>() || doc["mode"].as<unsigned>() > 3) { errorResponse(400, "Chế độ phải từ 0 đến 3"); return; }
    lightingMode = doc["mode"]; brightness = MODE_BRIGHTNESS[lightingMode]; temperature = MODE_TEMPERATURE[lightingMode]; markDirty();
    addEvent(String("Chế độ ") + MODE_NAMES[lightingMode], isPwm() ? "Đã áp dụng PWM ấm/trắng" : "Relay: chỉ lưu cảnh, không thay đổi độ sáng vật lý");
  } else { errorResponse(400, "Lệnh không hợp lệ"); return; }
  applyOutputs(); sendState();
}

bool decodeSchedules(JsonVariantConst list, Schedule* output, unsigned& count) {
  if (!list.is<JsonArrayConst>() || list.size() > MAX_SCHEDULES) return false;
  count = 0;
  for (JsonObjectConst row : list.as<JsonArrayConst>()) {
    if (!row["id"].is<const char*>() || !row["time"].is<const char*>() || !row["mode"].is<const char*>()) return false;
    String id = row["id"].as<String>(), text = row["time"].as<String>();
    if (id.length() == 0 || id.length() > 32 || text.length() != 5 || text[2] != ':' || !isDigit(text[0]) || !isDigit(text[1]) || !isDigit(text[3]) || !isDigit(text[4])) return false;
    unsigned hour = text.substring(0,2).toInt(), minute = text.substring(3).toInt();
    if (hour > 23 || minute > 59) return false;
    int modeIndex = -1; for (unsigned i = 0; i < 4; ++i) if (row["mode"].as<String>() == MODE_NAMES[i]) modeIndex = i;
    if (modeIndex < 0) return false;
    for (unsigned i=0;i<count;++i) if (output[i].id == id || output[i].minute == hour*60+minute) return false;
    output[count++] = {id, hour * 60 + minute, (unsigned)modeIndex};
  }
  return true;
}

void handleSchedules() {
  if (!authorized()) return;
  JsonDocument doc; if (!parseBody(doc)) return;
  Schedule next[MAX_SCHEDULES]; unsigned count;
  if (!doc["enabled"].is<bool>() || !decodeSchedules(doc["schedules"], next, count)) { errorResponse(400, "Lịch không hợp lệ, trùng giờ hoặc vượt 16 lịch"); return; }
  for (unsigned i=0;i<count;++i) schedules[i] = next[i];
  scheduleCount = count; schedulesEnabled = doc["enabled"].as<bool>();
  markDirty(); addEvent("Đã cập nhật lịch hoạt động", schedulesEnabled ? "Lịch sẽ chạy khi đồng hồ đã đồng bộ" : "Lịch tự động đang tắt"); sendState();
}

void saveSettings() {
  JsonDocument doc; doc["brightness"] = brightness; doc["temperature"] = temperature; doc["mode"] = lightingMode;
  doc["enabled"] = schedulesEnabled; schedulesJson(doc["schedules"].to<JsonArray>());
  String data; serializeJson(doc, data); preferences.putString("settings", data); dirty = false;
}
void loadSettings() {
  JsonDocument doc;
  if (deserializeJson(doc, preferences.getString("settings", "{}"))) return;
  unsigned b = doc["brightness"] | 70U, t = doc["temperature"] | 4000U, m = doc["mode"] | 0U;
  brightness = min(b,100U); temperature = constrain(t,3000U,6000U); lightingMode = min(m,3U);
  unsigned count; Schedule next[MAX_SCHEDULES];
  if (decodeSchedules(doc["schedules"], next, count)) {
    for (unsigned i=0;i<count;++i) schedules[i] = next[i];
    scheduleCount = count; schedulesEnabled = doc["enabled"] | false;
  }
}

void runScheduler() {
  const time_t now = time(nullptr);
  if (!schedulesEnabled || !hardwareReady || now < 1704067200) return;
  tm local; localtime_r(&now, &local);
  const uint32_t key = (local.tm_year * 366U + local.tm_yday) * 1440U + local.tm_hour * 60U + local.tm_min;
  if (key == lastMinute) return;
  lastMinute = key;
  for (unsigned i=0;i<scheduleCount;++i) if (schedules[i].minute == unsigned(local.tm_hour*60+local.tm_min)) {
    lightingMode = schedules[i].mode; brightness = MODE_BRIGHTNESS[lightingMode]; temperature = MODE_TEMPERATURE[lightingMode];
    for (bool& on : areaOn) on = true;
    applyOutputs(); addEvent(String("Chạy lịch ") + MODE_NAMES[lightingMode], "Đã bật các khu vực theo lịch đã lưu");
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD); setupOutputs(); setupLightSensor(); preferences.begin("atk-light", false); loadSettings();
  apiToken = preferences.getString("apiToken", "");
  if (apiToken.length() != 32) { char token[33]; snprintf(token,sizeof(token),"%08lx%08lx%08lx%08lx",(unsigned long)esp_random(),(unsigned long)esp_random(),(unsigned long)esp_random(),(unsigned long)esp_random()); apiToken=token; preferences.putString("apiToken",apiToken); }
  apPassword = preferences.getString("apPass", "");
  if (apPassword.length() < 8) { char password[17]; snprintf(password,sizeof(password),"ATK-%08lx",(unsigned long)esp_random()); apPassword=password; preferences.putString("apPass",apPassword); }
  WiFi.mode(WIFI_AP_STA); WiFi.softAP("ATK-LIGHT-ESP32", apPassword.c_str());
  if (strlen(WIFI_SSID)) WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  configTime(7*3600, 0, "pool.ntp.org", "time.google.com");
  MDNS.begin("atk-light"); MDNS.addService("http", "tcp", 80);
  const char* headers[] = {"Authorization"}; server.collectHeaders(headers,1);
  server.on("/", HTTP_GET, [](){ cors(); server.send(200,"text/plain; charset=utf-8","ATK LIGHT ESP32 API v1. Connect the dashboard using the token printed on Serial Monitor."); });
  server.on("/api/state", HTTP_GET, [](){if(authorized()) sendState();});
  server.on("/api/control", HTTP_POST, handleControl);
  server.on("/api/schedules", HTTP_PUT, handleSchedules);
  server.on("/api/time", HTTP_POST, [](){
    if(!authorized()) return;
    JsonDocument doc; if(!parseBody(doc)) return;
    if(!doc["epoch"].is<uint32_t>() || doc["epoch"].as<uint32_t>() < 1704067200 || doc["epoch"].as<uint32_t>() > 4102444800U) {errorResponse(400,"Thời gian không hợp lệ");return;}
    timeval tv = {(time_t)doc["epoch"].as<uint32_t>(), 0}; settimeofday(&tv, nullptr); sendState();
  });
  server.onNotFound([](){if(server.method()==HTTP_OPTIONS){cors();server.send(204);}else errorResponse(404,"Không tìm thấy API");});
  server.begin();
  addEvent("ESP32 đã khởi động", hardwareReady ? "Tất cả ngõ ra khởi động ở trạng thái tắt" : "Lỗi khởi tạo PWM, các ngõ ra bị khóa");
  Serial.println("\n=== ATK LIGHT ==="); Serial.println("Wi-Fi AP: ATK-LIGHT-ESP32");
  Serial.println("AP password: " + apPassword); Serial.println("API URL: http://192.168.4.1"); Serial.println("API token: " + apiToken);
}

void loop() {
  server.handleClient(); runScheduler(); readLightSensor();
  if (dirty && millis() - dirtyAt >= 1500) saveSettings();
  if (strlen(WIFI_SSID) && WiFi.status() != WL_CONNECTED && millis()-lastWifiAttempt >= 15000) { lastWifiAttempt=millis(); WiFi.reconnect(); }
  static bool announced = false;
  if (WiFi.status() == WL_CONNECTED && !announced) { Serial.println("LAN URL: http://" + WiFi.localIP().toString()); announced=true; }
  if (WiFi.status() != WL_CONNECTED) announced=false;
  delay(2);
}
