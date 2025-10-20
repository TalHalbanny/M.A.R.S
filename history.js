//--DECLARE ELEMENT BY ID--

const historyForm = document.getElementById('historyForm');
const resultsDiv = document.getElementById('results');
const resultsBody = document.getElementById('resultsBody');
const monthInput = document.getElementById('monthFilter');

const dateFieldMap = {
  Shuttle: 'date',
  AGV: 'agvDate',
  RGV: 'rgvDate',
  Lift: 'liftDate'
};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'N/A';
  return d.toLocaleDateString();
}

//--FETCH HISTORY FROM ROUTER /GET-HISTORY FUNCTION--

async function fetchHistory(equipment, month) {
  try {
    const res = await fetch('/get-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment, month })
    });

    if (!res.ok) {
      alert('Failed to fetch history');
      return;
    }

    const data = await res.json();
    resultsBody.innerHTML = '';

    if (!data || data.length === 0) {
      resultsBody.innerHTML = `<tr><td colspan="7">No records found.</td></tr>`;
      resultsDiv.classList.remove('d-none');
      return;
    }

    const dateField = dateFieldMap[equipment];

    data.forEach(doc => {
      const reportedAt = doc.reportedAt || 'N/A';
      const number = doc.shuttleNum || doc.agvNum || doc.rgvNum || doc.liftNum || 'N/A';
      const hour = doc.hour || 'N/A';
      const recordDate = doc[dateField] || 'N/A';
      const notes = doc.notes || 'N/A';
      const fixedBy = doc.fixedBy || 'N/A';
      const solution = doc.solution || 'N/A';

      const row = document.createElement('tr');
      row.dataset.id = doc._id;
      row.dataset.equipment = equipment;
      row.innerHTML = `
        <td>${reportedAt}</td>
        <td>${number}</td>
        <td class="editable hour-cell">${hour}</td>
        <td class="editable date-cell">${formatDate(recordDate)}</td>
        <td>${notes}</td>
        <td>${fixedBy}</td>
        <td>${solution}</td>
        <td><button class="btn"><img src="assets/visuals/trash.png" style="width:30px;height:30px;"></button></td>
      `;
      resultsBody.appendChild(row);
    });

    enableEditableCells();
    enableDeleteButtons();
    resultsDiv.classList.remove('d-none');

  } catch (err) {
    console.error(err);
    alert('Error fetching history');
  }
}

//--ENABLE EDITABLE CELLS FUNCTION--

function enableEditableCells() {
  document.querySelectorAll('.editable').forEach(cell => {
    if (cell.dataset.listener) return; // prevent multiple listeners
    cell.dataset.listener = true;

    cell.addEventListener('click', () => {
      if (cell.querySelector('input')) return;

      const oldValue = cell.textContent.trim();
      const isDate = cell.classList.contains('date-cell');

      const input = document.createElement('input');
      input.type = isDate ? 'date' : 'text';
      input.classList.add('form-control', 'form-control-sm');

      if (isDate && oldValue !== 'N/A') {
        const d = new Date(oldValue);
        if (!isNaN(d)) input.value = d.toISOString().split('T')[0];
      } else {
        input.value = oldValue;
      }

      cell.textContent = '';
      cell.appendChild(input);
      input.focus();

      input.addEventListener('blur', async () => {
        const newValue = input.value.trim();
        cell.textContent = isDate ? formatDate(newValue) : newValue;

        if (newValue !== oldValue && newValue !== '') {
          const row = cell.closest('tr');
          const id = row.dataset.id;
          const equipment = row.dataset.equipment;
          const field = isDate ? dateFieldMap[equipment] : 'hour';

          try {
            const res = await fetch('/update-history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, field, value: newValue, equipment })
            });

            if (!res.ok) {
              alert('Failed to update record');
              cell.textContent = oldValue;
            }
          } catch (err) {
            console.error(err);
            alert('Error updating record');
            cell.textContent = oldValue;
          }
        }
      });
    });
  });
}

//--ENABLE DELETE BUTTON FUNCTION FOR CONNECTING TO DATABASE--

function enableDeleteButtons() {
  document.querySelectorAll('button.btn').forEach(btn => {
    if (btn.dataset.listener) return; // prevent multiple listeners
    btn.dataset.listener = true;

    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const id = row.dataset.id;
      const equipment = row.dataset.equipment;

      if (!confirm('Delete Listed Row?')) return;

      try {
        const res = await fetch('/delete-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, equipment })
        });

        if (res.ok) {
          row.remove();
        } else {
          alert('Failed to Delete Row!');
        }
      } catch (err) {
        console.error(err);
        alert('Error Occurred');
      }
    });
  });
}



//--EVENT LISTENERS--

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


