# API ของหน้า `#/m/mddp/productivity` (Defect monitoring)

หน้านี้เป็นหน้าวิเคราะห์ (ไม่ realtime) โหลดเมื่อเลือก และโหลดใหม่เมื่อกด Refresh ทุก endpoint เป็น `GET` ตอบ JSON เวลาเป็น epoch ms (UTC)

โครงสร้างข้อมูล: **Run Card → Carrier → Strip** (ไม่มี `sets` / `seq`)
- 1 Run Card = 2,700 ชิ้น, 1 Strip = 20 ชิ้น, Carrier เดียวกันใช้ซ้ำใน Run Card เดียวได้ จึงมีหลาย Strip
- Carrier no ตอบเป็นรหัส เช่น `"CR-0005"` (ไม่ใช่เลข 1 2 3; รูปแบบรหัสเป็นค่าสมมติ ใช้รหัสจริงของ carrier ได้)
- Strip no ตอบเป็นข้อความ `"Strip-76"` (เรียงตามเลข: Strip-9 มาก่อน Strip-10)
- ช่วงวันที่: 00:00:00.000 ของ `dateStart` ถึง 23:59:59.999 ของ `dateEnd` (รวมวันสุดท้าย) ตามโซนเวลาของหลังบ้าน (Asia/Bangkok); ไม่ส่ง `dateEnd` = เท่ากับ `dateStart`
- **ทุก API ส่ง `machine_no` ไปด้วย (`"mddp_184"`) และตอบ `machine_no` กลับมา**; ค่าอื่นที่ไม่ใช่เครื่องนี้ → `400 {"error":"unknown machine_no"}`
- **ทุก API ตอบค่าที่ส่งไปกลับมาด้วย** (echo) แล้วตามด้วยผลลัพธ์ ใน object เดียว
- **ส่งค่าได้ 2 แบบ ได้คำตอบเหมือนกัน:**
  - **URL** (`GET` + query string) เช่น `GET /api/mddp/parts?rc=RC-2611150750-01&strip=Strip-76,Strip-77,Strip-78` (หลาย Strip คั่นด้วย `,`)
  - **payload** (`POST` + JSON body, `Content-Type: application/json`) เช่น `POST /api/mddp/parts` body `{"machine_no":"mddp_184","rc":"RC-2611150750-01","strips":["Strip-76","Strip-77","Strip-78"]}` (หลาย Strip เป็น array)
  - ชื่อค่าใน payload: `runcards` = `dateStart`, `dateEnd`, `detail`; `carriers` = `rc`; `strips` = `rc`, `carrier`; `parts` = `rc`, `strips` (array; แบบ URL ใช้ `strip` คั่นด้วย `,`)
  - หน้าเว็บ Defect monitoring ส่งแบบ payload
- ไม่มีข้อมูล = ผลลัพธ์เป็น array ว่าง (HTTP 200); วันที่ผิด → `400 {"error":"invalid date"}`; `dateStart` > `dateEnd` → `400 {"error":"dateStart must not be after dateEnd"}`

> สถานะ: **หน้าเว็บ Defect monitoring ใช้แบบ 3 (2 ขั้นตอน: วันที่ → Run Card/Carrier/Strip no แล้วเลือก Strip → ข้อมูลชิ้นงาน) ทำใน backend แล้ว; แบบ 4 ทำ `/carriers` ไว้แล้ว; แบบ 2 ยังไม่ได้ทำ**

---

# แบบ 1 — ทีละขั้นตามที่ผู้ใช้เลือก

## 1.1 เลือกวันที่ → ได้ Run Card
**ส่งไป:** `GET /api/mddp/runcards?dateStart=2026-11-15&dateEnd=2026-11-15`
**ได้กลับ:** รหัส Run Card เรียงตามรหัส
```json
{ "machine_no": "mddp_184", "dateStart": "2026-11-15", "dateEnd": "2026-11-15",
  "runcards": [ { "rc": "RC-2611150750-01" }, { "rc": "RC-2611151120-02" } ] }
```

## 1.2 เลือก Run Card → ได้ Carrier
**ส่งไป:** `GET /api/mddp/carriers?rc=RC-2611150750-01`
**ได้กลับ:** หมายเลข Carrier ที่อยู่ใน Run Card นั้น เรียงตามหมายเลข
```json
{ "machine_no": "mddp_184", "rc": "RC-2611150750-01",
  "carriers": [ { "carrier": "CR-0001" }, { "carrier": "CR-0002" }, { "carrier": "CR-0016" } ] }
```
ไม่ส่ง `rc` → `400 {"error":"rc required"}`

