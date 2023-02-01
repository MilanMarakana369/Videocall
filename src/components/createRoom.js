import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import uuid from "react-native-uuid"

const CreateRoom = ({ navigation }) => {
    // function create() {
    //     const id = uuid.v4();
    //     navigation.navigate('room', {
    //         id: id
    //     });
    // }

    const [userName, setUserName] = useState('');
    const [roomId, setRoomId] = useState('');

    return (
        <View style={styles.container}>
            <View style={styles.info}>
                <TextInput
                    style={styles.textInput}
                    placeholderTextColor="#767476"
                    placeholder="Enter your name"
                    value={userName}
                    onChangeText={text => setUserName(text)}

                />
            </View>
            <View style={styles.info}>
                <TextInput
                    style={styles.textInput}
                    placeholderTextColor="#767476"
                    placeholder="Enter room id"
                    value={roomId}
                    onChangeText={text => setRoomId(text)}
                />
            </View>
            <TouchableOpacity
                onPress={() => navigation.navigate('room', {
                    roomId: roomId,
                    userName: userName
                })}
                style={styles.startMeeting}
            >
                <Text style={{ color: "white" }} >
                    Start
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#1c1c1c",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 15
    },
    info: {
        width: "100%",
        backgroundColor: "#373538",
        height: 50,
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#484648",
        marginBottom: 10
    },
    textInput: {
        color: "white",
        fontSize: 18,
    },
    startMeeting: {
        width: 320,
        height: 50,
        borderRadius: 15,
        marginTop: 20,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0470dc",
    }
})

export default CreateRoom;