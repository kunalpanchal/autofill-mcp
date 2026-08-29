import { createTabMaps, forgetTab, rememberTab, tabForHostFrame } from "./route.js";

const CHANNEL = "formsync";
let socket;
const pending = [];
const tabs = createTabMaps();

function connect() {
  if (socket && socket.readyState <= 1) return;
  socket = new WebSocket("ws://127.0.0.1:3737");
  socket.addEventListener("open", () => {
    for (const msg of pending.splice(0)) socket.send(JSON.stringify(msg));
  });
  socket.addEventListener("message", (event) => {
    const parsed = JSON.parse(String(event.data));
    const tabId = tabForHostFrame(parsed, tabs);
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, { channel: CHANNEL, ...parsed }, () => {
      void chrome.runtime.lastError;
    });
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  forgetTab(tabId, tabs);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.channel !== CHANNEL) return;
  const tabId = sender.tab?.id;
  if (!tabId) return;
  const { channel: _c, ...rpc } = msg;
  rememberTab(rpc, tabId, tabs);
  connect();
  const payload = JSON.stringify(rpc);
  if (socket?.readyState === WebSocket.OPEN) socket.send(payload);
  else pending.push(rpc);
});

connect();
