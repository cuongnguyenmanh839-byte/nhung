import { test, expect } from '@playwright/test';
test('Desktop reference and lighting controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('heading',{name:'TRUNG TÂM ĐIỀU KHIỂN CHIẾU SÁNG'})).toBeVisible();
 await page.screenshot({path:'qa/desktop-1280.png',fullPage:true});
 await page.setViewportSize({width:900,height:556});await page.screenshot({path:'qa/desktop-reference-size.png'});
 await page.getByRole('switch',{name:'Bật/Tắt toàn bộ hệ thống'}).click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(page.locator('.lamps-stat strong')).toHaveText('0');
 await page.getByRole('switch').click();await expect(page.locator('.lamps-stat strong')).toHaveText('168');
 await page.getByRole('button',{name:'Tiết kiệm Tối ưu năng lượng'}).click();await expect(page.getByRole('slider',{name:'Độ sáng chung'})).toHaveValue('35');
 await page.getByRole('button',{name:'Chọn Lán Tỉn Keo'}).click();await page.getByRole('switch',{name:'Bật/tắt Lán Tỉn Keo'}).click();await expect(page.locator('.lamps-stat strong')).toHaveText('136');
 await page.getByRole('button',{name:'Đóng khu vực'}).click();await page.getByRole('button',{name:'Lịch hoạt động',exact:true}).click();await page.getByLabel('Thời gian').fill('20:30');await page.getByRole('button',{name:'Thêm lịch'}).click();await expect(page.locator('.schedule-row')).toHaveCount(3);await page.getByRole('button',{name:'Xóa lịch 20:30'}).click();await expect(page.locator('.schedule-row')).toHaveCount(2);await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.getByRole('button',{name:'Báo cáo',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Tải báo cáo CSV'}).click();expect((await download).suggestedFilename()).toBe('ATK-bao-cao.csv');await page.keyboard.press('Escape');
 expect(errors).toEqual([]);
});
test('Mobile reference, power, areas and navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'qa/mobile-390.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await page.getByRole('button',{name:'Tắt toàn bộ hệ thống',exact:true}).click();await expect(page.getByRole('button',{name:'Bật toàn bộ hệ thống',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Bật Đồi Khau Tý',exact:true}).click();await expect(page.getByRole('button',{name:'Tắt Đồi Khau Tý',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Cảnh sáng',exact:true}).click();await page.getByRole('button',{name:'An ninh Tăng cường'}).click();await expect(page.getByRole('dialog').getByRole('slider',{name:'Độ sáng chung'})).toHaveValue('100');await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(360);await page.screenshot({path:'qa/mobile-360.png',fullPage:true});
});