## 1.3 เลือก Carrier → ได้ Strip no ของ Carrier นั้น
**ส่งไป:** `GET /api/mddp/strips?rc=RC-2611150750-01&carrier=CR-0001`
**ได้กลับ:** Strip no ทั้งหมดของ Carrier นั้นใน Run Card นั้น
```json
{ "machine_no": "mddp_184", "rc": "RC-2611150750-01", "carrier": "CR-0001",
  "strips": [ "Strip-1", "Strip-2", "Strip-3", "Strip-76", "Strip-77", "Strip-78", "Strip-121", "Strip-122", "Strip-123" ] }
```
Carrier 1 ถูกใช้ 3 ครั้ง จึงมี 9 Strip ส่วน Carrier ที่ใช้ครั้งเดียวมี 3 Strip

## 1.4 ส่ง Strip no → ได้ข้อมูลของแต่ละ Strip
**ส่งไป:** `GET /api/mddp/parts?rc=RC-2611150750-01&strip=Strip-76,Strip-77,Strip-78` (ส่ง Strip no ได้หลายตัว คั่นด้วย `,`)
**ได้กลับ:** ค่าที่ส่งไป (`rc`, `strips`) แล้วตามด้วยข้อมูลของแต่ละ Strip (Strip ละ 20 ชิ้น)
```json
{ "machine_no": "mddp_184", "rc": "RC-2611150750-01",
  "strips": [ "Strip-76", "Strip-77", "Strip-78" ],
  "pieces": [
    { "t": 1794729306570, "side": "L", "carrier": "CR-0001", "strip_no": "Strip-76", "suspension_no": 1,
      "temp": 108.5, "peak": 89.9, "dur": 68.9,
      "velx": 29.9, "vely": 4.1, "velz": 5.7, "accx": 5.6, "accy": 0.8, "accz": 1.1, "defect": 0 },
    { "...": "..." } ] }
```
(แต่ละชิ้นระบุ `strip_no` ของตัวเอง; รายละเอียดฟิลด์อยู่ในหัวข้อ "ข้อมูลชิ้นงาน" ท้ายเอกสาร)

(รูปแบบข้อมูลชิ้นงานอยู่ในหัวข้อ "ข้อมูลชิ้นงาน" ท้ายเอกสาร)

---

# แบบ 2 — โยนข้อมูลของแต่ละ Strip มาในครั้งเดียวเลย

**ใช้ง่ายๆ:** เรียกครั้งเดียว ส่งแค่วันที่ แล้วหลังบ้านตอบทุกอย่างกลับมาเลย ไม่ต้องเรียกทีละขั้น

ตอบเป็นลำดับชั้นเดียวกัน คือ Run Card → Carrier → Strip → ข้อมูลของแต่ละ Strip

```
Run Card
 └─ Carrier
     └─ Strip
         └─ ข้อมูลของ Strip นั้น (20 ชิ้น หรือ 20 Suspension)
```

**ส่งไป:**
```
GET /api/mddp/runcards?dateStart=2026-11-15&dateEnd=2026-11-15&detail=2
```

**ได้กลับ:** ค่าที่ส่งไป แล้วตามด้วยทุก Run Card ในช่วงวันที่นั้น (ย่อให้อ่านง่าย):
```json
{ "machine_no": "mddp_184", "dateStart": "2026-11-15", "dateEnd": "2026-11-15",
  "runcards": [
    { "machine_no": "mddp_184", "rc": "RC-2611150750-01",
      "carriers": [
        { "carrier": "CR-0001",
          "strips": [
            { "strip_no": "Strip-1",
              "pieces": [
                { "suspension_no": 1, "t": 1794729054462, "side": "L",
                  "temp": 108.5, "peak": 89.9, "dur": 68.9,
                  "velx": 29.9, "vely": 4.1, "velz": 5.7, "accx": 5.6, "accy": 0.8, "accz": 1.1,
                  "defect": 0 },
                { "suspension_no": 2, "...": "..." }
              ] },
            { "strip_no": "Strip-2", "pieces": [ ... ] }
          ] },
        { "carrier": "CR-0016", "strips": [ ... ] }
      ] },
    { "rc": "RC-2611151120-02", "carriers": [ ... ] }
  ] }
```

**อ่านว่า:** ใน Run Card นี้มี Carrier CR-0001 ซึ่งมี Strip-1 อยู่ และ Strip-1 มีข้อมูลชิ้นงาน (Suspension No. 1–20) ครบอยู่ข้างใน

