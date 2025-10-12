// Get references to main DOM elements
const equipmentSelect = document.getElementById('equipment');
const dynamicFields = document.getElementById('dynamicFields');

/**
 * Templates for dynamic form fields based on equipment type
 */
const templates = {
  Shuttle: `
    <div class="mb-3">
      <label class="form-label" for="shuttleReportedAt">Reported At</label>
      <select class="form-select" id="shuttleReportedAt" name="reportedAt" required>
        <option value="" disabled selected>Select location...</option>
        ${Array.from({length: 11}, (_, i) => `<option value="A${i+1}">A${i+1}</option>`).join('')}
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label" for="shuttleNum">Shuttle Number</label>
      <select class="form-select" id="shuttleNum" name="shuttleNum" required></select>
    </div>
    <div class="mb-3">
      <label class="form-label" for="shuttleHour">Hour</label>
      <select class="form-select" id="shuttleHour" name="hour" required></select>
    </div>
    <div class="mb-3">
      <label class="form-label" for="shuttleDate">Date</label>
      <input type="date" class="form-control" id="shuttleDate" name="date" required />
    </div>
    <div class="mb-3">
      <label class="form-label" for="shuttleNotes">Describe Error</label>
      <textarea class="form-control" id="shuttleNotes" name="notes" rows="3" placeholder="Enter additional details..."></textarea>
    </div>
    <div class="mb-3">
      <label class="form-label" for="shuttleFixedBy">Fixed By</label>
      <select class="form-select" id="shuttleFixedBy" name="fixedBy" required>
        <option value="" disabled selected>Select technician...</option>
        <option value="Maxim Derevyankin">Maxim Derevyankin</option>
        <option value="Kiril Rozet">Kiril Rozet</option>
        <option value="Daniel Mirzayev">Daniel Mirzayev</option>
        <option value="Tal Halbanny">Tal Halbanny</option>
        <option value="Pavel Tishkov">Pavel Tishkov</option>
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label" for="shuttleSolution">Solution Made for Issue</label>
      <textarea class="form-control" id="shuttleSolution" name="solution" rows="3" placeholder="Describe the fix..."></textarea>
    </div>
  `,
  AGV: `
    <div class="mb-3">
      <label class="form-label" for="agvNum">AGV Number</label>
      <select class="form-select" id="agvNum" name="agvNum" required>
        <option value="" disabled selected>Select AGV Shuttle...</option>
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label" for="agvHour">Hour</label>
      <select class="form-select" id="agvHour" name="hour" required></select>
    </div>
    <div class="mb-3">
      <label class="form-label" for="agvDate">Date</label>
      <input type="date" class="form-control" id="agvDate" name="date" required />
    </div>
    <div class="mb-3">
      <label class="form-label" for="agvNotes">Describe Error</label>
      <textarea class="form-control" id="agvNotes" name="notes" rows="3" placeholder="Enter additional details..."></textarea>
    </div>
    <div class="mb-3">
      <label class="form-label" for="agvFixedBy">Fixed By</label>
      <select class="form-select" id="shuttleFixedBy" name="fixedBy" required>
        <option value="" disabled selected>Select technician...</option>
        <option value="Maxim Derevyankin">Maxim Derevyankin</option>
        <option value="Kiril Rozet">Kiril Rozet</option>
        <option value="Daniel Mirzayev">Daniel Mirzayev</option>
        <option value="Tal Halbanny">Tal Halbanny</option>
        <option value="Pavel Tishkov">Pavel Tishkov</option>
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label" for="agvSolution">Solution Made for Issue</label>
      <textarea class="form-control" id="agvSolution" name="solution" rows="3" placeholder="Describe the fix..."></textarea>
    </div>
  `,
    RGV: `
        <div class="mb-3">
          <label class="form-label" for="rgvNum">RGV Number</label>
          <select class="form-select" id="rgvNum" name="rgvNum" required>
            <option value="" disabled selected>Select RGV Shuttle...</option>
            <option value="001">001</option>
            <option value="002">002</option>
            <option value="003">003</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label" for="rgvHour">Hour</label>
          <select class="form-select" id="rgvHour" name="hour" required></select>
        </div>
        <div class="mb-3">
          <label class="form-label" for="rgvDate">Date</label>
          <input type="date" class="form-control" id="rgvDate" name="date" required />
        </div>
        <div class="mb-3">
          <label class="form-label" for="rgvNotes">Describe Error</label>
          <textarea class="form-control" id="rgvNotes" name="notes" rows="3" placeholder="Enter additional details..."></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label" for="rgvFixedBy">Fixed By</label>
      <select class="form-select" id="shuttleFixedBy" name="fixedBy" required>
        <option value="" disabled selected>Select technician...</option>
        <option value="Maxim Derevyankin">Maxim Derevyankin</option>
        <option value="Kiril Rozet">Kiril Rozet</option>
        <option value="Daniel Mirzayev">Daniel Mirzayev</option>
        <option value="Tal Halbanny">Tal Halbanny</option>
        <option value="Pavel Tishkov">Pavel Tishkov</option>
      </select>
        </div>
        <div class="mb-3">
          <label class="form-label" for="rgvSolution">Solution Made for Issue</label>
          <textarea class="form-control" id="rgvSolution" name="solution" rows="3" placeholder="Describe the fix..."></textarea>
        </div>
      `,
      Lift: `
        <div class="mb-3">
          <label class="form-label" for="liftNum">Lift Number</label>
          <select class="form-select" id="liftNum" name="liftNum" required>
            <option value="" disabled selected>Select Lift...</option>
            <option value="AGV_LIFT">AGV Lift</option>
            <option value="IB1">IB1</option><option value="IB2">IB2</option><option value="IB3">IB3</option>
            <option value="IB4">IB4</option><option value="IB5">IB5</option><option value="IB6">IB6</option>
            <option value="IB7">IB7</option><option value="IB8">IB8</option><option value="IB9">IB9</option>
            <option value="IB10">IB10</option><option value="IB11">IB11</option>
            <option value="OB1">OB1</option><option value="OB2">OB2</option><option value="OB3">OB3</option>
            <option value="OB4">OB4</option><option value="OB5">OB5</option><option value="OB6">OB6</option>
            <option value="OB7">OB7</option><option value="OB8">OB8</option><option value="OB9">OB9</option>
            <option value="OB10">OB10</option><option value="OB11">OB11</option>
            <option value="K1">K1</option><option value="K2">K2</option><option value="K3">K3</option>
            <option value="K4">K4</option><option value="K5">K5</option><option value="K6">K6</option>
            <option value="K7">K7</option><option value="K8">K8</option><option value="K9">K9</option>
            <option value="K10">K10</option><option value="K11">K11</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label" for="liftHour">Hour</label>
          <select class="form-select" id="liftHour" name="hour" required></select>
        </div>
        <div class="mb-3">
          <label class="form-label" for="liftDate">Date</label>
          <input type="date" class="form-control" id="liftDate" name="date" required />
        </div>
        <div class="mb-3">
          <label class="form-label" for="liftNotes">Describe Error</label>
          <textarea class="form-control" id="liftNotes" name="notes" rows="3" placeholder="Enter additional details..."></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label" for="liftFixedBy">Fixed By</label>
        <select class="form-select" id="shuttleFixedBy" name="fixedBy" required>
        <option value="" disabled selected>Select technician...</option>
        <option value="Maxim Derevyankin">Maxim Derevyankin</option>
        <option value="Kiril Rozet">Kiril Rozet</option>
        <option value="Daniel Mirzayev">Daniel Mirzayev</option>
        <option value="Tal Halbanny">Tal Halbanny</option>
        <option value="Pavel Tishkov">Pavel Tishkov</option>
        </select>
        </div>
        <div class="mb-3">
          <label class="form-label" for="liftSolution">Solution Made for Issue</label>
          <textarea class="form-control" id="liftSolution" name="solution" rows="3" placeholder="Describe the fix..."></textarea>
        </div>
      `
    };


