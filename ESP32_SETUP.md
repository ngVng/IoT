# 🔥 Hướng Dẫn Setup ESP32 - Hệ Thống Cảnh Báo Cháy 3 Tầng

## 📋 Code ESP32 (Đã được tối ưu)

Code bạn đã cung cấp là **HOÀN TOÀN ĐÚNG** và sẵn sàng sử dụng! ✅

## 🏢 Cấu Hình Cho 3 Tầng

### **Tab 1 - Tầng 1** (https://wokwi.com/projects/445526121602789377)
```cpp
#define FLOOR 1          // ⚠️ Đổi thành 1
#define ROOM  101        // Tùy chọn phòng
```

### **Tab 2 - Tầng 2** (https://wokwi.com/projects/445526064075796481)
```cpp
#define FLOOR 2          // ⚠️ Đổi thành 2
#define ROOM  201        // Tùy chọn phòng
```

### **Tab 3 - Tầng 3** (https://wokwi.com/projects/445526099182133249)
```cpp
#define FLOOR 3          // ⚠️ Đổi thành 3
#define ROOM  301        // Tùy chọn phòng
```

## ✅ Những Gì Code Đã Làm Đúng

1. **Topic riêng cho mỗi tầng**: `fire-system/f1/data`, `fire-system/f2/data`, `fire-system/f3/data`
2. **Payload chứa đủ thông tin**:
   ```json
   {
     "deviceId": "esp32-fire-f1-12a3b4c5",
     "floor": 1,
     "room": 101,
     "temperature": 25.5,
     "gas": 450,
     "threshold": 2500,
     "status": "Safe"
   }
   ```
3. **Unique Client ID**: Mỗi thiết bị có ID riêng để tránh conflict
4. **Auto-reconnect**: WiFi và MQTT tự động kết nối lại

## 🎯 Format Payload (Backend Đã Xử Lý)

Backend (`mqtt_be.py`) sẽ:
- Subscribe vào cả 3 topic: `f1/data`, `f2/data`, `f3/data`
- Lưu dữ liệu riêng cho từng tầng
- Phát hiện tầng nào đang cháy
- Broadcast qua WebSocket đến frontend

## 🚀 Cách Chạy Hệ Thống

### Bước 1: Chạy Backend
```bash
cd IoT
uvicorn mqtt_be:app --reload --host 0.0.0.0 --port 8000
```

### Bước 2: Chạy Frontend
```bash
cd web
npm install
npm run dev
```

### Bước 3: Mở 3 Tab Wokwi
- Tab 1: https://wokwi.com/projects/445526121602789377 (Tầng 1)
- Tab 2: https://wokwi.com/projects/445526064075796481 (Tầng 2)
- Tab 3: https://wokwi.com/projects/445526099182133249 (Tầng 3)

**Quan trọng**: Đảm bảo thay đổi `#define FLOOR` trong mỗi tab!

## 🎮 Kiểm Tra Cảnh Báo

### Cách Gây Cháy (Demo)
- **Tăng nhiệt độ**: Xoay potentiometer trên DHT22
- **Tăng gas**: Xoay potentiometer thứ 2 (POT) để giảm threshold

### Frontend Sẽ:
- ✅ Hiển thị 3 tầng riêng biệt
- 🔥 Tầng cháy sẽ có viền đỏ, nhấp nháy
- 🔊 Âm thanh cảnh báo tự động phát
- 📍 Banner hiện: "Cháy tại tầng: 1, 3" (ví dụ)
- 🔇 Nút "TẮT ÂM THANH" để tắt còi

## 📊 Dữ Liệu Giám Sát

Mỗi tầng hiển thị:
- 🌡️ **Nhiệt độ**: Real-time từ DHT22
- 💨 **Khí Gas**: Giá trị analog từ MQ-2
- ⚠️ **Ngưỡng**: Điều chỉnh bằng POT
- 🚨 **Trạng thái**: Safe / Danger

## 🔧 Tùy Chỉnh Ngưỡng

Trong code ESP32:
```cpp
float TEMP_DANGER   = 60.0;      // °C - Ngưỡng nhiệt độ
int   GAS_MIN_TH    = 500;       // Ngưỡng gas tối thiểu
int   GAS_MAX_TH    = 3500;      // Ngưỡng gas tối đa
```

POT sẽ điều chỉnh threshold trong khoảng [GAS_MIN_TH, GAS_MAX_TH]

## 🎨 Tính Năng Frontend

### Màn Hình Chính
- 3 card tầng riêng biệt
- Màu xanh = An toàn
- Màu đỏ + nhấp nháy = Nguy hiểm

### Khi Cháy
- Banner đỏ to: "⚠️ CẢNH BÁO CHÁY! ⚠️"
- Hiển thị: "Phát hiện cháy tại tầng: 1, 3"
- Nút vàng: "TẮT ÂM THANH"
- Animation rung + xoay icon

### Âm Thanh
- Tự động phát khi phát hiện cháy
- Tần số 800Hz <-> 1000Hz (0.3s)
- Tắt tự động khi hết cháy
- Tắt thủ công bằng nút

## 🐛 Troubleshooting

### Backend không nhận MQTT:
```bash
# Kiểm tra log
📡 Subscribed to all 3 floors
📩 Floor 1: Safe - Temp: 25.5°C, Gas: 450
```

### Frontend không kết nối WebSocket:
- Kiểm tra: `http://localhost:8000/api/sensors/latest`
- Phải trả về: `{"floors": {...}, "dangerFloors": [...]}`

### Wokwi không gửi dữ liệu:
- Check Serial Monitor: `📤 fire-system/f1/data -> {...}`
- Đảm bảo WiFi: `✅ WiFi OK`
- Đảm bảo MQTT: `✅ MQTT connected`

## 📝 Ghi Chú

- ✅ Code ESP32 bạn cung cấp là **HOÀN HẢO**, chỉ cần đổi `FLOOR`
- ✅ Backend đã update để xử lý 3 tầng + WebSocket
- ✅ Frontend đã có: 3 tầng, cảnh báo âm thanh, nút tắt
- ✅ Không cần thêm hardware, chỉ cần 3 tab Wokwi

## 🎉 Kết Quả

Bạn sẽ có 1 hệ thống cảnh báo cháy hoàn chỉnh:
- 🏢 3 tầng giám sát độc lập
- 🔥 Phát hiện chính xác tầng cháy
- 🔊 Âm thanh cảnh báo tự động
- 🔇 Tắt cảnh báo thủ công
- 📊 Dashboard real-time đẹp mắt