**ข้อดี:** เรียกแค่ครั้งเดียว ได้ครบทุกอย่าง
**ข้อเสีย:** ก้อนข้อมูลใหญ่ 1 Run Card = 2,700 ชิ้น ถ้าเลือกทั้งวันอาจมีหลายสิบ Run Card (หลายหมื่นถึงแสนชิ้น หลาย MB) จึงควรจำกัดช่วงวันที่ให้สั้น (เช่น ไม่เกิน 1 วัน)

---

# แบบ 3 — 2 ขั้นตอน: เลือกวันที่ได้โครงสร้างทั้งหมด แล้วค่อยขอข้อมูลของ Strip ที่เลือก

**ใช้ง่ายๆ:** ขั้นที่ 1 ส่งวันที่ ได้ครบ Run Card, Carrier และ Strip no (เท่ากับ 1.1–1.3 รวมในครั้งเดียว ยังไม่มีข้อมูลชิ้นงาน) ขั้นที่ 2 ผู้ใช้เลือก Strip no แล้วส่งไปขอข้อมูลของแต่ละ Strip

## ขั้นที่ 1 เลือกวันที่ → ได้ Run Card, Carrier, Strip no (ยังไม่มีข้อมูลชิ้นงาน)
**ส่งไป:**
URL: `GET /api/mddp/runcards?dateStart=2026-11-15&dateEnd=2026-11-15&detail=1`
payload: `POST /api/mddp/runcards` body `{"machine_no":"mddp_184","dateStart":"2026-11-15","dateEnd":"2026-11-15","detail":1}`
**ได้กลับ:** ค่าที่ส่งไป แล้วตามด้วยโครงสร้าง Run Card → Carrier → Strip no ของทุก Run Card ในช่วงวันที่นั้น
```json
{ "machine_no": "mddp_184", "dateStart": "2026-11-15", "dateEnd": "2026-11-15",
  "runcards": [
    { "machine_no": "mddp_184", "rc": "RC-2611150750-01",
      "carriers": [
        { "carrier": "CR-0001",
          "strips": [ ["Strip-1", "Strip-2", "Strip-3"],
                      ["Strip-76", "Strip-77", "Strip-78"],
                      ["Strip-121", "Strip-122", "Strip-123"] ] },
        { "carrier": "CR-0016", "strips": [ ["Strip-46", "Strip-47", "Strip-48"] ] } ] },
    { "rc": "RC-2611151120-02", "carriers": [ ... ] } ] }
```
`strips` แบ่งเป็นกลุ่มละ 3 Strip ต่อ 1 ครั้งที่ Carrier ถูกใช้ (1 กลุ่ม = 1 คอลัมน์บนหน้าเว็บ = 60 ชิ้น)
ตอบเฉพาะรหัส ไม่มีข้อมูลชิ้นงาน จึงเล็กและเร็วกว่าแบบ 2 มาก (ตอบ Run Card เป็นสิบรายการได้สบาย)

## ขั้นที่ 2 เลือก Strip no → ส่ง Strip no ไป ได้ข้อมูลของแต่ละ Strip
**ส่งไป:** Run Card ที่เลือก และ Strip no ที่ผู้ใช้เลือก (หลายตัวคั่นด้วย `,`)
URL: `GET /api/mddp/parts?rc=RC-2611150750-01&strip=Strip-76,Strip-77,Strip-78`
payload: `POST /api/mddp/parts` body `{"machine_no":"mddp_184","rc":"RC-2611150750-01","strips":["Strip-76","Strip-77","Strip-78"]}`
**ได้กลับ:** ค่าที่ส่งไป แล้วตามด้วยข้อมูลของ Strip เหล่านั้น Strip ละ 20 ชิ้น (Suspension No. 1–20)
```json
{ "machine_no": "mddp_184", "rc": "RC-2611150750-01",
  "strips": ["Strip-76", "Strip-77", "Strip-78"],
  "carrier": "CR-0001", "date": "2026-11-15",
  "pieces": [
    { "suspension_no": 1, "t": 1794729306570, "side": "L", "carrier": "CR-0001", "strip_no": "Strip-76",
      "temp": 108.5, "peak": 89.9, "dur": 68.9,
      "velx": 29.9, "vely": 4.1, "velz": 5.7, "accx": 5.6, "accy": 0.8, "accz": 1.1, "defect": 0 },
    { "suspension_no": 2, "...": "..." } ] }
```

# แบบ 4 — 3 ขั้นตอน: Run Card → Carrier (พร้อมสรุปแต่ละ Strip) → ข้อมูลชิ้นงาน

