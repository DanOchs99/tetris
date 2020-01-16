let message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const socket = io();
const messageInput = document.getElementById("messageInput");
const displayUsername = document.getElementById("displayUsername")
const numChatConnects = document.getElementById("numChatConnects")
const numGameConnects = document.getElementById("numGameConnects")

socket.on('connect', function () {
    // send a connect message
    socket.emit('chat message', `${displayUsername.value}: connected to the chat...`);
    socket.emit('chat message', `${displayUsername.value}:USER_JOINED`);
})

socket.on('chat message', (msg_rcvd) => {
    // push incoming message to the messageBox
    let messageBox = document.getElementById("messageBox");
    // format the message
    let n = msg_rcvd.indexOf(':');
    let user = msg_rcvd.slice(0,n);
    let msg = msg_rcvd.slice(n+1, msg_rcvd.length)

    if (user == "UPDATE_CHAT_CONNECTS") {
        // update the chat connects display
        if (msg == '1') {
            numChatConnects.innerHTML = `${msg} user is connected to the chat.`
        }
        else {
            numChatConnects.innerHTML = `${msg} users are connected to the chat.`
        }
    }
    else if (user == "UPDATE_GAME_CONNECTS") {
            // update the game connects display
            if (msg == '1') {
                numGameConnects.innerHTML = `${msg} user is playing Tetris.`
            }
            else {
                numGameConnects.innerHTML = `${msg} users are playing Tetris.`
            }
    }
    else {
        // push message to the display
        messageBox.insertAdjacentHTML("beforeend", `<li><b>${user}</b>${msg}</li>`);
    }
});

submitButton.addEventListener("click", event => {
    event.preventDefault();
    socket.emit('chat message', `${displayUsername.value}: ${message.value}`);
    messageInput.reset();
});
