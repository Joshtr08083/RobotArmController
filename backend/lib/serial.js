import { SerialPort } from 'serialport';
process.loadEnvFile(); 

export const port = new SerialPort({
  path: process.env.SERIAL_PORT,          
  baudRate: 115200,        
  autoOpen: false,       
});

port.open((err) => {
  if (err) return console.error('Failed to open:', err.message);
  console.log(`${process.env.SERIAL_PORT} ready`);
  
});

export function serialPrint(message) {

  if (!port.isOpen) {
    console.error('sendData failed: Port closed');
    return;
  }

  const payload = `${message}\n`;
  port.write(payload, (err) => {
    if (err) console.error('sendData failed:', err.message);
    port.drain((err) => {
      if (err) console.error('drain failed:', err.message);
    });
  });

  console.log(`  - Sent to Serial: ${message}`);
}