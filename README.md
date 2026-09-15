# Robot Arm Controller

Relatively quick robot arm controller I threw together to control a robot arm I built.

### Microcontrollers
One ESP32 is connected to the comptuer runing NodeJS backend. That ESP32 wirelessly relays commands from the dashboard to the robot arm's ESP32 over ESP-NOW. 

### Backend
The backend is a simple NodeJS setup that manages Websockets with the dashboard, SQLite for persistent positions, Serial to communicate with the ESP32, and serves the dashboard.

### Dashboard
The dashboard runs Vite/ReactJS and is compiled and served by the backend. Either way, the setup makes it possible to control the arm conveniently from another device like a phone.