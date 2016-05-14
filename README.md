# Sensor Wall

The sensor wall has a collection of sensors gathering room data - vibration, sound , light, and motion. It also has an LCD display to show the readings from each sensor. And it's all packaged together in a nicely finished mount that can be hung on the wall. The sensor data is sent to Azure - messages go to Azure IoT Hub from which an Azure Stream Analytics job can process the data and put it into Azure Storage. Hardware wise, I selected the Grove IoT Developer Kit - Microsoft Azure Edition by SeeedStudio. It comes with an Intel Edison, an Arduino expansion board, the Grove Shield, and a bunch of Grove sensors. I also bought a few additional sensors to play around with including the Grove PIR Motion Sensor and some longer cables. On the software side of things, I chose to go with Node.js. I've always want to learn Javascript and the Edison supports Node out-of-the-box.

Project details can be found on Hackster.io: https://www.hackster.io/peejster/sensor-wall-27cb01
