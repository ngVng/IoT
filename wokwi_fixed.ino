#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ===== Pins & sensors =====
#define DHTPIN   4
#define DHTTYPE  DHT22
#define MQ2PIN   34
#define POTPIN   35

// ===== Floor/Room (đổi cho từng tab) =====
#define FLOOR 2          // Tab 1: 1, Tab 2: 2, Tab 3: 3
#define ROOM  101        // tuỳ chọn

// ===== WiFi =====
const char* ssid     = "Wokwi-GUEST";
const char* password = "";

// ===== MQTT (HiveMQ public) =====
const char* mqtt_server = "broker.hivemq.com";
const int   mqtt_port   = 1883;

// ===== App config =====
float TEMP_DANGER   = 60.0;      // °C
int   GAS_MIN_TH    = 500;       // min threshold
int   GAS_MAX_TH    = 3500;      // max threshold

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

String topic;        // fire-system/f{FLOOR}/data
String clientId;     // unique cho từng thiết bị

// ---------- WiFi ----------
void wifiConnect() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(400);
  }
  Serial.println("\n✅ WiFi OK");
}

// ---------- MQTT ----------
void mqttReconnect() {
  while (!client.connected()) {
    Serial.print("🔗 MQTT...");
    // clientId unique để không đụng nhau khi mở nhiều tab
    clientId = "esp32-fire-f" + String(FLOOR) + "-" + String((uint32_t)millis(), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("✅ connected");
      // Thiết bị CHỈ publish, không cần subscribe
    } else {
      Serial.print("❌ code="); Serial.println(client.state());
      delay(1500);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Đợi DHT22 khởi động
  delay(2000);

  topic = String("fire-system/f") + FLOOR + "/data";   // ví dụ: fire-system/f1/data

  wifiConnect();
  client.setServer(mqtt_server, mqtt_port);
}

// ---------- Loop ----------
void loop() {
  if (WiFi.status() != WL_CONNECTED) wifiConnect();
  if (!client.connected()) mqttReconnect();
  client.loop();

  // đọc sensor với retry
  float temp = dht.readTemperature();
  
  // Nếu DHT22 lỗi, thử đọc lại 1 lần
  if (isnan(temp)) {
    delay(100);
    temp = dht.readTemperature();
  }
  
  // Nếu vẫn lỗi, báo lỗi rõ ràng (không dùng random)
  if (isnan(temp)) {
    Serial.println("⚠️ DHT22 read failed!");
    temp = 25.0;  // Giá trị mặc định thay vì random
  }
  
  int gas = analogRead(MQ2PIN);
  int pot = analogRead(POTPIN);
  int threshold = map(pot, 0, 4095, GAS_MIN_TH, GAS_MAX_TH);

  String status = (temp >= TEMP_DANGER || gas >= threshold) ? "Danger" : "Safe";

  // payload có floor/room để backend dùng luôn
  String payload = String("{") +
    "\"deviceId\":\"" + clientId + "\"," +
    "\"floor\":" + FLOOR + "," +
    "\"room\":" + ROOM + "," +
    "\"temperature\":" + String(temp, 1) + "," +
    "\"gas\":" + gas + "," +
    "\"threshold\":" + threshold + "," +
    "\"status\":\"" + status + "\"" +
  "}";

  bool ok = client.publish(topic.c_str(), payload.c_str());
  Serial.print(ok ? "📤 " : "❌ ");
  Serial.print(topic); Serial.print(" -> "); Serial.println(payload);

  delay(2000);
}
