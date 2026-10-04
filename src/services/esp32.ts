import type { Alert } from '../data/mock';
export type Schedule = { id: string | number; time: string; mode: string };
export type DeviceConfig = { url: string; token: string };
export type DeviceState = {
 apiVersion: 1; device: string; driver: 'relay'|'cct-pwm'; hardwareReady: boolean;
 brightness: number; temperature: number; mode: number; uptimeSeconds: number;
 timeSynced: boolean; schedulesEnabled: boolean; energyKwh: number|null;
 ambientSensorConnected?: boolean; ambientLux?: number|null;
 capabilities: { brightness: boolean; temperature: boolean; energy: boolean; ambientLight?: boolean };
 areas: {id:string;on:boolean;lamps:number;lit:number}[]; alerts:Alert[]; schedules:Schedule[];
};
export function readDeviceConfig(): DeviceConfig|null {
 try { const value=JSON.parse(sessionStorage.getItem('atk-device')||'null'); return value && typeof value.url==='string' && typeof value.token==='string' ? value : null; } catch {return null;}
}
export function storeDeviceConfig(config: DeviceConfig|null) { if(config) sessionStorage.setItem('atk-device',JSON.stringify(config)); else sessionStorage.removeItem('atk-device'); }
export function normalizeDeviceUrl(value:string){const url=new URL(value.trim());if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('Nhập URL ESP32, ví dụ http://192.168.4.1');return url.origin;}
export class DeviceHttpError extends Error { constructor(message:string,public status:number){super(message);} }
export async function deviceRequest(config:DeviceConfig,path='/api/state',method='GET',body?:unknown):Promise<DeviceState>{
 const abort=new AbortController(); const timeout=setTimeout(()=>abort.abort(),5000);
 try {
  const response=await fetch(`${normalizeDeviceUrl(config.url)}${path}`,{method,headers:{Authorization:`Bearer ${config.token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:abort.signal,cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw new DeviceHttpError(data.error||`ESP32 trả lỗi ${response.status}`,response.status);
  if(data.apiVersion!==1||!Array.isArray(data.areas)||data.areas.length!==4||!data.capabilities||!Array.isArray(data.schedules)||!Array.isArray(data.alerts)||!Number.isFinite(data.brightness)||!Number.isFinite(data.temperature)||!Number.isFinite(data.mode))throw new Error('Phản hồi không đúng firmware ATK ESP32');
  if(data.ambientLux!==undefined&&data.ambientLux!==null&&(!Number.isFinite(data.ambientLux)||data.ambientLux<0))throw new Error('Dữ liệu cảm biến ánh sáng không hợp lệ');
  const ids=['khau-ty','tin-keo','memorial','square'];
  if(ids.some(id=>data.areas.filter((a:{id:string;on:boolean;lamps:number;lit:number})=>a.id===id&&typeof a.on==='boolean'&&Number.isInteger(a.lamps)&&a.lamps>=0&&Number.isInteger(a.lit)&&a.lit>=0&&a.lit<=a.lamps).length!==1))throw new Error('Danh sách khu vực ESP32 không hợp lệ');
  return data as DeviceState;
 } catch(error) { if(error instanceof TypeError||error instanceof DOMException)throw new Error('Không kết nối được ESP32. Kiểm tra Wi-Fi, địa chỉ IP và quyền truy cập mạng cục bộ.');throw error; } finally {clearTimeout(timeout);}
}
