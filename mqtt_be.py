from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import json
import asyncio
from paho.mqtt import client as mqtt
import threading

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lưu dữ liệu 3 tầng
floor_data = {
    1: {"floor": 1, "status": "Safe", "temperature": 0, "gas": 0, "threshold": 0, "room": 0},
    2: {"floor": 2, "status": "Safe", "temperature": 0, "gas": 0, "threshold": 0, "room": 0},
    3: {"floor": 3, "status": "Safe", "temperature": 0, "gas": 0, "threshold": 0, "room": 0}
}

# WebSocket connections
active_ws_connections = []
data_update_event = threading.Event()

@app.get("/mobile")
def get_mobile_alert():
    """Serve mobile alert page"""
    return FileResponse("web/mobile-alert.html")

@app.get("/api/sensors/latest")
def get_latest():
    return {
        "floors": floor_data,
        "dangerFloors": [f for f, d in floor_data.items() if d["status"] == "Danger"]
    }

@app.websocket("/ws/sensors")
async def websocket_endpoint(websocket: WebSocket):
    print(f"🔗 WebSocket connection attempt from {websocket.client}")
    try:
        await websocket.accept()
        active_ws_connections.append(websocket)
        print(f"🔌 WebSocket client connected! Total: {len(active_ws_connections)}")
        
        # Gửi dữ liệu ban đầu
        await websocket.send_json({
            "floors": floor_data,
            "dangerFloors": [f for f, d in floor_data.items() if d["status"] == "Danger"]
        })
        print(f"📤 Sent initial data to client")
        
        # Listen for data updates and broadcast
        while True:
            # Wait for data update signal (with timeout to check connection)
            await asyncio.sleep(0.1)
            
            if data_update_event.is_set():
                # Send updated data
                broadcast_data = {
                    "floors": floor_data,
                    "dangerFloors": [f for f, d in floor_data.items() if d["status"] == "Danger"]
                }
                await websocket.send_json(broadcast_data)
                data_update_event.clear()
                
    except WebSocketDisconnect:
        if websocket in active_ws_connections:
            active_ws_connections.remove(websocket)
        print(f"⚠️ WebSocket client disconnected. Remaining: {len(active_ws_connections)}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        if websocket in active_ws_connections:
            active_ws_connections.remove(websocket)

# ===== MQTT config =====
BROKER = "broker.hivemq.com"
PORT = 1883
TOPICS = [
    ("fire-system/f1/data", 0),
    ("fire-system/f2/data", 0),
    ("fire-system/f3/data", 0)
]
CLIENT_ID = "python-fire-monitor-multifloor-001"

mqtt_client = None

def on_connect(client, userdata, flags, rc, properties=None):
    print(f"✅ MQTT connected rc={rc}")
    client.subscribe(TOPICS)
    print(f"📡 Subscribed to all 3 floors")

def on_message(client, userdata, msg):
    global floor_data
    try:
        payload = msg.payload.decode("utf-8", errors="ignore")
        data = json.loads(payload)
        
        floor = data.get("floor", 0)
        if floor in floor_data:
            floor_data[floor] = data
            print(f"📩 Floor {floor}: {data['status']} - Temp: {data['temperature']}°C, Gas: {data['gas']}")
            
            # Signal that data has been updated
            data_update_event.set()
    except Exception as e:
        print("❌ Lỗi parse:", e, "raw=", msg.payload)

@app.on_event("startup")
def start_mqtt():
    global mqtt_client
    import time
    
    # Initialize MQTT
    dynamic_client_id = f"{CLIENT_ID}-{int(time.time())}"
    mqtt_client = mqtt.Client(client_id=dynamic_client_id, protocol=mqtt.MQTTv311)
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.connect(BROKER, PORT, keepalive=60)
    mqtt_client.loop_start()
    print(f"▶️ MQTT loop started - monitoring 3 floors (ID: {dynamic_client_id})")

@app.on_event("shutdown")
def stop_mqtt():
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("⏹ MQTT stopped")
