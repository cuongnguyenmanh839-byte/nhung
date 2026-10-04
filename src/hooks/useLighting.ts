import { useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { initialAreas, initialAlerts, modes } from '../data/mock';
import { deviceRequest, normalizeDeviceUrl, readDeviceConfig, storeDeviceConfig, DeviceHttpError } from '../services/esp32';
import type { DeviceConfig, DeviceState, Schedule } from '../services/esp32';

export function useLighting() {
 const [areas,setAreas]=useState(()=>readDeviceConfig()?initialAreas.map(a=>({...a,on:false,lit:0})):initialAreas), [brightness,setBrightness]=useState(70), [temperature,setTemperature]=useState(4000), [mode,setMode]=useState(0), [alerts,setAlerts]=useState(()=>readDeviceConfig()?[]:initialAlerts);
 const [displayName,changeDisplayName]=useState('Quản trị viên');
 const [schedules,updateSchedules]=useState<Schedule[]>([{id:1,time:'18:00',mode:'Tham quan'},{id:2,time:'23:00',mode:'Tiết kiệm'}]);
 const [deviceConfig,setDeviceConfig]=useState<DeviceConfig|null>(readDeviceConfig);
 const [device,setDevice]=useState<DeviceState|null>(null), [connected,setConnected]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState('');
 const generation=useRef(0), pending=useRef(0), queue=useRef(Promise.resolve()), lastDevice=useRef<DeviceState|null>(null);
 const timers=useRef<Record<string,ReturnType<typeof setTimeout>>>({});
 const on=areas.some(a=>a.on), live=!!deviceConfig;
 const apply=(data:DeviceState)=>{
  lastDevice.current=data;setDevice(data);setConnected(true);
  setAreas(initialAreas.map(a=>{const actual=data.areas.find(item=>item.id===a.id);return actual?{...a,...actual}:a;}));
  setBrightness(data.brightness);setTemperature(data.temperature);setMode(data.mode);
  updateSchedules(data.schedules);setAlerts(data.alerts);
 };
 const clearTimers=()=>{Object.values(timers.current).forEach(clearTimeout);timers.current={};};
 useEffect(()=>{
  if(!deviceConfig)return;
  let active=true;const gen=generation.current;
  const poll=async()=>{if(pending.current||Object.keys(timers.current).length)return;try{const data=await deviceRequest(deviceConfig);if(active&&gen===generation.current&&!pending.current&&!Object.keys(timers.current).length)apply(data);}catch{if(active&&gen===generation.current)setConnected(false);}};
  void poll();const interval=setInterval(()=>void poll(),4000);
  return()=>{active=false;clearInterval(interval);};
 },[deviceConfig]);
 useEffect(()=>()=>{clearTimers();},[]);
 const log=(title:string,detail:string)=>setAlerts(prev=>[{time:new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}),title,detail},...prev].slice(0,30));
 const send=(path:string,method:string,body:unknown)=>{
  if(!deviceConfig)return;
  const config=deviceConfig,gen=generation.current;pending.current++;
  queue.current=queue.current.then(async()=>{
   if(gen!==generation.current)return;
   try{const data=await deviceRequest(config,path,method,body);if(gen===generation.current){apply(data);setError('');}}
   catch(e){if(gen===generation.current){if(lastDevice.current)apply(lastDevice.current);setConnected(e instanceof DeviceHttpError&&e.status!==401&&e.status!==503);setError(e instanceof Error?e.message:'Không gửi được lệnh');}}
  }).finally(()=>{pending.current--;});
 };
 const control=(body:unknown)=>send('/api/control','POST',body);
 const toggleSystem=()=>{
  if(live){clearTimers();control({systemOn:!on});return;}
  const next=!on;setAreas(prev=>prev.map(a=>({...a,on:next,lit:next?a.lamps:0})));log(next?'Đã bật toàn bộ hệ thống':'Đã tắt toàn bộ hệ thống','Thao tác từ trung tâm điều khiển');
 };
 const toggleArea=(id:string)=>{
  const area=areas.find(a=>a.id===id);if(!area)return;
  if(live){control({area:{id,on:!area.on}});return;}
  setAreas(prev=>prev.map(a=>a.id===id?{...a,on:!a.on,lit:a.on?0:a.lamps}:a));log(`Đã ${area.on?'tắt':'bật'} ${area.name}`,'Điều khiển khu vực');
 };
 const delayedControl=(key:string,value:number)=>{
  clearTimeout(timers.current[key]);timers.current[key]=setTimeout(()=>{delete timers.current[key];control({[key]:value});},180);
 };
 const changeBrightness=(n:number)=>{if(live&&!device?.capabilities.brightness)return;setBrightness(n);if(live)delayedControl('brightness',n);};
 const changeTemperature=(n:number)=>{if(live&&!device?.capabilities.temperature)return;setTemperature(n);if(live)delayedControl('temperature',n);};
 const chooseMode=(n:number)=>{if(live){clearTimers();control({mode:n});return;}setMode(n);setBrightness(modes[n].brightness);setTemperature(modes[n].temp);log(`Chế độ ${modes[n].name}`,modes[n].detail);};
 const setSchedules=(action:SetStateAction<Schedule[]>)=>{
  const next=typeof action==='function'?action(schedules):action;
  if(live){send('/api/schedules','PUT',{schedules:next.map(s=>({...s,id:String(s.id)})),enabled:device?.schedulesEnabled??false});return;}
  updateSchedules(next);
 };
 const setSchedulesEnabled=(enabled:boolean)=>send('/api/schedules','PUT',{schedules:schedules.map(s=>({...s,id:String(s.id)})),enabled});
 const connectDevice=async(config:DeviceConfig)=>{
  setBusy(true);setError('');
  try{
   const normalized={...config,url:normalizeDeviceUrl(config.url)};const data=await deviceRequest(normalized);
   generation.current++;clearTimers();storeDeviceConfig(normalized);setDeviceConfig(normalized);apply(data);
  }catch(e){setError(e instanceof Error?e.message:'Không kết nối được ESP32');}finally{setBusy(false);}
 };
 const disconnectDevice=()=>{
  generation.current++;clearTimers();storeDeviceConfig(null);setDeviceConfig(null);setDevice(null);lastDevice.current=null;setConnected(false);setError('');
  setAreas(initialAreas);setBrightness(70);setTemperature(4000);setMode(0);setAlerts(initialAlerts);updateSchedules([{id:1,time:'18:00',mode:'Tham quan'},{id:2,time:'23:00',mode:'Tiết kiệm'}]);
 };
 const syncDeviceTime=()=>send('/api/time','POST',{epoch:Math.floor(Date.now()/1000)});
 return {areas,on,brightness,temperature,mode,alerts,displayName,changeDisplayName,schedules,setSchedules,toggleSystem,toggleArea,changeBrightness,changeTemperature,chooseMode,
  deviceConfig,device,connected,busy,error,clearError:()=>setError(''),connectDevice,disconnectDevice,syncDeviceTime,setSchedulesEnabled,live,
  energyKwh:live?(device?.energyKwh??null):86.4,
  lit:areas.reduce((sum,a)=>sum+(a.on?a.lit:0),0)};
}
export type Lighting = ReturnType<typeof useLighting>;
