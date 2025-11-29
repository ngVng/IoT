import { useEffect, useState, useRef } from "react";
import { Flame, Wind, Thermometer, AlertTriangle, Activity, Wifi, Building2, VolumeX } from "lucide-react";

function App() {
  const [floorData, setFloorData] = useState({
    1: { floor: 1, status: "Safe", temperature: 0, gas: 0, threshold: 0, room: 0 },
    2: { floor: 2, status: "Safe", temperature: 0, gas: 0, threshold: 0, room: 0 },
    3: { floor: 3, status: "Safe", temperature: 0, gas: 0, threshold: 0, room: 0 }
  });
  const [dangerFloors, setDangerFloors] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef(null);
  const [alarmPlaying, setAlarmPlaying] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const wsRef = useRef(null);
  const [userInteracted, setUserInteracted] = useState(false);

  // Enable audio on first user interaction
  useEffect(() => {
    const enableAudio = () => {
      setUserInteracted(true);
      console.log("🎵 Audio enabled by user interaction");
    };
    
    // Listen for any user interaction
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket("ws://localhost:8000/ws/sensors");
      
      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setFloorData(data.floors);
        setDangerFloors(data.dangerFloors);
      };
      
      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log("⚠️ WebSocket disconnected, reconnecting...");
        setIsConnected(false);
        setTimeout(connectWebSocket, 2000);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Alarm control
  useEffect(() => {
    console.log("🔔 Alarm check:", { dangerFloors: dangerFloors.length, alarmPlaying, alarmMuted, userInteracted });
    if (dangerFloors.length > 0 && !alarmPlaying && !alarmMuted) {
      console.log("🚨 Attempting to play alarm...");
      playAlarm();
    } else if (dangerFloors.length === 0 && alarmPlaying) {
      console.log("✅ Stopping alarm - all safe");
      stopAlarm();
    }
  }, [dangerFloors, alarmMuted, userInteracted]);

  const speakWarning = (floors) => {
    // Text-to-Speech warning
    if ('speechSynthesis' in window) {
      const floorText = floors.length === 1 
        ? `tầng ${floors[0]}` 
        : `các tầng ${floors.join(", ")}`;
      
      const message = `Cảnh báo! Phát hiện cháy tại ${floorText}. Yêu cầu sơ tán ngay lập tức! Tôi nhắc lại. Có cháy tại ${floorText}. Vui lòng di chuyển đến lối thoát hiểm gần nhất!`;
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'vi-VN'; // Vietnamese
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.1; // Slightly higher pitch for urgency
      utterance.volume = 1; // Maximum volume
      
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      // Speak the warning
      window.speechSynthesis.speak(utterance);
      console.log("🔊 Voice warning:", message);
      
      // Repeat every 15 seconds
      const voiceInterval = setInterval(() => {
        if (dangerFloors.length > 0 && !alarmMuted) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } else {
          clearInterval(voiceInterval);
        }
      }, 15000);
      
      return voiceInterval;
    }
  };

  const playAlarm = () => {
    if (!audioRef.current) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log("🔓 AudioContext resumed");
          });
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'square';
        gainNode.gain.value = 0.08;
        
        oscillator.start();
        
        audioRef.current = { oscillator, gainNode, audioContext };
        setAlarmPlaying(true);
        console.log("🔊 Alarm started successfully! State:", audioContext.state);
        
        // Play voice warning
        const voiceInterval = speakWarning(dangerFloors);
        
        let freq = 800;
        const interval = setInterval(() => {
          freq = freq === 800 ? 1000 : 800;
          if (oscillator && oscillator.frequency) {
            oscillator.frequency.value = freq;
          }
        }, 300);
        
        audioRef.current.interval = interval;
        audioRef.current.voiceInterval = voiceInterval;
      } catch (error) {
        console.error("❌ Failed to start alarm:", error);
        // Try again after user interaction
        if (!userInteracted) {
          console.log("⚠️ Waiting for user interaction to enable audio...");
        }
      }
    }
  };

  const stopAlarm = () => {
    if (audioRef.current) {
      clearInterval(audioRef.current.interval);
      if (audioRef.current.voiceInterval) {
        clearInterval(audioRef.current.voiceInterval);
      }
      // Stop speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      audioRef.current.oscillator.stop();
      audioRef.current.audioContext.close();
      audioRef.current = null;
      setAlarmPlaying(false);
    }
  };

  const muteAlarm = () => {
    setAlarmMuted(true);
    stopAlarm();
    // Stop speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    console.log("🔇 Alarm muted");
  };

  const unmuteAlarm = () => {
    setAlarmMuted(false);
    console.log("🔊 Alarm unmuted - will play if danger exists");
  };

  // Auto unmute when all floors are safe
  useEffect(() => {
    if (dangerFloors.length === 0 && alarmMuted) {
      setAlarmMuted(false);
    }
  }, [dangerFloors]);

  const isDanger = dangerFloors.length > 0;

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 shake flex-1">
                <AlertTriangle className="w-16 h-16 text-white" />
                <div className="text-center flex-1">
                  <h2 className="text-4xl font-bold text-white mb-2">⚠️ CẢNH BÁO CHÁY! ⚠️</h2>
                  <p className="text-xl text-white mb-2">Phát hiện cháy tại tầng: <span className="font-bold">{dangerFloors.join(", ")}</span></p>
                  <p className="text-lg text-white">Nhiệt độ cao hoặc khí gas vượt ngưỡng!</p>
                </div>
                <AlertTriangle className="w-16 h-16 text-white" />
              </div>
              <div className="ml-4">
                {alarmMuted ? (
                  <button 
                    onClick={unmuteAlarm}
                    className="bg-green-500 hover:bg-green-600 text-black px-6 py-4 rounded-xl font-bold text-lg flex items-center gap-2 transition-all"
                  >
                    <Activity className="w-6 h-6" />
                    BẬT ÂM THANH
                  </button>
                ) : alarmPlaying && (
                  <button 
                    onClick={muteAlarm}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-4 rounded-xl font-bold text-lg flex items-center gap-2 transition-all"
                  >
                    <VolumeX className="w-6 h-6" />
                    TẮT ÂM THANH
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard - 3 Floors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map(floor => {
            const data = floorData[floor];
            const isFloorDanger = data.status === "Danger";
            
            return (
              <div 
                key={floor}
                className={`rounded-2xl shadow-2xl p-6 border-2 transition-all ${
                  isFloorDanger 
                    ? 'bg-red-900/30 border-red-500 pulse-danger' 
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                {/* Floor Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${isFloorDanger ? 'bg-red-600 siren' : 'bg-blue-600'}`}>
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Tầng {floor}</h3>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${
                    isFloorDanger ? 'bg-red-600' : 'bg-green-600'
                  }`}>
                    <p className="text-white font-bold">
                      {isFloorDanger ? '🔴 NGUY HIỂM' : '🟢 AN TOÀN'}
                    </p>
                  </div>
                </div>

                {/* Sensor Data */}
                <div className="space-y-4">
                  {/* Temperature */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className={`w-5 h-5 ${isFloorDanger ? 'text-red-400' : 'text-orange-400'}`} />
                      <span className="text-white text-sm">Nhiệt độ</span>
                    </div>
                    <p className={`text-3xl font-bold ${isFloorDanger ? 'text-red-400' : 'text-orange-400'}`}>
                      {data.temperature?.toFixed(1)}°C
                    </p>
                  </div>

                  {/* Gas */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className={`w-5 h-5 ${isFloorDanger ? 'text-red-400' : 'text-purple-400'}`} />
                      <span className="text-white text-sm">Khí Gas</span>
                    </div>
                    <p className={`text-3xl font-bold ${isFloorDanger ? 'text-red-400' : 'text-purple-400'}`}>
                      {data.gas}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Ngưỡng: {data.threshold}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Status */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Trạng Thái Hệ Thống</h3>
              <p className="text-slate-400">
                Tòa nhà 3 tầng - Giám sát: <span className="text-blue-400 font-bold">Fire Detection System</span>
              </p>
            </div>
            <div className={`px-6 py-3 rounded-xl ${isDanger ? 'bg-red-600' : 'bg-green-600'}`}>
              <p className="text-white font-bold text-xl">
                {isDanger ? '🔴 ALARM ON' : '🟢 SYSTEM OK'}
              </p>
            </div>
          </div>
        </div>

        {/* Alarm Status */}
        {isDanger && (
          <div className="mt-6 bg-yellow-900/30 rounded-2xl shadow-2xl p-6 border-2 border-yellow-500">
            <div className="flex items-center justify-center gap-4">
              <div className="animate-pulse">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
              <p className="text-yellow-400 font-bold text-xl">
                {alarmMuted ? '🔇 Còi báo động đã tắt' : '🔊 Còi báo động đang hoạt động'}
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