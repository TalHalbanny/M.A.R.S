function formatDate(date) {
  if (!date || date === 'N/A') return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString();
}

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

document.addEventListener('DOMContentLoaded', () => {
  fetchLatestHistory('Shuttle'); 
});
