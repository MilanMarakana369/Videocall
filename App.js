import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from '@react-navigation/stack';
import CreateRoom from './src/components/createRoom';
import Room from './src/components/room';
import SingleRoom from './src/components/singleRoom';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';

const stack = createStackNavigator();

export default function App() {

  const initializeForegroundService = (meetingId, video, audio) => {
    if (Platform.OS === 'android') {
      if (ReactNativeForegroundService.is_task_running('meetingstart')) {
        return;
      }

      return ReactNativeForegroundService.start({
        id: 144,
        title: 'Random',
        message: 'Ongoing Call',
      });
    }
  };

  useEffect(() => {
    initializeForegroundService();
  }, []);
  // const {id} = route.params;


  return (
    <NavigationContainer>
      <stack.Navigator>
        <stack.Screen name='createRoom' component={CreateRoom} />
        <stack.Screen name='room' component={Room} />
        {/* <stack.Screen name='singleRoom' component={SingleRoom} /> */}
      </stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


