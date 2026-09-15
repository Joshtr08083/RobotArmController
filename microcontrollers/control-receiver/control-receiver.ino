// 8C:94:DF:52:95:64

#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <WiFi.h>
#include <esp_now.h>
#include <ArduinoJson.h>

const uint8_t BASE_EN = 21;
const uint8_t BASE_STEP = 22;
const uint8_t BASE_DIR = 23;

const uint8_t SHOULDER_EN = 27;
const uint8_t SHOULDER_STEP = 26;
const uint8_t SHOULDER_DIR = 25;

const uint8_t SERVO_SDA = 19;
const uint8_t SERVO_SCL = 18;
const uint8_t OE = 33;

// 270deg and 180deg have different min/max
const int SERVO_270_MIN = 102;
const int SERVO_270_MAX = 512;
const int SERVO_180_MIN = 102;
const int SERVO_180_MAX = 512;

const uint8_t ELBOW = 0;
const uint8_t WRIST_PITCH = 4;
const uint8_t WRIST_ROLL = 8;
const uint8_t CLAW = 12;

const int SERVO180 = 180;
const int SERVO270 = 270;

// ESP NOW Wireless variables
const int DATA_SIZE = 128;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
char latestData[DATA_SIZE] = {0};
volatile bool newDataAvailable = false;
StaticJsonDocument<256> doc;

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
  char temp[DATA_SIZE] = {0};

  int n = (len < DATA_SIZE - 1) ? len : (DATA_SIZE - 1);
  memcpy(temp, incomingData, n);
  temp[n] = '\0';

  portENTER_CRITICAL_ISR(&mux);
  memcpy(latestData, temp, DATA_SIZE);
  newDataAvailable = true;
  portEXIT_CRITICAL_ISR(&mux);
}

class Motor {
  protected:
    int target, stepsPerInterval, stepInterval;
    unsigned long lastStep, moveStart;
    int startDelay; 
    bool moving;
    const char* id;
    const char* type;

  public: 
    Motor(const char* id, const char* type)
    : id(id), type(type), moving(false), target(0), stepInterval(0),
    stepsPerInterval(0), startDelay(0) 
    {}

    const char* getId() { return id; }
    const char* getType() { return type; }

    void setTarget(int newTarget, int interval, int delay, int steps) {
      target = newTarget;
      stepInterval = interval;
      stepsPerInterval = steps;
      moving = true;
      moveStart = millis();
      startDelay = delay;
      lastStep = millis() - interval;
    }

    virtual void update() = 0;
    virtual void disable() = 0;
    virtual void enable() = 0;

    bool isMoving() {
      return moving;
    }

    bool stepReady() {
      if (!moving) return false;
      if (millis() - moveStart < (unsigned long)startDelay) return false;
      if (millis() - lastStep < (unsigned long)stepInterval) return false;

      return true;
    }
};

class Stepper: public Motor {
  private:
    uint8_t enPin, dirPin, stepPin;
    int pos = 0;

  public: 
    Stepper(uint8_t enPin, uint8_t dirPin, uint8_t stepPin, const char* id) 
    : Motor(id, "stepper"), enPin(enPin), dirPin(dirPin), stepPin(stepPin)
    {}

    void init() {
      pinMode(enPin, OUTPUT);
      pinMode(dirPin, OUTPUT);
      pinMode(stepPin, OUTPUT);
      digitalWrite(enPin, HIGH);
    }

    void enable() override {
      digitalWrite(enPin, LOW);
    }
    void disable() override {
      digitalWrite(enPin, HIGH);
    }

    void step(int direction, int steps) {
      pos += steps * ((2 * direction) - 1); // direction: 1 = 1, 0 = -1
      digitalWrite(dirPin, direction); 
      for (int i = 0; i < steps; i++) {
        digitalWrite(stepPin, HIGH);
        delayMicroseconds(500);
        digitalWrite(stepPin, LOW);
        delayMicroseconds(500);
      }
    }

    int getPos() {
      return pos;
    }

    void update() override {
      if (!stepReady()) return;
      lastStep = millis();
      int distance = target - pos;
      if (distance == 0) {
        moving = false;
        return;
      }
      int steps = min(stepsPerInterval, abs(distance));
      step(distance > 0, steps);
    }
};

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();
class Servo: public Motor {
  private:
    uint8_t channel;
    int servoMin = 0;
    int servoMax = 0;
    int maxAngle = 0;
    int currentAngle = 0;
    int startingAngle;
  
  public:
    Servo(uint8_t pwm_channel, int range, int angle, const char* id)
    : Motor(id, "servo"), channel(pwm_channel), maxAngle(range), startingAngle(angle)
  {
      if (range == SERVO180) {
        servoMin = SERVO_180_MIN;
        servoMax = SERVO_180_MAX;
      }
      else if (range == SERVO270) {
        servoMin = SERVO_270_MIN;
        servoMax = SERVO_270_MAX;
      }
    }

