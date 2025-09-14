function formatDate(date) {
  if (!date || date === 'N/A') return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString();
}

//fetch latest issues from MongoDB Collection, use rednerIssues inside. 


async function fetchLatestHistory(equipment) {
  try {
    const res = await fetch('/get-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment })
    });

    if (!res.ok) throw new Error('Failed to fetch history');
    const data = await res.json();

    if (!data.length) {
      renderLatestIssues([{ title: 'No records found', description: '', status: '' }]);
      return;
    }

    const latest = data.slice(0, 5);

    const issues = latest.map(doc => ({
      shuttleNum: doc.shuttleNum,
      title: doc.notes || 'No title',
      description: `Report Date - ${formatDate(doc.date || doc.agvDate || doc.rgvDate || doc.liftDate || 'N/A')}`, 
      fixedBy: doc.fixedBy,
      location: doc.reportedAt || 'N/A'
    }));

    renderLatestIssues(issues);

  } catch (err) {
    console.error(err);
  }
}

//show latest issues.


function renderLatestIssues(issues) {
  const list = document.getElementById('issues');
  list.innerHTML = ''; 
  issues.forEach(issue => {
    const li = document.createElement('li');
    li.className = 'list-group-item border rounded-3 mb-2';
    li.innerHTML = `
      <div class="fw-semibold">Shuttle #${issue.shuttleNum}</div>
      <div class="text-muted small">${issue.description}</div>
      <div class="text-muted small">Location - ${issue.location}</div>
      <span class="badge bg-danger-subtle text-danger mt-2">Fixed By - ${issue.fixedBy}</span>
    `;
    list.appendChild(li);
  });
}


//fetch messages, and display onto index main screen, if no messages to display, show No Massages.

async function fetchLatestMessages() {
  const res = await fetch('/get-messages');
  const data = await res.json();

  const list = document.getElementById('messages');

  list.innerHTML = '';

    if (!data || data.length === 0) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-center text-muted';
    li.textContent = 'Currently No Massages';
    list.appendChild(li);
    return; 
  }
  
  data.forEach(m => {
  const li = document.createElement('li');
  li.className = 'list-group-item border rounded-3 mb-2 text-center';
  li.dataset.id = m._id; 

  li.innerHTML = `
    <div class="fw-semibold">From: ${m.technician}</div>
    <div class="text-muted small">Message: ${m.message}</div>
    <span class="badge bg-danger-subtle text-danger mt-2">Importance: ${m.importance}</span>
    <br>
    <button type="button" class="btn btn-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mt-2" style="width:40px; height:40px; padding:0;">✓</button>
  `;

    const button = li.querySelector('button');
    button.addEventListener('click', async () => {
    const messageId = li.dataset.id;

    const res = await fetch(`/delete-message/${messageId}`, { method: 'DELETE' });

    if (res.ok) {
      li.remove(); 
    } else {
      alert('Failed to delete message');
    }
  });

  list.appendChild(li);
});

}

//

async function submitMessage(message, technician, importance) {
  const res = await fetch('/submit-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, technician, importance })
  });

  if (res.ok) {
    fetchLatestMessages();
  }
}

//call functions.

document.addEventListener('DOMContentLoaded', () => {
  fetchLatestHistory('Shuttle'); 
  fetchLatestMessages();
});
