#!/usr/bin/env node

/************************************************************************
 Copyright (c) 2017, Rethink Robotics
 Copyright (c) 2017, Ian McMahon

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
************************************************************************/

'use strict';
/**
 * This example demonstrates simple receiving of messages over the ROS system.
 */

// Require rosnodejs itself
const rosnodejs = require('rosnodejs');
// Requires the std_msgs message package
const std_msgs = rosnodejs.require('std_msgs').msg;
const geometry_msgs = rosnodejs.require('geometry_msgs').msg;

//For serial port communiation with modbus-rtu protocol
const SerialPort = require('serialport');
const ModbusMaster = require('modbus-rtu').ModbusMaster;
const serialPort = new SerialPort("/dev/ttyUSB0", {baudRate: 19200});
const master = new ModbusMaster(serialPort);
//end

function base_control() {
  // Register node with ROS master
  rosnodejs.initNode('/base_control_node')
    .then((rosNode) => {

      // Create ROS subscriber on the 'chatter' topic expecting String messages
      //let sub = rosNode.subscribe('/chatter', std_msgs.String,
      //let sub = rosNode.subscribe('/turtle1/cmd_vel', geometry_msgs.Twist,
        let sub = rosNode.subscribe('/cmd_vel', geometry_msgs.Twist,
        (data) => { // define callback execution
          //rosnodejs.log.info('I heard: [' + data.data + ']');
          rosnodejs.log.info('I got linear  velocity: [' + data.linear.x + ']');
          rosnodejs.log.info('I got angular velocity: [' + data.angular.z + ']');
          let a = 500 * data.linear.x;
          let b = 250 * data.angular.z;
          //rosnodejs.log.info('['+ a + ']');
          rosnodejs.log.info(a);
          //
          //setInterval(() => {
          data_write(1, 0x02,  a + b);
          data_write(2, 0x02, -a + b);
          //}, 1000);
          //
        }
      );

      /*
      // Create ROS publisher on the 'chatter' topic with String message
      let pub = rosNode.advertise('/chatter', std_msgs.String);
      let count = 0;
      const msg = new std_msgs.String();
      // Define a function to execute every 100ms
      setInterval(() => {
        // Construct the message
        msg.data = 'hello world ' + count;
        // Publish over ROS
        pub.publish(msg);
        // Log through stdout and /rosout
        rosnodejs.log.info('I said: [' + msg.data + ']');
        ++count;
      }, 2000);
      */

    });
}

//Serial port------------------------------------------------------------
function data_write(dev_num, address, value) {

  master.writeSingleRegister(dev_num,address,value);
  
  //return 
}

function data_read(dev_num, address, num_len) {

  master.readHoldingRegisters(dev_num, address, num_len).then((data) => {
    console.log(data);
  });
  //return
}
//end--------------------------------------------------------------------


if (require.main === module) {
  // Invoke Main Listener Function
  base_control();
}
