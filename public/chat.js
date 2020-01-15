let message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const socket = io();
const messageInput = document.getElementById("messageInput");
const displayUsername = document.getElementById("displayUsername")

socket.on('connect', function () {
    // send a connect message
    socket.emit('chat message', `${displayUsername.value}: connected to the chat...`)
})

socket.on('chat message', (msg_rcvd) => {
    // push incoming message to the messageBox
    event.preventDefault();
    let messageBox = document.getElementById("messageBox");
    // format the message
    let n = msg_rcvd.indexOf(':');
    let user = msg_rcvd.slice(0,n);
    let msg = msg_rcvd.slice(n+1, msg_rcvd.length)
    // display the message
    messageBox.insertAdjacentHTML("beforeend", `<li><b>${user}</b>${msg}</li>`);
});

submitButton.addEventListener("click", event => {
    event.preventDefault();
    socket.emit('chat message', `${displayUsername.value}: ${message.value}`);
    messageInput.reset();
});
