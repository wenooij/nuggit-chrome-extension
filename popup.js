let defaultAddress = 'http://localhost:9402';

async function getBackendAddress() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendAddress'], (result) => {
      resolve(result || defaultAddress);
    });
  });
}

async function testBackendConnection() {
  try {
    const response = await fetch(`${await getBackendAddress()}/api/status`, { method: 'GET' });

    if (!response.ok) throw new Error(`Failed to connect to nuggit backend: ${response.statusText}`);

    document.getElementById('test-connection-response').innerHTML = '<span style="color:green;">Connected to backend.</span>'
    return true;
  } catch (error) {
    document.getElementById('test-connection-response').innerHTML = '<span style="color:red;">Backend connection failed.</span>';
    return false;
  }
}

async function changeBackendAddress() {
  backendAddress = document.getElementById('backend-address').value;
  const connected = await testBackendConnection();
  if (connected) {
    chrome.storage.local.set({ backendAddress: backendAddress }, () => {
      console.log(`Nuggit backend address saved to local storage`);
    });
  }
}

window.onload = function () {
  document.getElementById('backend-address-change').addEventListener('click', changeBackendAddress);
  document.getElementById('test-connection').addEventListener('click', testBackendConnection);
  document.getElementById('backend-address').value = defaultAddress;
};