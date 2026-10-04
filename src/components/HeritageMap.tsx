import { Fragment, useState } from 'react';
import { Plus, Minus, LocateFixed, X, MapPin, Landmark, Route, SquareDashed } from 'lucide-react';
import type { Lighting } from '../hooks/useLighting';
import { Switch } from './Controls';
export function HeritageMap({state}:{state:Lighting}){
 const [zoom,setZoom]=useState(1),[selected,setSelected]=useState<string|null>(null);
 const area=state.areas.find(a=>a.id===selected);
 const labels:Record<string,{x:number;y:number;width:number}>={'khau-ty':{x:20.9,y:32.7,width:14},'tin-keo':{x:58.1,y:15.2,width:13},memorial:{x:56.8,y:45.3,width:16},square:{x:80.7,y:61.5,width:15}};
 return <section className="panel heritage-map" aria-label="Bản đồ khu di tích">
  <div className={`map-scene ${state.on?'':'lights-off'}`} style={{transform:`scale(${zoom})`}}>
   <img src="./reference.jpg" className="map-reference" alt="Cảnh quan khu di tích ATK Định Hóa"/>
   {state.areas.map(a=><Fragment key={a.id}><button className={`map-marker ${a.on?'':'off'}`} style={{left:`${a.x}%`,top:`${a.y}%`}} onClick={()=>setSelected(a.id)} aria-label={`Chọn ${a.name}`}><MapPin/></button><button aria-hidden="true" tabIndex={-1} className="map-label" style={{left:`${labels[a.id].x}%`,top:`${labels[a.id].y}%`,width:`${labels[a.id].width}%`}} onClick={()=>setSelected(a.id)}>{a.name}</button></Fragment>)}
  </div>
  <h2>BẢN ĐỒ KHU DI TÍCH</h2>
  <div className="map-compass" aria-label="La bàn hướng Bắc"><span>B</span><LocateFixed/><small>N</small></div>
  <div className="map-legend"><span><i/>Khu vực chiếu sáng</span><span><Route/>Đường kết nối</span><span><Landmark/>Công trình, điểm di tích</span><span><SquareDashed/>Ranh giới khu di tích</span></div>
  <div className="map-motto">DI SẢN HÔM NAY<small>ÁNH SÁNG CHO NHỮNG THẾ HỆ MAI SAU</small></div>
  <div className="map-zoom"><button aria-label="Phóng to bản đồ" onClick={()=>setZoom(z=>Math.min(1.8,z+.2))}><Plus/></button><button aria-label="Thu nhỏ bản đồ" onClick={()=>setZoom(z=>Math.max(1,z-.2))}><Minus/></button><button aria-label="Đặt lại bản đồ" onClick={()=>setZoom(1)}><LocateFixed/></button></div>
  {area&&<div className="map-popover"><button className="close" aria-label="Đóng khu vực" onClick={()=>setSelected(null)}><X/></button><strong>{area.name}</strong><span>{area.lamps} đèn · {area.on?'Đang bật':'Đã tắt'}</span><Switch on={area.on} onClick={()=>state.toggleArea(area.id)} label={`Bật/tắt ${area.name}`}/></div>}
 </section>;
}
