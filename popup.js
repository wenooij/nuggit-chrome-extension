let backendAddress = 'http://localhost:9402';

function testBackendConnection() {
    fetch(`${backendAddress}/api/status`, {
        method: 'GET',
    })
    .then(response => response.json())
    .then(_ => document.getElementById('test-connection-response').innerHTML = '<span style="color:green;">Connected to backend.</span>')
    .catch(_ => document.getElementById('test-connection-response').innerHTML = '<span style="color:red;">Backend connection failed.</span>')
}

window.onload = function () {
    document.getElementById('backend-address-change').addEventListener('click', function() {
        backendAddress = document.getElementById('backend-address').value;
        testBackendConnection();
    });
    document.getElementById('test-connection').addEventListener('click', function() {
        testBackendConnection();
    });
    document.getElementById('backend-address').value = backendAddress;
};