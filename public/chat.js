let message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const socket = io();
const messageInput = document.getElementById("messageInput");
socket.on("chat message", msg => {
    event.preventDefault();
    console.log(msg);
    let messageBox = document.getElementById("messageBox");
    messageBox.insertAdjacentHTML("beforeend", `<li>${msg}</li>`);
});
submitButton.addEventListener("click", event => {
    event.preventDefault();
    socket.emit("chat message", message.value);
    messageInput.reset();
}); 