// The REST transport is shared by desktop and the Android application.
// Polling is coordinated by useLighting; a future WebSocket adapter can use
// the same DeviceState model without changing the presentation components.
export { deviceRequest, normalizeDeviceUrl, readDeviceConfig, storeDeviceConfig } from './esp32';
export type { DeviceConfig, DeviceState, Schedule } from './esp32';
