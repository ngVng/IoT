import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      axios.get("http://127.0.0.1:8000/api/sensors/latest")
        .then(res => setData(res.data))
        .catch(() => setData(null));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  if (!data || data.message === "No data yet") return <p>⏳ Chưa có dữ liệu...</p>;

  const isDanger = data.status === "Danger";

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h1>🔥 Hệ thống báo cháy IoT (MQTT)</h1>
      <p>Nhiệt độ: {data.temperature?.toFixed(1)} °C</p>
      <p>Khí gas: {data.gas}</p>
      <p>Ngưỡng: {data.threshold}</p>
      <p>
        Trạng thái: <b style={{ color: isDanger ? "red" : "green" }}>{data.status}</b>
      </p>
      {isDanger && <h2 style={{ color: "red", animation: "blink 1s infinite" }}>🚨 CẢNH BÁO CHÁY! 🚨</h2>}
    </div>
  );
}

export default App;
