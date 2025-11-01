# IoT
venv\Scripts\active
deactivate : thoát khỏi môi trường ảo (venv)

# Trường hợp terminal cấm quyền
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
venv\Scripts\activate

# Pull dự án về và tạo lại venv
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt

# Khi cài đặt liên quan đến lib hãy lưu thay đổi
pip freeze > requirements.txt

# Install
    python -m venv venv
    venv\Scripts\activate
    pip install fastapi uvicorn paho-mqtt

# Chạy dự án
- BE
    uvicorn mqtt_be:app --reload
- FE
    npm run dev

# wokwi mô phỏng thiết bị cảm biến
    https://wokwi.com/projects/444443677875518465
    


