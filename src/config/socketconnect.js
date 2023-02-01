import { io } from "socket.io-client";

export const socket = io(`https://f801-2405-201-200c-de2a-2dc9-17a4-383-ee6d.ngrok.io`);

export const joinRoom = (data) => {
    console.log('data--------------------', data);
    socket.emit("join room", { userName: data.userName, roomID: data.roomID })
}

export const getUsers = () => {
    socket.on("all users", users => { })
}
export const sendingSignal = ({ userToSignal, callerID, signal }) => {
    socket.emit("sending signal", { userToSignal, callerID, signal });
}
// const events = require(“events”);
// export const socket = io.connect(API.BASE_URL);
// const eventEmitter = new events.EventEmitter();
// export const establishSocketConnection = (data: any) => {
//     try {
//         socket.emit(“socketRegister”, {
//             user_id: data.userId,
//             device_id: data.deviceId,
//         });
//     } catch (error) {
//         alert(`Something went wrong; Can’t connect to socket server` + error);
//     }
// };
// export const joinRoom = (data: any) => {
//     socket.emit(“join_conversation”, {
//         user_id: data.user_id,
//         conversation_id: data.conversation_id,
//     });
// };
// export const sendMessage = (data: any) => {
//   socket.emit(“sendMessage”, {
//     chatId: data.chatId,
//     messageBy: data.messageBy,
//     messageTo: data.messageTo,
//     messageType: data.messageType,
//     message: data.message,
//     chatType: data.chatType,
//   });
// };
// export const getChatList = (userId) => {
//   socket.on(“chat-list-response”, (data) => {
//     eventEmitter.emit(“chat-list-response”, data);
//   });
// };
// export const sendMessageChannel = (data) => {
//   socket.emit(“send_message_to_channel”, data);
// };
// export const logout = (userId) => {
//   socket.emit(“logout”, userId);
//   socket.on(“logout-response”, (data) => {
//     eventEmitter.emit(“logout-response”, data);
//   });
// };