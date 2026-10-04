import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const ids=['khau-ty','tin-keo','memorial','square'];
async function mockDevice(page:Page,pwm=false){
 const state={apiVersion:1,device:'ATK-ESP32',driver:pwm?'cct-pwm':'relay',hardwareReady:true,brightness:70,temperature:4000,mode:0,uptimeSeconds:120,timeSynced:false,schedulesEnabled:false,energyKwh:null,ambientSensorConnected:true,ambientLux:123.4,capabilities:{brightness:pwm,temperature:pwm,energy:false,ambientLight:true},areas:ids.map((id,i)=>({id,on:false,lamps:[38,32,56,42][i],lit:0})),alerts:[],schedules:[] as {id:string;time:string;mode:string}[]};
 let reject=false;const commands:Record<string,unknown>[]=[];
 await page.route('http://esp32.test/**',async route=>{
  const request=route.request();const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'};
  if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  expect(request.headers().authorization).toBe('Bearer test-token');
  if(reject){await route.fulfill({status:401,headers,json:{error:'Sai khóa API'}});return;}
  if(request.method()!=='GET'){
   const body=request.postDataJSON();commands.push(body);
   await new Promise(r=>setTimeout(r,200));
   if('systemOn' in body)state.areas.forEach(a=>{a.on=body.systemOn;a.lit=a.on?a.lamps:0;});
   if('area' in body){const area=state.areas.find(a=>a.id===body.area.id)!;area.on=body.area.on;area.lit=area.on?area.lamps:0;}
   if('brightness' in body)state.brightness=body.brightness;
   if('temperature' in body)state.temperature=body.temperature;
   if('mode' in body){state.mode=body.mode;state.brightness=[70,50,100,35][body.mode];state.temperature=[4000,3000,6000,3000][body.mode];}
   if('schedules' in body){state.schedules=body.schedules;state.schedulesEnabled=body.enabled;}
   if('epoch' in body)state.timeSynced=true;
  }
  await route.fulfill({headers,json:state});
 });
 return {state,commands,fail:()=>{reject=true;}};
}
async function connect(page:Page){
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByRole('button',{name:'Cài đặt',exact:true}).click();
 await page.getByLabel('Địa chỉ ESP32').fill('http://esp32.test');await page.getByLabel('Khóa API (Serial Monitor)').fill('test-token');
 await page.getByRole('button',{name:'Kết nối ESP32',exact:true}).click();await expect(page.getByText(/Đã kết nối ·/)).toBeVisible();
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
}
test('ESP32 relay: acknowledgements, no fake energy, schedule persistence and error rollback',async({page})=>{
 const mock=await mockDevice(page);await connect(page);
 await expect(page.locator('.lamps-stat strong')).toHaveText('0');await expect(page.getByRole('slider',{name:'Độ sáng chung'})).toBeDisabled();await expect(page.getByRole('slider',{name:'Nhiệt độ màu'})).toBeDisabled();
 await expect(page.locator('.energy-stat strong')).toHaveText('— kWh');
 await expect(page.locator('.health-stat')).toContainText('123,4 lx');
 await page.getByRole('switch',{name:'Bật/Tắt toàn bộ hệ thống'}).click();await expect(page.locator('.lamps-stat strong')).toHaveText('0');await expect(page.locator('.lamps-stat strong')).toHaveText('168');
 await page.getByRole('button',{name:'Lịch hoạt động',exact:true}).click();await page.getByLabel('Thời gian').fill('20:30');await page.getByRole('button',{name:'Thêm lịch'}).click();await expect(page.locator('.schedule-row')).toHaveCount(1);
 await page.getByLabel('Bật lịch tự động trên ESP32').click();await expect(page.getByLabel('Bật lịch tự động trên ESP32')).toBeChecked();
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Lịch hoạt động',exact:true}).click();await expect(page.locator('.schedule-row')).toContainText('20:30');await page.getByRole('button',{name:'Đóng',exact:true}).click();
 mock.fail();await page.getByRole('switch',{name:'Bật/Tắt toàn bộ hệ thống'}).click();await expect(page.getByRole('alert')).toContainText('Sai khóa API');await expect(page.locator('.lamps-stat strong')).toHaveText('168');
 expect(mock.commands.some(c=>'schedules' in c)).toBe(true);
});
test('ESP32 PWM: brightness, color, mode and clock use device API',async({page})=>{
 const mock=await mockDevice(page,true);await connect(page);
 const brightness=page.getByRole('slider',{name:'Độ sáng chung'});await expect(brightness).toBeEnabled();await brightness.focus();await brightness.press('End');
 await expect.poll(()=>mock.state.brightness).toBe(100);
 const temperature=page.getByRole('slider',{name:'Nhiệt độ màu'});await temperature.focus();await temperature.press('End');await expect.poll(()=>mock.state.temperature).toBe(6000);
 await page.getByRole('button',{name:'Tiết kiệm Tối ưu năng lượng'}).click();await expect(brightness).toHaveValue('35');
 await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByRole('button',{name:'Đồng bộ giờ từ điện thoại/máy tính'}).click();await expect(page.getByText('Đồng hồ: Đã đồng bộ')).toBeVisible();
});
