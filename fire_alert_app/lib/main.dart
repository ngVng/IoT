import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:vibration/vibration.dart';
import 'dart:convert';
import 'dart:async';
import 'dart:typed_data';

void main() {
  runApp(const FireAlertApp());
}

class FireAlertApp extends StatelessWidget {
  const FireAlertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cảnh Báo Cháy IoT',
      theme: ThemeData(
        primarySwatch: Colors.red,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
      ),
      home: const FireMonitorPage(),
    );
  }
}

class FireMonitorPage extends StatefulWidget {
  const FireMonitorPage({super.key});

  @override
  State<FireMonitorPage> createState() => _FireMonitorPageState();
}

class _FireMonitorPageState extends State<FireMonitorPage> {
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  WebSocketChannel? _channel;
  Map<String, dynamic> floorData = {};
  List<dynamic> dangerFloors = [];
  bool isConnected = false;
  Timer? _reconnectTimer;
  Set<int> _notifiedFloors = {}; // Track which floors we've already notified

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
    _connectWebSocket();
  }

  Future<void> _initializeNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);

    await flutterLocalNotificationsPlugin.initialize(initializationSettings);

    // Request notification permission for Android 13+
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.requestNotificationsPermission();
  }

  void _connectWebSocket() {
    try {
      // Use 10.0.2.2 for Android Emulator (host machine)
      _channel = WebSocketChannel.connect(
        Uri.parse('ws://10.0.2.2:8000/ws/sensors'),
      );

      setState(() {
        isConnected = true;
      });

      _channel!.stream.listen(
        (data) {
          final jsonData = json.decode(data);
          setState(() {
            floorData = jsonData['floors'] ?? {};
            dangerFloors = jsonData['dangerFloors'] ?? [];
          });

          // Send notification if there are danger floors
          if (dangerFloors.isNotEmpty) {
            _sendFireAlert(dangerFloors);
          } else {
            // Reset notification tracker when all safe
            _notifiedFloors.clear();
          }
        },
        onError: (error) {
          print('WebSocket Error: $error');
          setState(() {
            isConnected = false;
          });
          _scheduleReconnect();
        },
        onDone: () {
          print('WebSocket connection closed');
          setState(() {
            isConnected = false;
          });
          _scheduleReconnect();
        },
      );
    } catch (e) {
      print('Connection failed: $e');
      setState(() {
        isConnected = false;
      });
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 2), () {
      print('Attempting to reconnect...');
      _connectWebSocket();
    });
  }

  Future<void> _sendFireAlert(List<dynamic> floors) async {
    // Only notify for new danger floors
    final newDangerFloors = floors
        .where((f) => !_notifiedFloors.contains(f))
        .toList();

    if (newDangerFloors.isEmpty) return;

    // Add to notified set
    _notifiedFloors.addAll(newDangerFloors.cast<int>());

    final floorText = newDangerFloors.join(', ');

    // Vibrate
    if (await Vibration.hasVibrator() == true) {
      Vibration.vibrate(pattern: [500, 200, 500, 200, 500]);
    }

    // Show notification
    final AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
          'fire_alert_channel',
          'Fire Alerts',
          channelDescription: 'Notifications for fire detection alerts',
          importance: Importance.max,
          priority: Priority.high,
          playSound: true,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500]),
          fullScreenIntent: true,
          category: AndroidNotificationCategory.alarm,
        );

    final NotificationDetails notificationDetails = NotificationDetails(
      android: androidDetails,
    );

    await flutterLocalNotificationsPlugin.show(
      0,
      '🚨 CẢNH BÁO CHÁY!',
      'Phát hiện cháy tại tầng $floorText!\nYêu cầu sơ tán ngay!',
      notificationDetails,
    );
  }

  @override
  void dispose() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isDanger = dangerFloors.isNotEmpty;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [const Color(0xFF1E293B), const Color(0xFF0F172A)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Container(
                margin: const EdgeInsets.all(20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('🔥 ', style: TextStyle(fontSize: 24)),
                        Text(
                          'Cảnh Báo Cháy IoT',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 15),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isDanger ? Colors.red : Colors.green,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isDanger ? '🔴 ALARM ON' : '🟢 SYSTEM OK',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isConnected ? Icons.wifi : Icons.wifi_off,
                          color: isConnected ? Colors.green : Colors.red,
                          size: 16,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          isConnected ? 'Đã kết nối' : 'Mất kết nối',
                          style: TextStyle(
                            color: isConnected ? Colors.green : Colors.red,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Danger Alert (if any)
              if (isDanger)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(15),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.red.withValues(alpha: 0.5),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      const Text(
                        '⚠️ CẢNH BÁO CHÁY!',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Phát hiện cháy tại tầng: ${dangerFloors.join(", ")}',
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'Yêu cầu sơ tán ngay lập tức!',
                        style: TextStyle(fontSize: 14, color: Colors.white70),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 20),

              // Floor List
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: floorData.entries.map((entry) {
                    final floor = entry.key;
                    final data = entry.value;
                    final isDangerFloor = data['status'] == 'Danger';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 15),
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: isDangerFloor
                            ? Colors.red.withValues(alpha: 0.3)
                            : Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(
                          color: isDangerFloor
                              ? Colors.red
                              : Colors.white.withValues(alpha: 0.2),
                          width: 2,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '🏢 Tầng $floor',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: isDangerFloor
                                      ? Colors.red
                                      : Colors.green,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  isDangerFloor ? '🔴 NGUY HIỂM' : '🟢 AN TOÀN',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 15),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildSensorData(
                                '${data['temperature']?.toStringAsFixed(1)}°C',
                                'Nhiệt độ',
                              ),
                              _buildSensorData('${data['gas']}', 'Khí Gas'),
                              _buildSensorData(
                                '${data['threshold']}',
                                'Ngưỡng',
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSensorData(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Color(0xFFFBBF24),
          ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
      ],
    );
  }
}
