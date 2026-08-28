const CHANNEL = "formsync";
let socket;
const pending = [];

function connect() {
  if (socket && socket.readyState <= 1) return;
  socket = new WebSocket("ws://127.0.0.1:3737");
  socket.addEventListener("open", () => {
    for (const msg of pending.splice(0)) socket.send(JSON.stringify(msg));
  });
  socket.addEventListener("message", (event) => {
    const parsed = JSON.parse(String(event.data));
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, { channel: CHANNEL, ...parsed });
      }
    });
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.channel !== CHANNEL) return;
  const { channel: _c, ...rpc } = msg;
  connect();
  const payload = JSON.stringify(rpc);
  if (socket?.readyState === WebSocket.OPEN) socket.send(payload);
  else pending.push(rpc);
});

connect();
