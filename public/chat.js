let message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const socket = io();
const messageInput = document.getElementById("messageInput");
const displayUsername = document.getElementById("displayUsername")
const numConnects = document.getElementById("numConnects")

socket.on('connect', function () {
    // send a connect message
    socket.emit('chat message', `${displayUsername.value}: connected to the chat...`);
    socket.emit('chat message',"USER_JOINED")
})

socket.on('chat message', (msg_rcvd) => {
    // push incoming message to the messageBox
    // DON'T THINK NEEDED HERE   // event.preventDefault();
    
    let messageBox = document.getElementById("messageBox");
    // format the message
    let n = msg_rcvd.indexOf(':');
    let user = msg_rcvd.slice(0,n);
    let msg = msg_rcvd.slice(n+1, msg_rcvd.length)

    if (user == "UPDATE_CONNECTS") {
        // update the connects display
        if (msg == '1') {
            numConnects.innerHTML = `${msg} user is connected to the chat.`
        }
        else {
            numConnects.innerHTML = `${msg} users are connected to the chat.`
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
