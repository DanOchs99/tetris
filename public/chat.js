let message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const socket = io();
const messageInput = document.getElementById("messageInput");
const displayUsername = document.getElementById("displayUsername")

socket.on('connect', function () {


    socket.emit('connectUser', `is connected!!`)
})
socket.on("chat message", msg => {
    event.preventDefault();
    console.log(msg);
    let messageBox = document.getElementById("messageBox");
    let userMessaging = displayUsername.value
    messageBox.insertAdjacentHTML("beforeend", `<li><b>${userMessaging}</b> ${msg}</li>`);
});
submitButton.addEventListener("click", event => {
    event.preventDefault();
    socket.emit("chat message", message.value);
    messageInput.reset();
}); 