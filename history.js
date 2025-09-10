// history.js


  const historyForm = document.getElementById('historyForm');
  const resultsDiv = document.getElementById('results');
  const resultsBody = document.getElementById('resultsBody');
  const monthInput = document.getElementById('monthFilter');




function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'N/A';
  return d.toLocaleDateString();
}

async function fetchHistory(equipment, month) {
  try {
    const res = await fetch('/get-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment, month })
    });

    if (!res.ok) throw new Error('Failed to fetch history');
    const data = await res.json();

    resultsBody.innerHTML = '';

    if (data.length === 0) {
      resultsBody.innerHTML = `<tr><td colspan="7">No records found.</td></tr>`;
      resultsDiv.classList.remove('d-none');
      return;
    }

// history.js -> fetchHistory function -> CORRECTED CODE

    data.forEach(doc => {
      const reportedAt = doc.reportedAt || 'N/A';
      const number = doc.shuttleNum || doc.agvNum || doc.rgvNum || doc.liftNum || 'N/A';
      const hour = doc.hour || 'N/A';

      // Check for every possible date field name from the server's response
      const recordDate = doc.date || doc.agvDate || doc.rgvDate || doc.liftDate || 'N/A';

      const notes = doc.notes || 'N/A';
      const fixedBy = doc.fixedBy || 'N/A';
      const solution = doc.solution || 'N/A';

      // This is the corrected HTML block without the invalid comment
      resultsBody.innerHTML += `
        <tr>
          <td>${reportedAt}</td>
          <td>${number}</td>
          <td>${hour}</td>
          <td>${formatDate(recordDate)}</td>
          <td>${notes}</td>
          <td>${fixedBy}</td>
          <td>${solution}</td>
        </tr>
      `;
    });

    resultsDiv.classList.remove('d-none');
  } catch (err) {
    console.error(err);
    alert('Error fetching history. Check console for details.');
  }
}

historyForm.addEventListener('submit', e => {
  e.preventDefault();
  const equipment = historyForm.querySelector('input[name="equipment"]:checked')?.value;
  const month = monthInput.value;
  if (!equipment) return alert('Please select an equipment type.');
  fetchHistory(equipment, month);
});

monthInput.addEventListener('change', () => {
  const equipment = historyForm.querySelector('input[name="equipment"]:checked')?.value;
  if (equipment) fetchHistory(equipment, monthInput.value);
});
