from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from paho.mqtt import client as mqtt

app = FastAPI()

# Cho phép React truy cập
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


# ===== MQTT setup =====
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "fire-system/data"

def on_message(client, userdata, msg):
    global latest_data
    payload = msg.payload.decode()
    try:
        latest_data = json.loads(payload)
        print("📩 Nhận MQTT:", latest_data)
    except:
        print("❌ Lỗi parse dữ liệu")

mqtt_client = mqtt.Client()
mqtt_client.on_message = on_message
mqtt_client.connect(BROKER, PORT)
mqtt_client.subscribe(TOPIC)
mqtt_client.loop_start()

# uvicorn mqtt_be:app --reload
