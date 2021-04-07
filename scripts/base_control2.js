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
const nav_msgs = rosnodejs.require('nav_msgs').msg;
//const sensor_msgs = rosnodejs.require('sensor_msgs').msg;

//For serial port communiation with modbus-rtu protocol
const SerialPort = require('serialport');
const ModbusMaster = require('modbus-rtu').ModbusMaster;
const serialPort = new SerialPort("/dev/ttyUSB1", {baudRate: 19200});
const master = new ModbusMaster(serialPort);
const EFFECTIVE_GEAR_RATIO = 30 * 2; //1:30 Gearbox and 1:2 Speed Reducer Gear
//end

var left_speed = 0;
var right_speed = 0;
var left_wheel_rev = 0;
var right_wheel_rev = 0;
var if_send = true;
var stop_motor = false;
var curr_time = 0;
var last_time_ = 0;
var motor_curr_time = 0;
var last_write_time = 0;
var x_ = 0;
var y_ = 0;
var th_ = 0;
var a = 0;
var b = 0;
var last_a = 0;
var last_b = 0;
var vx_ = 0;
var vy_ = 0;
var vth_ = 0;
function base_control() {

  // Register node with ROS master
  rosnodejs.initNode('/base_control_node')
    .then((rosNode) => {
    
      	setInterval(() => { //motor control loop
         if(last_a != a || last_b!= b){
      	  motor_control(1, 0x02,  a + b, 2, 0x02, -a + b);
      	  last_a = a;
      	  last_b = b;
         }
      	}, 200); //Recommended interval 200
      

	setInterval(() => { //motor feedback loop
        update_motor_speed(); //RPM
        vx_ = (left_wheel_rev + right_wheel_rev)*(0.6908/2); // meter/min, 0.314=0.628/2
        vy_ = 0;
        vth_ = (right_wheel_rev - left_wheel_rev)*(0.6908/0.42); //rad/min, 
        curr_time = new Date().getTime();
        //let dt = (curr_time - last_time_)/1000; //divide by 1000 to convert millsec to sec
        let dt = (curr_time - last_time_)/60000; //divide by 60000 to convert millsec to min
        if (last_time_ > 0){

        
        let delta_th = vth_ * dt;
        let delta_x = (vx_ * Math.cos(th_) - vy_ * Math.sin(th_)) * dt;
        let delta_y = (vx_ * Math.sin(th_) + vy_ * Math.cos(th_)) * dt;
        x_ += delta_x; 
        y_ += delta_y;
        th_ += delta_th;

        }

        last_time_ = curr_time;

      	}, 200); //Recommended interval 200
      
      




      let sub2 = rosNode.subscribe('cmd_eStop', std_msgs.Bool,
        (data) => { // define callback execution
          rosnodejs.log.info('eStop status: [' + data.data + ']');
          if(data.data == true){
              rosnodejs.log.info("Detect eStop.. stopping motor now");  
              stop_motor = true;
	      data_write(1, 0x02, 0);
              data_write(2, 0x02, 0);
          } else {
              rosnodejs.log.info("no eStop");  
              stop_motor = false;
          }
        }); //end of sub2

      // Create ROS subscriber on the 'chatter' topic expecting String messages
      //let sub = rosNode.subscribe('/chatter', std_msgs.String,
      //let sub = rosNode.subscribe('/turtle1/cmd_vel', geometry_msgs.Twist,
      let sub = rosNode.subscribe('cmd_vel', geometry_msgs.Twist,
      //let sub = rosNode.subscribe('/joy', sensor_msgs.Joy,
        (data) => { // define callback execution
          rosnodejs.log.info('I heard: [' + data.data + ']');
          rosnodejs.log.info('I got linear  velocity: [' + data.linear.x + ']');
          rosnodejs.log.info('I got angular velocity: [' + data.angular.z + ']');
          //let a = 500 * data.linear.x;
          a = 500 * data.linear.x;
          b = 500 * data.angular.z;
          rosnodejs.log.info("Linear moving forward at: " +a);
          rosnodejs.log.info("Angular moving at:" +b);
          //rosnodejs.log.info(stop_motor);
          //
          //setInterval(() => {
	  //if (if_send){
          if(stop_motor){
	    data_write(1, 0x02, 0);
            data_write(2, 0x02, 0);
          }
          else{
          //motor_control(1, 0x02,  a + b, 2, 0x02, -a + b);
          }
        }
      );

      
      // Create ROS publisher on the 'chatter' topic with geometry message
      let pub2 = rosNode.advertise('/odom', nav_msgs.Odometry);
      const msg2 = new nav_msgs.Odometry;

      // Define a function to execute every 2000ms
      setInterval(() => {
        
        msg2.header.stamp = new Date().getTime();
        msg2.header.frame_id = "odom"
        msg2.pose.pose.position.x = x_;
        msg2.pose.pose.position.y = y_;
        msg2.pose.pose.position.z = 0.0;
        //msg2.pose.pose.orientation = odom_quat;
        //msg2.pose.covariance = odom_pose_covariance;


        msg2.child_frame_id = "base_footprint";
        msg2.twist.twist.linear.y = vy_;
        msg2.twist.twist.linear.x = vx_;
        msg2.twist.twist.angular.z = vth_;
        //msg2.twist.covariance = odom_twist_covariance;

        pub2.publish(msg2);
       /* rosnodejs.log.info('Left motor rev: [' + left_speed + ']');
        rosnodejs.log.info('Right motor rev: [' + right_speed + ']');
        rosnodejs.log.info('Left wheel rev: [' + left_wheel_rev + ']');
        rosnodejs.log.info('Right wheel rev: [' + right_wheel_rev + ']');
        rosnodejs.log.info('Linear X: [' + msg2.twist.twist.linear.x + ']');
        rosnodejs.log.info('Omega: [' + msg2.twist.twist.angular.z + ']');*/
        //rosnodejs.log.info('dt: [' + dt + ']');
        
      }, 50);
      

    });
}



