# Calorie Tracker

เว็บแอปติดตามแคลอรีรายวันสำหรับเพิ่มน้ำหนัก ใช้ภาษาไทยทั้งหมดและออกแบบโทนขาว/ดำ/เทาแบบ minimal editorial

## ใช้งาน

เปิดเว็บผ่าน GitHub Pages แล้วใช้ Safari บน iPhone เลือก Share -> Add to Home Screen

## การบันทึกข้อมูล

ค่าเริ่มต้นบันทึกในเครื่องด้วย `localStorage` เพื่อไม่ส่งข้อมูลสุขภาพออกไปโดยอัตโนมัติ

ถ้าต้องการใช้ Google Sheets backend เดิม ให้กดปุ่ม `ส่งขึ้นชีต` หรือ `ดึงจากชีต` ในหน้าแอปเอง ข้อมูลโปรไฟล์และรายการอาหารจะถูกส่งไปยัง Apps Script URL ที่ตั้งไว้ใน `index.html`

## เปิดบนเครื่องระหว่างแก้ไข

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\serve.ps1" -Port 4173
```

จากนั้นเปิด `http://127.0.0.1:4173/`