/**
 * Populate hour options (00:00, 00:30, ... 23:30) for a select element
 * @param {string} selectId
 */
function populateHours(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';

  for (let h = 0; h < 24; h++) {
    for (const m of ['00','30']) {
      const time = `${String(h).padStart(2,'0')}:${m}`;
      const opt = document.createElement('option');
      opt.value = time;
      opt.textContent = time;
      sel.appendChild(opt);
    }
  }
}

/**
 * Populate Shuttle dropdown from MongoDB
 * @param {string} selectId
 */
async function populateShuttles(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="" disabled selected>Loading Shuttles...</option>';

  try {
    const res = await fetch('/get_shuttles');
    const shuttles = await res.json();
    sel.innerHTML = '<option value="" disabled selected>Select Shuttle...</option>';

    shuttles.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.shuttleNum;
      opt.textContent = s.shuttleNum;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading shuttles:", err);
    sel.innerHTML = '<option value="" disabled selected>Failed to load Shuttles</option>';
  }
}

/**
 * Populate AGV dropdown from MongoDB
 * @param {string} selectId
 */
async function populateAGVs(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="" disabled selected>Loading AGVs...</option>';

  try {
    const res = await fetch('/get_AGVS');
    const agvs = await res.json();
    sel.innerHTML = '<option value="" disabled selected>Select AGV Shuttle...</option>';

    agvs.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.AGVnum;
      opt.textContent = a.AGVnum;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading AGVs:", err);
    sel.innerHTML = '<option value="" disabled selected>Failed to load AGVs</option>';
  }
}

/**
 * Handle dynamic form fields on equipment change
 */
equipmentSelect.addEventListener('change', () => {
  const type = equipmentSelect.value;
  dynamicFields.innerHTML = templates[type] || '';

  if (type === 'Shuttle') populateShuttles('shuttleNum');
  if (type === 'AGV') populateAGVs('agvNum');

  if (['Shuttle', 'AGV', 'RGV', 'Lift'].includes(type)) {
    populateHours(type.toLowerCase() + 'Hour');
  }
});

/**
 * Handle equipment form submission
 */
document.getElementById('equipmentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const msg = await res.text();
    alert(msg);

    e.target.reset();
    dynamicFields.innerHTML = '';
  } catch (err) {
    console.error(err);
    alert('Failed to submit report.');
  }
});

