// define the GPIO pins each sensor is connected to
const SOUND_PIN = 0;                                  // sound sensor connected to analog pin 0
const LIGHT_PIN = 2;                                  // light sensor connected to analog pin 2
const VIBRATION_PIN = 3;                              // vibration sensor connected to analog pin 3
const BUTTON_PIN = 0;                                 // button connected to digital pin 0
const ENCODER_A_PIN = 2;                              // encoder input A is connected to digital pin 2
const ENCODER_B_PIN = 3;                              // encoder input B is connected to digital pin 3
const BUZZER_PIN = 4;                                 // buzzer connected to digital pin 4
const PIR_PIN = 7;                                    // PIR sensor connected to digital pin 7
const DISPLAY_ITEMS = 4;                              // diplay items equal number of sensors

var mraa = require('mraa');                           // require mraa
var version = mraa.getVersion();                      // get mraa version

// define the LCD display
var jsUpmI2cLcd = require('jsupm_i2clcd');
var lcd = new jsUpmI2cLcd.Jhd1313m1(6, 0x3E, 0x62);
var backLightOn = false;                              // LCD backlight status
var backLightRGB = [ 0, 0, 255]                       // define the backlight color
lcd.setColor(0, 0, 0);                                // turn off the backlight
lcd.clear();                                          // clear the LCD

// define the rotary encoder
var rotaryEncoder = require("jsupm_rotaryencoder");
var encoder = new rotaryEncoder.RotaryEncoder(ENCODER_A_PIN, ENCODER_B_PIN);
var encoderInterrupt = new mraa.Gpio(ENCODER_A_PIN);  // assign GPIO pin to one of the rotary encoder pins for the interrupt
encoderInterrupt.isr(mraa.EDGE_RISING, encoderISR);   // set encoder interrupt
var position = 0;                                     // position of the rotary encoder

var timerRef;                                         // reference for the interval timer
var counter = 0;                                      // counter for when to send data to Azure

// define the Azure connectivity using the Azure IoT devices SDK
var Protocol = require('azure-iot-device-http').Http; // define the transport protocol for the cloud connectivity
var Client = require('azure-iot-device').Client;      // define the client
var Message = require('azure-iot-device').Message;    // define the message

// Connection string for your Azure IoT Hub instance containing Hostname, Device Id & Device Key in the following format:
// "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var connectionString = '<your Azure IoT Hub connection string here>';

// fromConnectionString must specify a transport constructor, coming from any transport package.
var client = Client.fromConnectionString(connectionString, Protocol);

/********************************************************************
 *                                                                  *
 * Map the GPIO pins to the sensors and input controls              *
 *                                                                  *
 ********************************************************************/

var soundSensor = new mraa.Aio(SOUND_PIN);            // assign analog pin to sound sensor
var soundLevel = 0;                                   // store the sound sensor reading

var lightSensor = new mraa.Aio(LIGHT_PIN);            // assign analog pin to light sensor
var lightLevel = 0;                                   // store the light sensor reading

var vibrationSensor = new mraa.Aio(VIBRATION_PIN);    // assign analog pin to vibration sensor
var vibrationLevel = 0;                               // store the vibration sensor reading

var button = new mraa.Gpio(BUTTON_PIN);               // assign GPIO pin to button
button.isr(mraa.EDGE_RISING, buttonISR);                // set button interrupt

var pirSensor = new mraa.Gpio(PIR_PIN);               // assign GPIO pin to PIR sensor
pirSensor.dir(mraa.DIR_IN);                           // set the gpio direction to input
var motionDetected = false;                               // store the motion sensor reading

var buzzer = new mraa.Gpio(BUZZER_PIN);               // assign GPIO pin to buzzer
buzzer.dir(mraa.DIR_OUT);                             // set the gpio direction to output

/********************************************************************/
console.log('Sensor Wall');

if (version >= 'v0.6.1') {                            // mraa needs to be at least version 0.6.1
    console.log('mraa version (' + version + ') ok');
}
else {
    console.log('meaa version(' + version + ') is old - this code may not work');
}

periodicActivity();                                   // call the periodicActivity function

