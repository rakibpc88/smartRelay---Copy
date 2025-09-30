const toggleButton = document.getElementById('toggleButton');
const relayStateDisplay = document.getElementById('relayState');

toggleButton.addEventListener('click', () => {
  fetch('http://<ESP8266_IP>/toggle')  // Replace with your ESP8266 IP address
    .then(response => response.text())
    .then(data => {
      if (data === 'ON') {
        relayStateDisplay.textContent = 'Relay is ON';
      } else {
        relayStateDisplay.textContent = 'Relay is OFF';
      }
    })
    .catch(error => console.error('Error:', error));
});