    void init() {
      setAngle(startingAngle);
    }

    int getAngle() {
      return currentAngle;
    }

    void setAngle(int angle) {
      int pulse = map(angle, 0, maxAngle, servoMin, servoMax);
      pwm.setPWM(channel, 0, pulse);
      currentAngle = angle;
    }

    void update() override {
      if (!stepReady()) return;
      lastStep = millis();
      int diff = target - currentAngle;
      int delta = constrain(diff, -stepsPerInterval, stepsPerInterval);
      setAngle(currentAngle + delta);
      if (currentAngle == target) {
        moving = false;
      }
    }

    int getStartingAngle() {
      return startingAngle;
    }


    // note disable and enable apply to ALL servos
    void disable() override {
      digitalWrite(OE, HIGH);
    }
    void enable() override {
      digitalWrite(OE, LOW);
    }
};

Stepper base(BASE_EN, BASE_DIR, BASE_STEP, "base"); // positive is counter-clockwise (-800, 800)
Stepper shoulder(SHOULDER_EN, SHOULDER_DIR, SHOULDER_STEP, "shoulder"); // negative is up (0, -13000) -13000 is about vertical

Servo elbow(ELBOW, SERVO270, 125, "elbow"); // postiive is counter-clockwise
Servo wristPitch(WRIST_PITCH, SERVO180, 100, "wristPitch"); // positive is clockwise
Servo wristRoll(WRIST_ROLL, SERVO180, 90, "wristRoll"); // positive is counter-clockwise
Servo claw(CLAW, SERVO180, 90, "claw"); // positive close

Motor* motors[] = { &base, &shoulder, &elbow, &wristPitch, &wristRoll, &claw };
const int NUM_MOTORS = sizeof(motors) / sizeof(motors[0]);


void parseCommand(const char* json) {
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    Serial.print("JSON parse failed: ");
    Serial.println(err.c_str());
    return;
  }

  serializeJson(doc, Serial); // ADD THIS
  Serial.println();
  
  // parse values
  int pos = 0;
  bool disable = doc.containsKey("disable");
  bool enable = doc.containsKey("enable");
  int interval = doc["int"] | 5;
  int delay = doc["del"] | 0;
  int steps = doc["stp"] | 1;

  if (doc.containsKey("pos")) {
    pos = doc["pos"];
  } else if (!disable && !enable) {
    Serial.println("Error: No position provided");
    return;
  }
  
  const char* targetId = doc["tgt"];
  if (targetId == nullptr) {
    Serial.println("Error: Missing target key");
    return;
  }

  // get motor
  Motor* target = nullptr;
  for (int i = 0; i < NUM_MOTORS; i++) {
    if (strcmp(targetId, motors[i]->getId()) == 0) {
      target = motors[i];
      break;
    }
  }

  if (target == nullptr) {
    Serial.print("Unknown target: ");
    Serial.println(targetId);
    return;
  }

  // disable/enable
  if (disable) {
    target->disable();
    Serial.print("Successfully disabled ");
    Serial.println(target->getId());
    return;
  }
  if (enable) {
    target->enable();
    Serial.print("Successfully enabled ");
    Serial.println(target->getId());
    return;
  }

  // set target
  target->setTarget(pos, interval, delay, steps);
  Serial.print("Successfully set target for ");
  Serial.print(target->getId());
  Serial.print(" to ");
  Serial.println(pos);
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println();

  base.init();
  shoulder.init();

  // servo pca9685 setup
  pinMode(OE, OUTPUT);
  Wire.begin(SERVO_SDA, SERVO_SCL);
  pwm.begin();
  pwm.setOscillatorFrequency(27000000);
  pwm.setPWMFreq(50);

  elbow.init();
  wristPitch.init();
  wristRoll.init();
  claw.init();

  // enable all
  base.enable();
  shoulder.enable();
  digitalWrite(OE, LOW);

  Serial.println("Motor setup complete");

  // wifi setup
  WiFi.mode(WIFI_STA);
  Serial.print("Receiver MAC: ");
  Serial.println(WiFi.macAddress());
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }
  esp_now_register_recv_cb(OnDataRecv);
  Serial.println("Wifi setup complete");
  delay(1000);

}

void loop() {
  base.update();
  shoulder.update();
  elbow.update();
  wristPitch.update();
  wristRoll.update();
  claw.update();

  if (newDataAvailable) {
    char localCopy[DATA_SIZE];
    portENTER_CRITICAL(&mux);
    memcpy(localCopy, latestData, DATA_SIZE);
    newDataAvailable = false;
    portEXIT_CRITICAL(&mux);

    parseCommand(localCopy);
  }
}
