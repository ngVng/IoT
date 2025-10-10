from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Cho phép frontend React hoặc Wokwi kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections = []

@app.websocket("/ws/sensors")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    print("🔌 ESP32 kết nối!")

    try:
        while True:
            data = await websocket.receive_text()
            print("📩 Nhận từ ESP32:", data)

            # Gửi lại toàn bộ dữ liệu cho client React (nếu có)
            for conn in active_connections:
                if conn != websocket:
                    await conn.send_text(data)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print("⚠️ ESP32 ngắt kết nối")
