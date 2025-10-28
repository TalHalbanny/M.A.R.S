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

async function fetchHistory(equipment, month, equipmentNum) {
  try {
    const res = await fetch('/get-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment, month, equipmentNum })
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
      const number = doc.shuttleNum || doc.AGVnum || doc.rgvNum || doc.liftNum || 'N/A';
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

//--LOAD OVERWEIGHT DATA & INSERT TO TABLE ON FRONT END--

async function loadOverweightData() {
  try {
    const res = await fetch('/get-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment: 'Overweight' })
    });

    const data = await res.json();
    console.log('Fetched Overweight Data:', data);
    renderOverweightRows(data);

  } catch (err) {
    console.error('Failed to fetch Overweight data:', err);
    const tbody = document.getElementById('overweightBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Error loading data</td></tr>`;
  }
}

function renderOverweightRows(data) {
  const tbody = document.getElementById('overweightBody');
  tbody.innerHTML = '';

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">No overweight records found.</td></tr>`;
    return;
  }

  data.forEach(item => {
    const date = item.overweightDate ? new Date(item.overweightDate).toLocaleDateString() : '-';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${date}</td>
      <td>${item.overweightHour || '-'}</td>
      <td>${item.ovWeight || '-'}</td>
      <td>${item.boxNumber || '-'}</td>
      <td><img src="/${item.ovImage[0]}" alt="Overweight" style="width:200px;height:200;"></td>`;
    tbody.appendChild(row);
  });
}

window.addEventListener('DOMContentLoaded', loadOverweightData);



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

const equipmentRadios = document.querySelectorAll('input[name="equipment"]');
const equipmentNumSelect = document.getElementById('equipmentNumFilter');

equipmentRadios.forEach(radio => {
  radio.addEventListener('change', async () => {
    const equipment = radio.value;
    equipmentNumSelect.innerHTML = '<option value="">All</option>'; // reset

    let url = '';

    switch (equipment) {
      case 'Shuttle':
        url = '/get_shuttles';
        break;
      case 'AGV':
        url = '/get_AGVS';
        break;
      case 'RGV':
        url = '/get_RGVS';
        break;
      case 'Lift':
        url = '/get_LIFTS';
        break;
      default:
        url = '';
    }

    if (!url) return;

    try {
      const res = await fetch(url);
      const data = await res.json();

      data.forEach(item => {
        // For Shuttles: shuttleNum, for AGV: AGVnum, etc.
        const num = item.shuttleNum || item.AGVnum || item.rgvNum || item.liftNum;
        if (num) {
          const option = document.createElement('option');
          option.value = num;
          option.textContent = num;
          equipmentNumSelect.appendChild(option);
        }
      });
    } catch (err) {
      console.error('Failed to fetch equipment numbers:', err);
    }
  });
});




//--EVENT LISTENERS--

historyForm.addEventListener('submit', e => {
  e.preventDefault();
  const equipment = historyForm.querySelector('input[name="equipment"]:checked')?.value;
  const month = monthInput.value;
  const equipmentNum = equipmentNumSelect.value;
  if (!equipment) return alert('Please select an equipment type.');
  fetchHistory(equipment, month, equipmentNum);
});

monthInput.addEventListener('change', () => {
  const equipment = historyForm.querySelector('input[name="equipment"]:checked')?.value;
  const equipmentNum = equipmentNumSelect.value;
  if (equipment) fetchHistory(equipment, monthInput.value, equipmentNum);
});


