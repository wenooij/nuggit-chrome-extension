import './wasm_exec.js';

(async () => {
  // The WASM module implements the Nuggit HTTP client and runtime.
  // We use the runtime by calling its exported symbols.
  try {
    const wasmURL = chrome.runtime.getURL("nuggit.wasm");
    const source = fetch(wasmURL);
    const go = new Go();
    const wasmModule = await WebAssembly.instantiateStreaming(source, go.importObject);

    // Start the client.
    console.log("Nuggit client module is starting");
    go.run(wasmModule.instance);
  } catch (error) {
    console.error("Error in client module:", error);
  }
})();

// Listen for connections on the observer port.
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(function (msg) {
    // Debug messages.
    console.log(msg);

    if (msg.url) {
      console.log('Navigated to ', msg.url);

      // Post a message with some rules for testing.
      // For now, it's some rules that scrapes the 
      // inner text of job-card-list class elements.
      port.postMessage({
        rules: [
          {
            filter: {
              class: 'job-card-list'
            },
            action: {
              innerText: true
            },
          }
        ]
      })

    } else if (msg.result) {
      console.log('Result message sent to client');


    }
  });

  // Let console know we're cooking.
  console.log('Worker is listening for messages');
});
