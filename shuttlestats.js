const alertedShuttles = new Set();
const handledShuttles = new Set();   // 🔹 NEW — stores shuttles manually acknowledged
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

  const [shuttleres,shuttleLinks] = await Promise.all([
    fetch('/api/shuttles'),
    fetch ('/api/shuttlelinkdata')
  ]);

  const shuttles = await shuttleres.json()
  const links = await shuttleLinks.json()
  console.log("Fetched shuttle link data:", links); 
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
    const longterm = s.Status.includes('long-term');
    const isError = !longterm && (status.includes('abnormal') || status.includes('invalid') ||
                    status.includes('timeout'));

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
      handledShuttles.delete(s.Shuttle);  // 🔹 reset handled state if no longer in error
    }





  let bgClass = 'bg-success text-white';

if (longterm) {
  bgClass = 'bg-dark text-white'; 
} else if (isError) {
  if (handledShuttles.has(s.Shuttle)) {
    bgClass = 'bg-info text-dark'; 
  } else {
    bgClass = 'bg-danger text-white'; 
  }
} else if (status.includes('task in progress') || status.includes('run') ||
           status.includes('waiting') || status.includes('complete')) {
  bgClass = 'bg-warning text-dark';
} else if (status.includes('offline')) {
  bgClass = 'bg-primary text-white';
}
    
    

    const ipLink = `http://${s.IP.split(/[/:]/)[0]}`;

    const taskButton = s.TaskNoLink === "N/A"
      ? `<button class="btn btn-sm btn-light mb-1 mt-1" disabled style="padding:0.25rem 0.4rem; font-size:0.65rem;">No Task</button>`
      : `<a href="${s.TaskNoLink}" class="btn btn-sm btn-light mb-1 mt-1" target="_blank" style="padding:0.25rem 0.4rem; font-size:0.65rem;">Task</a>`;

      const operationLink = links[index]?.OperationLink || '#';

    col.innerHTML = `
      <div class="card shadow-sm mb-3 ${bgClass} text-center p-2" data-shuttle="${s.Shuttle}">
        <h6 class="card-title mt-1 mb-1" style="font-size:0.8rem;">Shuttle ${s.Shuttle}</h6>
        <p class="card-text mb-1" style="font-size:0.7rem;"><strong>Level:</strong> ${s.Level}</p>
        <p class="card-text mb-1" style="font-size:0.7rem;"><strong>Aisle:</strong> ${s.Aisle}</p>
        <p class="card-text mb-1" style="font-size:0.7rem;"><strong>Status:</strong> ${s.Status}</p>
        <p class="card-text mb-1" style="font-size:0.7rem;"><strong>Execution Phase:</strong> ${s.ExecutionPhase}</p>
        ${taskButton}
        <a href="${ipLink}" class="btn btn-sm btn-light mb-1 mt-1 plc-btn"
           style="padding:0.25rem 0.4rem; font-size:0.65rem;" target="_blank">
           PLC Screen
        </a>
        <a href="${operationLink}" class="btn btn-sm btn-light mb-1 mt-1"
           style="padding:0.25rem 0.4rem; font-size:0.65rem;" target="_blank">
           Operation
        </a>
      </div>
    `;

    row.appendChild(col);
  });

const hasAnyError = Array.from(alertedShuttles).length > 0;
const noError = Array.from(alertedShuttles).length == 0;
const okSign = document.getElementById('ok');
const globalWarning = document.getElementById('global-warning');

if (globalWarning) {
  globalWarning.style.display = hasAnyError ? 'block' : 'none';
} 

if (okSign) {
  okSign.style.display = noError ? 'block' : 'none'
}


  document.querySelectorAll('.plc-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const card = e.target.closest('.card');
      const shuttleId = card.getAttribute('data-shuttle');

      if (card.classList.contains('bg-danger')) {
        card.classList.remove('bg-danger', 'text-white');
        card.classList.add('bg-info', 'text-dark');
        handledShuttles.add(shuttleId);
      }
    });
  });
}

loadShuttles();
setInterval(loadShuttles, 3000);
