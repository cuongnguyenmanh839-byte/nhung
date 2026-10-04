#pragma once

// ESP32 DevKit / WROOM-32. Change this file to match YOUR driver wiring.
// This firmware is not a pin map for ESP32-C3/S3 boards.
constexpr char WIFI_SSID[] = "";      // Blank = use ESP access point only.
constexpr char WIFI_PASSWORD[] = "";

enum class DriverMode { Relay, CctPwm };
#ifdef ATK_DRIVER_CCT
constexpr DriverMode DRIVER_MODE = DriverMode::CctPwm;
#else
constexpr DriverMode DRIVER_MODE = DriverMode::Relay;
#endif
constexpr bool RELAY_ACTIVE_LOW = true;
constexpr bool PWM_ACTIVE_LOW = false;

// Four zones: Khau Ty, Tin Keo, Memorial, Square.
constexpr int RELAY_PINS[4] = {16, 17, 18, 19};
// Optional two-channel constant-voltage LED drivers (warm/cool) per zone.
// Used ONLY when DRIVER_MODE = DriverMode::CctPwm.
constexpr int WARM_PINS[4] = {16, 18, 21, 25};
constexpr int COOL_PINS[4] = {17, 19, 22, 26};
constexpr unsigned PWM_HZ = 5000;
constexpr unsigned PWM_BITS = 12;
constexpr unsigned SERIAL_BAUD = 115200;
constexpr unsigned MAX_SCHEDULES = 16;

// BH1750 ambient-light sensor. Keep the breakout powered at 3.3 V so its
// I2C pull-ups never expose the ESP32 pins to 5 V.
constexpr int LIGHT_SENSOR_SDA_PIN = 32;
constexpr int LIGHT_SENSOR_SCL_PIN = 33;
constexpr uint8_t LIGHT_SENSOR_ADDRESS = 0x23; // ADDR tied low (GY-30 default).
constexpr unsigned LIGHT_SENSOR_INTERVAL_MS = 1000;

// Lamp counts are configured inventory, NOT feedback from individual lamps.
constexpr unsigned LAMP_COUNTS[4] = {38, 32, 56, 42};
