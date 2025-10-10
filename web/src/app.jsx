import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Flame, Wind, Thermometer, AlertTriangle, Activity, Wifi } from "lucide-react";

function App() {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const audioRef = useRef(null);
  const [alarmPlaying, setAlarmPlaying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      axios.get("http://localhost:8000/api/sensors/latest")
        .then(res => {
          setData(res.data);
          setIsConnected(true);
        })
        .catch(() => {
          setData(null);
          setIsConnected(false);
        });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data?.status === "Danger" && !alarmPlaying) {
      playAlarm();
    } else if (data?.status !== "Danger" && alarmPlaying) {
      stopAlarm();
    }
  }, [data?.status]);

  const playAlarm = () => {
    if (!audioRef.current) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      audioRef.current = { oscillator, gainNode, audioContext };
      setAlarmPlaying(true);
      
      let freq = 800;
      const interval = setInterval(() => {
        freq = freq === 800 ? 1000 : 800;
        oscillator.frequency.value = freq;
      }, 300);
      
      audioRef.current.interval = interval;
    }
  };

  const stopAlarm = () => {
    if (audioRef.current) {
      clearInterval(audioRef.current.interval);
      audioRef.current.oscillator.stop();
      audioRef.current.audioContext.close();
      audioRef.current = null;
      setAlarmPlaying(false);
    }
  };

  const isDanger = data?.status === "Danger";
  const hasData = data && data.message !== "No data yet";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <style>{`
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes siren {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
        .pulse-danger {
          animation: pulse-red 1s infinite;
        }
        .shake {
          animation: shake 0.5s infinite;
        }
        .siren {
          animation: siren 0.5s infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-600 siren' : 'bg-blue-600'}`}>
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Hệ Thống Cảnh Báo Cháy</h1>
                <p className="text-slate-400">IoT Fire Detection System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className={`w-5 h-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? 'Kết nối' : 'Mất kết nối'}
              </span>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {isDanger && (
          <div className="bg-red-600 rounded-2xl shadow-2xl p-8 mb-6 pulse-danger border-4 border-red-400">
            <div className="flex items-center justify-center gap-4 shake">
              <AlertTriangle className="w-16 h-16 text-white" />
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-2">⚠️ CẢNH BÁO CHÁY! ⚠️</h2>
                <p className="text-xl text-white">Phát hiện nhiệt độ cao và khí gas vượt ngưỡng!</p>
              </div>
              <AlertTriangle className="w-16 h-16 text-white" />
            </div>
          </div>
        )}

        {/* Main Dashboard */}
        {!hasData ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center border border-slate-700">
            <Activity className="w-16 h-16 text-slate-500 mx-auto mb-4 animate-pulse" />
            <p className="text-2xl text-slate-400">⏳ Đang chờ dữ liệu từ cảm biến...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Temperature Card */}
            <div className={`rounded-2xl shadow-2xl p-6 border-2 ${
              isDanger 
                ? 'bg-red-900/30 border-red-500 pulse-danger' 
                : 'bg-slate-800/50 border-slate-700'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-600' : 'bg-orange-600'}`}>
                  <Thermometer className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Nhiệt Độ</h3>
              </div>
              <div className="text-center">
                <p className={`text-5xl font-bold mb-2 ${isDanger ? 'text-red-400' : 'text-orange-400'}`}>
                  {data.temperature?.toFixed(1)}°C
                </p>
                <p className="text-slate-400">Temperature</p>
              </div>
            </div>

            {/* Gas Sensor Card */}
            <div className={`rounded-2xl shadow-2xl p-6 border-2 ${
              isDanger 
                ? 'bg-red-900/30 border-red-500 pulse-danger' 
                : 'bg-slate-800/50 border-slate-700'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-600' : 'bg-purple-600'}`}>
                  <Wind className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Khí Gas</h3>
              </div>
              <div className="text-center">
                <p className={`text-5xl font-bold mb-2 ${isDanger ? 'text-red-400' : 'text-purple-400'}`}>
                  {data.gas}
                </p>
                <p className="text-slate-400">PPM Level</p>
              </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl shadow-2xl p-6 border-2 ${
              isDanger 
                ? 'bg-red-900/30 border-red-500 pulse-danger' 
                : 'bg-slate-800/50 border-green-700'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-600 siren' : 'bg-green-600'}`}>
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Trạng Thái</h3>
              </div>
              <div className="text-center">
                <p className={`text-4xl font-bold mb-2 ${isDanger ? 'text-red-400' : 'text-green-400'}`}>
                  {isDanger ? '🚨 NGUY HIỂM' : ' AN TOÀN'}
                </p>
                <p className="text-slate-400">{data.status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Threshold Info */}
        {hasData && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Ngưỡng Cảnh Báo</h3>
                <p className="text-slate-400">Threshold Level: <span className="text-yellow-400 font-bold">{data.threshold}</span></p>
              </div>
              <div className={`px-6 py-3 rounded-xl ${isDanger ? 'bg-red-600' : 'bg-green-600'}`}>
                <p className="text-white font-bold text-xl">
                  {isDanger ? '🔴 ALARM ON' : '🟢 SYSTEM OK'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alarm Status */}
        {isDanger && (
          <div className="mt-6 bg-yellow-900/30 rounded-2xl shadow-2xl p-6 border-2 border-yellow-500">
            <div className="flex items-center justify-center gap-4">
              <div className="animate-pulse">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
              <p className="text-yellow-400 font-bold text-xl">
                🔊 Còi báo động đang hoạt động
              </p>
              <div className="animate-pulse">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;