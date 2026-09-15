import db from "./lib/db.js"
import express from "express"
import { WebSocketServer } from 'ws';
import cors from "cors";

import { serialPrint } from "./lib/serial.js";
process.loadEnvFile(); 

const PORT = process.env.PORT;

const MOTORS = {
    "base": {
        "interval": 5,
        "steps": 1
    },
    "shoulder": {
        "interval": 1,
        "steps": 1
    },
    "elbow": {
        "interval": 5,
        "steps": 1
    },
    "wristPitch": {
        "interval": 5,
        "steps": 1
    },
    "wristRoll": {
        "interval": 5,
        "steps": 1
    },
    "claw": {
        "interval": 5,
        "steps": 1
    }
}
const VALID_IDS = Object.keys(MOTORS);

const updateDBValue = db.prepare(`
    INSERT INTO cache (id, value) 
    VALUES (?, ?) 
    ON CONFLICT(id) DO UPDATE SET 
        value = excluded.value;
`);

const updateDBEnabled = db.prepare(`
    INSERT INTO cache (id, enabled) 
    VALUES (?, ?) 
    ON CONFLICT(id) DO UPDATE SET 
        enabled = excluded.enabled;
`);

const getAllCache = db.prepare(`SELECT id, value, enabled FROM cache`);

const app = express();
app.use(cors());

app.get("/state", (req, res) => {
    const rows = getAllCache.all();

    const result = {};
    for (const id of VALID_IDS) {
        result[id] = { value: undefined, enabled: 0 };
    }

    for (const row of rows) {
        result[row.id] = {
            value: row.value ?? undefined,
            enabled: row.enabled ?? 0
        };
    }

    res.json(result);
});

const server = app.listen(PORT, () => {
    console.log(`Websocket running at: ws://10.0.0.1:${PORT}${process.env.WS_PATH}`);
    console.log(`HTTP state endpoint at: http://10.0.0.1:${PORT}/state`);
})

const wss = new WebSocketServer({ 
  server,
  path: process.env.WS_PATH 
});

const queue = [];
let processing = false;

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    queue.push(data);
    console.log(`Received: ${data}`)
    wss.clients.forEach((client) =>{
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data.toString('utf-8'));
        }
    });
    console.log("  - Broadcasted message");
    processQueue();
    
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const msg = queue.shift();
    try {
      await handleMessage(msg);

    } catch (err) {
      console.error('failed to process message', err);
    }
  }
  processing = false;
}

async function handleMessage(msg) {
    const jsonData = JSON.parse(msg);
    
    Object.keys(jsonData).map(
        (key) => {
            if (!VALID_IDS.includes(key)) { // set target position {"key": value}
                console.log(`  - Invalid key \"${key}\"`);
                return;
            }
            const value = jsonData[key];
            if (typeof value === "number") {
                updateDBValue.run(key, value);
                console.log(`  - Logged ${key} in database`);

                const motor = MOTORS[key];
                const jsonPayload = {
                    "tgt": key,
                    "pos": value,
                    "int": motor["interval"],
                    "stp": motor["steps"]
                }
                const payload = JSON.stringify(jsonPayload)
                serialPrint(payload);

            } else if (typeof value === "string") { // enable/disable {"key": "enable"}
                if (!["enable", "disable"].includes(value)) {
                    console.log(`  - Invalid value string \"${value}\"`);
                    return;
                }
                
                updateDBEnabled.run(key, (value === "enable"));
                console.log(`  - Logged ${value} ${key} in database`)

                const jsonPayload = {"id": key, [value]: true}
                const payload = JSON.stringify(jsonPayload)
                serialPrint(payload);

            } else {
                console.log(`  - Invalid type of value \"${value}\"`);
                return;
            }
            
        }
    )
}