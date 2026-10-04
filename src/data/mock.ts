export type Area = { id: string; name: string; lamps: number; lit: number; on: boolean; x: number; y: number; icon: 'mountain' | 'house' | 'temple' | 'monument' };
export const initialAreas: Area[] = [
  {id:'khau-ty',name:'Đồi Khau Tý',lamps:38,lit:38,on:true,x:18,y:35,icon:'mountain'},
  {id:'tin-keo',name:'Lán Tỉn Keo',lamps:32,lit:32,on:true,x:56,y:14,icon:'house'},
  {id:'memorial',name:'Nhà tưởng niệm',lamps:56,lit:56,on:true,x:54,y:44,icon:'temple'},
  {id:'square',name:'Quảng trường',lamps:42,lit:22,on:true,x:78,y:60,icon:'monument'},
];
export const energy = [3,3,4,4,4,5,6,8,10,9,8,7,7,6,8,10,13,16,13,18,15,12,11,20,17,9].map((value,i)=>({time: i===25?'24:00':`${String(Math.floor(i*24/25)).padStart(2,'0')}:00`,value}));
export type Alert = { time: string; title: string; detail: string };
export const initialAlerts: Alert[] = [
  {time:'19:20',title:'Hệ thống hoạt động bình thường',detail:'Hệ thống chiếu sáng ổn định'},
  {time:'14:05',title:'Đèn khu vực Đồi Khau Tý đã bật',detail:'Theo lịch trình Tham quan'},
  {time:'06:32',title:'Hoàn tất kiểm tra định kỳ',detail:'Tất cả các khu vực đều hoạt động tốt'},
];
export const modes = [{name:'Tham quan',detail:'Ánh sáng hài hòa',brightness:70,temp:4000},{name:'Lễ tưởng niệm',detail:'Trang nghiêm',brightness:50,temp:3000},{name:'An ninh',detail:'Tăng cường',brightness:100,temp:6000},{name:'Tiết kiệm',detail:'Tối ưu năng lượng',brightness:35,temp:3000}];