//Serial port------------------------------------------------------------
function data_write(dev_num, address, value) {
    master.writeSingleRegister(dev_num,address,value);
    last_write_time = motor_curr_time;
  //return 
}

function motor_control(dev_num, address, value, dev_num2, address2, value2) {
  motor_curr_time = new Date().getTime();
  if( (motor_curr_time - last_write_time) > 50){
    //rosnodejs.log.info('Running motor!' +(motor_curr_time - last_write_time) + 'Writing to m1:' +value+ '  Writing to m2:'+value2);
    master.writeSingleRegister(dev_num,address,value);
    master.writeSingleRegister(dev_num2,address2,value2);
    last_write_time = motor_curr_time;
  } 
  //return 
}

function data_read(dev_num, address, num_len) {

  var spd = master.readHoldingRegisters(dev_num, address, num_len).then((data) => {
    //console.log(data);
    if (dev_num == 1){
	left_speed = data;
	}else{
	right_speed = data;
     }
  });
}

function update_motor_speed(dev_num, address, num_len) {
  master.readHoldingRegisters(1, 0x10, 1).then((data) => {
    left_speed = data;
  });

   master.readHoldingRegisters(2, 0x10, 1).then((data) => {
    right_speed = data;
  });
  left_wheel_rev = ( (left_speed/10) / EFFECTIVE_GEAR_RATIO ); //  rev/min 
  right_wheel_rev = ( (right_speed/10) / EFFECTIVE_GEAR_RATIO ) * (0-1) ; //  rev/min  note: right wheel forward movement spin the motor clockwise(-ve)
}
//end--------------------------------------------------------------------

function speed_monitor(){
         data_read(1, 0x10, 1);
	 data_read(2, 0x10, 1);
	 console.log("left & right:", left_speed, right_speed);
         /*if (left_speed != 0 || right_speed !=0){
	    if_send = false;
            data_write(1, 0x02,  0);
            data_write(2, 0x02, 0);
	}else{
	    if_send = true;
	}*/
}

if (require.main === module) {
  // Invoke Main Listener Function
  rosnodejs.log.info('Initializing..');
  base_control();

  /*
  setInterval(() => {
      speed_monitor();
  }, 1000);
*/
}








