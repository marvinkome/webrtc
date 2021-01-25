const { RTCPeerConnection, RTCSessionDescription } = window;
const peerConnection = new RTCPeerConnection();
let isAlreadyCalling = false;

peerConnection.ontrack = function ({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

async function callUser(socketId) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("call-user", { offer, to: socketId });
}

function unselectUsersFromList() {
  const alreadySelectedUser = document.querySelectorAll(".active-user.active-user--selected");

  alreadySelectedUser.forEach((el) => {
    el.setAttribute("class", "active-user");
  });
}

function createUserItemContainer(socketId) {
  const userContainerEl = document.createElement("div");

  const usernameEl = document.createElement("p");

  userContainerEl.setAttribute("class", "active-user");
  userContainerEl.setAttribute("id", socketId);
  usernameEl.setAttribute("class", "username");
  usernameEl.innerHTML = `Socket: ${socketId}`;

  userContainerEl.appendChild(usernameEl);

  userContainerEl.addEventListener("click", () => {
    unselectUsersFromList();
    userContainerEl.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;

    callUser(socketId);
  });
  return userContainerEl;
}

function updateUserList(socketIds) {
  const activeUserContainer = document.getElementById("active-user-container");
  socketIds.forEach((socketId) => {
    const alreadyExists = document.getElementById(socketId);
    if (!alreadyExists) {
      const userContainerEl = createUserItemContainer(socketId);
      activeUserContainer.appendChild(userContainerEl);
    }
  });
}

const socket = io.connect("/", {
  transports: ["websocket"],
});

socket.on("update-user-list", ({ users }) => {
  console.log(users);
  updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
  const elToRemove = document.getElementById(socketId);
  if (elToRemove) {
    elToRemove.remove();
  }
});

socket.on("call-made", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit("make-answer", { answer, to: data.socket });
});

socket.on("answer-made", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  if (!isAlreadyCalling) {
    callUser(data.socket);
    isAlreadyCalling = true;
  }
});

navigator.getUserMedia(
  { video: true, audio: false },
  (stream) => {
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
      localVideo.srcObject = stream;
    }

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
  },
  (err) => console.warn(err.message)
);
