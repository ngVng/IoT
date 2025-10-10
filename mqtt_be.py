from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from paho.mqtt import client as mqtt

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

latest_data = {"message": "No data yet"}

@app.get("/api/sensors/latest")
def get_latest():
    return latest_data

# ===== MQTT config =====
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "fire-system/data"
CLIENT_ID = "python-fire-monitor-001"

mqtt_client = None

def on_connect(client, userdata, flags, rc, properties=None):
    print(f"✅ MQTT connected rc={rc}")
    client.subscribe(TOPIC)
    print(f"📡 Subscribed: {TOPIC}")

def on_message(client, userdata, msg):
    global latest_data
    try:
        payload = msg.payload.decode("utf-8", errors="ignore")
        data = json.loads(payload)
        latest_data = data
        print("📩 Nhận MQTT:", data)
    except Exception as e:
        print("❌ Lỗi parse:", e, "raw=", msg.payload)

@app.on_event("startup")
def start_mqtt():
    global mqtt_client
    mqtt_client = mqtt.Client(client_id=CLIENT_ID, protocol=mqtt.MQTTv311)
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.connect(BROKER, PORT, keepalive=60)
    mqtt_client.loop_start()
    print("▶️ MQTT loop started")

@app.on_event("shutdown")
def stop_mqtt():
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("⏹ MQTT stopped")