function periodicActivity()
{
    soundLevel = readSoundSensor();                   // get reading from sound sensor
    lightLevel = readLightSensor();                   // get reading from light sensor
    vibrationLevel = readVibrationSensor();           // get reading from vibration sensor
    if (readMotionSensor() == 1)                      // get reading from motion sensor
        motionDetected = true;
    else
        motionDetected = false;
    
    displayValues();                                  // display the sensor data just collected
    
    counter += 1;                                     // track each sensor sampling
    
    if (counter == 15)                                // after 15 sampling passes
    {
        sendToCloud();                                // send data to the cloud
        counter = 0;                                  // then reset the sampling counter
    }
    
    clearInterval(timerRef);                          // clear the timer reference; without this, intervals got shorter and shorter as the program ran
    timerRef = setInterval(periodicActivity,2000);    // repeat the function at the specified frequency
}

/********************************************************************
 *                                                                  *
 * Define interrupt service routines for the button and encoder     *
 *                                                                  *
 ********************************************************************/

function buttonISR()
{  
    backLightOn = !backLightOn;                       // toggle the backlight
    
    if (backLightOn)
        lcd.setColor(backLightRGB[0], backLightRGB[1], backLightRGB[2]);  // turn on the backlight
    else
        lcd.setColor(0, 0, 0);                        // turn off the backlight
    
}

function encoderISR()
{
    position = encoder.position();                    // get the encoder's position

    if (position < 0)                                 // the encoder can be turned indefinitely in each direction
        position = (DISPLAY_ITEMS - 1);               // when turned past position 0, set to the highest position
    else if (position >= DISPLAY_ITEMS)               // when turned past the highest position, set to position 0
        position = 0;

    displayValues();                                  // update the display with the newly selected position
}

/********************************************************************
 *                                                                  *
 * Read data from sensors                                           *
 *                                                                  *
 ********************************************************************/

// get light sensor reading
function readLightSensor()
{
    // the light sensor returns an analog value
    // which is proportionate to the amount of light 
    // http://www.seeedstudio.com/wiki/Grove_-_Light_Sensor
    
    return lightSensor.read();
}

// get motion sensor reading
function readMotionSensor()
{
    // the PIR sensor returns 1 (HIGH) if motion is detected
    // otherwise it returns 0 (LOW)
    // http://www.seeedstudio.com/wiki/Grove-_Piezo_Vibration_Sensor
    
    return pirSensor.read();
}

// get sound sensor reading
function readSoundSensor()
{
    // the sound sensor returns an analog value (0-1023)
    // which is proportionate to the sound level
    // http://www.seeedstudio.com/wiki/Grove_-_Loudness_Sensor

    return soundSensor.read();
}

// get vibration sensor reading
function readVibrationSensor()
{
    // the vibration sensor returns an analog value
    // which is proportionate to the amount of vibration 
    // http://www.seeedstudio.com/wiki/Grove_-_Light_Sensor
    
    return vibrationSensor.read();
}

/********************************************************************
 *                                                                  *
 * Display sensor data on LCD                                       *
 *                                                                  *
 ********************************************************************/

function displayValues()
{
    lcd.clear();
    lcd.setCursor(0, 0);
    
    switch (position)
    {
         case 0:
             lcd.write('Light level:');
             lcd.setCursor(1,0);
             lcd.write(lightLevel.toString());
             break;
        case 1:
             lcd.write('Motion level:');
             lcd.setCursor(1,0);
             lcd.write(motionDetected.toString());
             break;
        case 2:
             lcd.write('Sound level:');
             lcd.setCursor(1,0);
             lcd.write(soundLevel.toString());
             break;
        case 3:
             lcd.write('Virbation level:');
             lcd.setCursor(1,0);
             lcd.write(vibrationLevel.toString());
             break;   
    }
}

/********************************************************************
 *                                                                  *
 * Send sensor data to Azure                                        *
 *                                                                  *
 ********************************************************************/

function sendToCloud()
{
    // create the JSON message with the sensor data
    var data = JSON.stringify({ deviceId: 'office', sound: soundLevel, light: lightLevel, vibration: vibrationLevel, motion: motionDetected });
    var message = new Message(data);
    //message.properties.add('myproperty', 'myvalue');
    
    // send the message to Azure IoT Hub
    console.log('Sending message: ' + message.getData());
    client.sendEvent(message, function(err, res){
        if (err) console.log('SendEvent error: ' + err.toString());
        if (res) console.log('SendEvent status: ' + res.constructor.name);
    });
}