## ขั้นที่ 1 เลือกวันที่ → ได้ Run Card
```
GET /api/mddp/runcards?dateStart=2026-11-15&dateEnd=2026-11-15
```
```json
{ "machine_no": "mddp_184", "dateStart": "2026-11-15", "dateEnd": "2026-11-15",
  "runcards": [ { "rc": "RC-2611150750-01" }, { "rc": "RC-2611151120-02" } ] }
```

## ขั้นที่ 2 เลือก Run Card → ได้ Carrier และ Strip no ของแต่ละ Carrier พร้อมสรุป
```
GET /api/mddp/carriers?rc=RC-2611150750-01
```
```json
{ "machine_no": "mddp_184", "rc": "RC-2611150750-01",
  "carriers": [
    { "carrier": "CR-0001",
      "strips": [ { "strip_no": "Strip-1", "pieces": 20, "defective": 1 },
                  { "strip_no": "Strip-2", "pieces": 20, "defective": 0 } ] } ] }
```
`pieces` = จำนวนชิ้นของ Strip, `defective` = จำนวนชิ้นเสีย

## ขั้นที่ 3 เลือก Strip no → ข้อมูลชิ้นงาน
เหมือนขั้นที่ 2 ของแบบ 3 (`GET /api/mddp/parts?rc=...&strip=Strip-1,Strip-2,Strip-3`)

---

# ข้อมูลชิ้นงาน (ใช้ร่วมกันทุกแบบ) — เลือก Strip → ได้ข้อมูลไปวาดกราฟ

**ส่งไป:** `GET /api/mddp/parts?rc=RC-2611150750-01&strip=Strip-76,Strip-77,Strip-78` (ระบุได้หลาย Strip คั่นด้วย `,`)
**ได้กลับ:** `rc` และ `strips` ที่ส่งไป ตามด้วย `pieces` = ชิ้นงานของ Strip เหล่านั้น Strip ละ 20 ชิ้น เรียงตาม Strip แล้ว `suspension_no`
```json
{ "machine_no": "mddp_184", "rc": "RC-2611150750-01", "strips": ["Strip-76", "Strip-77", "Strip-78"],
  "carrier": "CR-0001", "date": "2026-11-15",
  "pieces": [
    { "t": 1794729306570, "side": "L", "carrier": "CR-0001", "strip_no": "Strip-76", "suspension_no": 1,
      "temp": 108.5, "peak": 89.9, "dur": 68.9,
      "velx": 29.9, "vely": 4.1, "velz": 5.7, "accx": 5.6, "accy": 0.8, "accz": 1.1,
      "defect": 0 } ] }
```
- `carrier` รหัส Carrier ของ Strip ที่ขอ (ถ้า Strip มาจากหลาย Carrier จะเป็น array), `date` วันที่ของชิ้นงาน `YYYY-MM-DD` (โซนเวลาของหลังบ้าน)
- `t` เวลาผลิต (epoch ms); `side` L/R ด้านหัวจ่าย; `suspension_no` Suspension No. 1–20 ใน Strip
- `temp` °C (Epoxy head temperature), `peak` kPa (Dispense pressure), `dur` ms (Epoxy dispense time), `vel*` mm/s (Vibration velocity), `acc*` m/s² (Vibration acceleration)
- `defect` = bitmask 6 บิต: บิต0 ASQ-LCM, 1 ASQ-MCM, 2 ASQ-PCM, 3 ISAD-CM, 4 LM-5, 5 MI (0 = ไม่มี; 1 ชิ้นมีได้หลายรหัส จำนวน defect ของชิ้น = จำนวนบิต 1)
- ไม่ส่ง `rc` หรือ `strip` → `400 {"error":"rc and strip required"}`

หน้าเว็บจัด Strip ที่เลขต่อกัน 3 ตัวเป็น 1 คอลัมน์ (60 ชิ้น) แล้วเรียก `parts` หนึ่งครั้งต่อคอลัมน์ ส่วน % ชิ้นเสียต่อ Strip, สรุป (parts inspected / defects found / defective parts / top defect code), tooltip และไฟล์ Export Excel/PowerPoint คำนวณฝั่งหน้าเว็บจากข้อมูลนี้

## ข้อกำหนดที่หน้าเว็บพึ่งพา
- `strip_no` + `suspension_no` ไม่ซ้ำใน Run Card เดียวกัน; ค่าตัวเลขเป็น number; error เป็น `{"error": "..."}` ไม่ส่งข้อความดิบของฐานข้อมูล
- แคชได้ต่อ Run Card; เวลาตอบเป้าหมาย < 100 ms ต่อคำขอ; ข้อมูลย้อนหลังตาม retention (7 วัน)
