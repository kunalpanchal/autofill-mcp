const CHANNEL = "formsync";

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.channel !== CHANNEL) return;
  chrome.runtime.sendMessage(data);
});

chrome.runtime.onMessage.addListener((msg) => {
  window.postMessage({ ...msg, channel: CHANNEL }, "*");
});
