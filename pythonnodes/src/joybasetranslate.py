#!/usr/bin/env python
import rospy
from geometry_msgs.msg import Twist
from sensor_msgs.msg import Joy
from std_msgs.msg import Bool

# Author: Andrew Dai
# This ROS Node converts Joystick inputs from the joy node
# into commands for turtlesim

# Receives joystick messages (subscribed to Joy topic)
# then converts the joysick inputs into Twist commands
# axis 1 aka left stick vertical controls linear speed
# axis 0 aka left stick horizonal controls angular speed
def callback(data):
    twist = Twist()
    # vertical left stick axis = linear rate
    #if data.axes[2] == 0:
    twist.linear.x = 1*data.axes[3]
    # horizontal left stick axis = turn rate
    #if data.axes[3] == 0:
    twist.angular.z = 1*data.axes[2]
    pub.publish(twist)
    rospy.loginfo("publishing out linear X %s"%twist.linear.x)
    rospy.loginfo("publishing out angular Z %s"%twist.angular.z)
    pub2.publish(data.buttons[1])
    if data.buttons[2] == 1:
        rospy.loginfo("eStop detected!!")


# Intializes everything
def start():
    # publishing to "cmd_vel" to provide input for controller
    global pub
    pub = rospy.Publisher('cmd_vel', Twist)
    global pub2
    pub2 = rospy.Publisher('cmd_eStop', Bool)
    # subscribed to joystick inputs on topic "joy"
    rospy.Subscriber("joy", Joy, callback)
    # starts the node
    rospy.init_node('joybasetranslate')
    rospy.spin()

if __name__ == '__main__':
    start()

