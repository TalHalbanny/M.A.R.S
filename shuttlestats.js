const alertedShuttles = new Set();
const alertSound = new Audio('alarm.mp3');
let soundEnabled = false;

const soundSwitch = document.getElementById('sound-switch');
const switchLabel = document.getElementById('switch-label');

soundSwitch.addEventListener('change', () => {
  soundEnabled = soundSwitch.checked;
  switchLabel.textContent = soundEnabled ? "Sound ON" : "Sound OFF";

  if (soundEnabled) {
    alertSound.play().then(() => {
      alertSound.pause();
      alertSound.currentTime = 0;
    }).catch(console.log);
  }
});

function showNotification(message) {
  const notif = document.createElement('div');
  notif.innerText = message;
  notif.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: red;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    z-index: 9999;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    font-weight: bold;
  `;
  document.body.appendChild(notif);

  setTimeout(() => notif.remove(), 5000);
}

async function loadShuttles() {
  const res = await fetch('/api/shuttles');
  const shuttles = await res.json();
  const container = document.getElementById('shuttle-container');

  container.innerHTML = '';
  let row;

  shuttles.forEach((s, index) => {
    if (index % 6 === 0) {
      row = document.createElement('div');
      row.className = 'row mb-3';
      container.appendChild(row);
    }

    const col = document.createElement('div');
    col.className = 'col-md-2';

    const status = s.Status.toLowerCase().trim();
    const isError = status.includes('abnormal') || status.includes('invalid');

    if (isError && !alertedShuttles.has(s.Shuttle)) {
      alertedShuttles.add(s.Shuttle);

      if (soundEnabled) {
        alertSound.currentTime = 0;
        alertSound.play().catch(e => console.log("Sound error:", e));
      }

      showNotification(`Error detected in Shuttle ${s.Shuttle}!`);
    }

    if (!isError && alertedShuttles.has(s.Shuttle)) {
      alertedShuttles.delete(s.Shuttle);
    }

    let bgClass = 'bg-success text-white';
    if (isError) bgClass = 'bg-danger text-white';
    else if (status.includes('task in progress') || status.includes('run') || status.includes('waiting') || status.includes('complete')) {
      bgClass = 'bg-warning text-dark';
    } else if (status.includes('offline')) {
      bgClass = 'bg-primary text-white';
    }

    const ipLink = `http://${s.IP.split(/[/:]/)[0]}`;

    col.innerHTML = `
      <div class="card shadow-sm mb-3 ${bgClass}" style="width: 200px; height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; margin: auto;">
        <br>
        <h6 class="card-title mb-2">Shuttle ${s.Shuttle}</h6>
        <p class="card-text mb-1"><strong>Level:</strong> ${s.Level}</p>
        <p class="card-text mb-1"><strong>Aisle:</strong> ${s.Aisle}</p>
        <p class="card-text mb-2"><strong>Status:</strong> ${s.Status}</p>
        <br>
        <a class="btn btn-light btn-sm mt-auto" href="${ipLink}" target="_blank">Dashboard</a>
        <br>
      </div>
    `;

    row.appendChild(col);
  });
}

loadShuttles();
setInterval(loadShuttles, 10000);
