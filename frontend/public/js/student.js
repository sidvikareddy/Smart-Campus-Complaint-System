if (!Auth.require('student')) throw new Error('redirecting');

document.getElementById('welcome').textContent = 'Hi, ' + Auth.user.name;

const statsEl = document.getElementById('stats');
const listEl = document.getElementById('list');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const filterCategory = document.getElementById('filterCategory');
const filterSearch = document.getElementById('filterSearch');
const formAlert = document.getElementById('formAlert');
const duplicateList = document.getElementById('duplicateList');
const evidenceInput = document.getElementById('evidence');
const evidencePreview = document.getElementById('evidencePreview');
const form = document.getElementById('complaintForm');

let allComplaints = [];

evidenceInput.addEventListener('change', () => {
  const file = evidenceInput.files[0];
  if (!file) {
    evidencePreview.innerHTML = '';
    return;
  }
  evidencePreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Selected evidence preview" /><span>${esc(file.name)}</span>`;
});

function renderDuplicates(duplicates) {
  duplicateList.innerHTML = duplicates.length
    ? `<strong>Open complaints at this location</strong>${duplicates.map((c) => `
      <div class="duplicate-item">
        <span><strong>${esc(c.title)}</strong> · ${esc(c.category)} · ${c.upvotes || 0} upvotes</span>
        <button type="button" class="small duplicate-upvote" data-id="${c._id}" data-location="${esc(c.location)}">${c.hasUpvoted ? 'Remove upvote' : 'Upvote'}</button>
      </div>`).join('')}`
    : '';
}

function statClass(s) {
  return { Pending: 'pending', 'In Progress': 'progress', Resolved: 'resolved', Rejected: 'rejected' }[s] || '';
}

function renderStats(stats, statuses) {
  statsEl.innerHTML =
    `<div class="stat total"><div class="lbl">Total Complaints</div><div class="num">${stats.total}</div></div>` +
    statuses
      .map((s) => `<div class="stat ${statClass(s)}"><div class="lbl">${esc(s)}</div><div class="num">${stats[s] || 0}</div></div>`)
      .join('');
  filterCategory.innerHTML += meta.categories.map((c) => `<option>${esc(c)}</option>`).join('');
}

function renderList() {
  const items = allComplaints.filter((c) => {
    const search = filterSearch.value.trim().toLowerCase();
    return (!filterStatus.value || c.status === filterStatus.value) &&
      (!filterPriority.value || c.priority === filterPriority.value) &&
      (!filterCategory.value || c.category === filterCategory.value) &&
      (!search || `${c.title} ${c.location}`.toLowerCase().includes(search));
  });

  if (!items.length) {
    listEl.innerHTML = '<div class="empty">No complaints to show.</div>';
    return;
  }

  listEl.innerHTML = items
    .map(
      (c) => `
    <div class="complaint">
      <div class="head">
        <h3>${esc(c.title)}</h3>
        ${badge(c.status)}
      </div>
      <div class="meta">
        <span class="badge cat">${esc(c.category)}</span>
        ${c.location ? ' &middot; ' + esc(c.location) : ''}
        &middot; Priority: ${esc(c.priority)}
        &middot; Submitted ${fmtExactDate(c.createdAt)}
      </div>
      <div>${esc(c.description)}</div>
      <div class="complaint-actions">
        <span class="upvote-count">${c.upvotes || 0} upvotes</span>
        ${c.status === 'Pending' || c.status === 'In Progress' ? `<button type="button" class="small upvote-btn" data-id="${c._id}" data-location="${esc(c.location)}">${c.hasUpvoted ? 'Remove upvote' : 'Upvote'}</button>` : ''}
      </div>
      ${c.evidence && c.evidence.length ? `<div class="evidence-list">${c.evidence.map((file) => `<a href="${esc(file.url)}" target="_blank" rel="noopener">View photo evidence</a>`).join('')}</div>` : ''}
      ${c.adminRemarks ? `<div class="remarks"><strong>Admin remarks:</strong> ${esc(c.adminRemarks)}</div>` : ''}
      <ul class="timeline">
        ${c.history
          .map(
            (h) => `<li>${badge(h.status)} ${h.remarks ? esc(h.remarks) : ''}
              <div class="when">${fmtExactDate(h.changedAt)}</div></li>`
          )
          .join('')}
      </ul>
    </div>`
    )
    .join('');
}

async function load() {
  try {
    const duplicates = await getDuplicates();
    if (duplicates.length) {
      showAlert(formAlert, 'This complaint has already been raised at this location with the same priority. Upvote it from your history instead.');
      renderDuplicates(duplicates);
      return;
    }
    renderDuplicates([]);
    const { stats, complaints } = await api('/complaints/mine');
    allComplaints = complaints;
    const meta = await api('/complaints/meta');
    renderStats(stats, meta.statuses);
    renderList();
  } catch (err) {
    listEl.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}

function getDuplicates() {
  const params = new URLSearchParams({
    title: document.getElementById('title').value,
    location: document.getElementById('location').value,
    priority: document.getElementById('priority').value
  });
  return api(`/complaints/duplicates?${params.toString()}`);
}

async function init() {
  const meta = await api('/complaints/meta');
  document.getElementById('category').innerHTML = meta.categories
    .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
    .join('');
  meta.statuses.forEach((s) => filterStatus.insertAdjacentHTML('beforeend', `<option>${esc(s)}</option>`));
  await load();
}

filterStatus.addEventListener('change', renderList);
[filterPriority, filterCategory, filterSearch].forEach((element) => {
  element.addEventListener('input', renderList);
  element.addEventListener('change', renderList);
});

duplicateList.addEventListener('click', async (event) => {
  const button = event.target.closest('.duplicate-upvote');
  if (!button) return;
  try {
    const result = await api(`/complaints/${button.dataset.id}/upvote`, {
      method: 'POST',
      body: JSON.stringify({ location: button.dataset.location })
    });
    const duplicates = await getDuplicates();
    renderDuplicates(duplicates);
    showAlert(formAlert, `${result.upvotes} upvotes on this open complaint.`, 'success');
  } catch (err) {
    showAlert(formAlert, err.message);
  }
});
document.getElementById('resetFilters').addEventListener('click', () => {
  [filterSearch, filterStatus, filterPriority, filterCategory].forEach((element) => { element.value = ''; });
  renderList();
});

listEl.addEventListener('click', async (event) => {
  const button = event.target.closest('.upvote-btn');
  if (!button) return;
  try {
    const result = await api(`/complaints/${button.dataset.id}/upvote`, {
      method: 'POST',
      body: JSON.stringify({ location: button.dataset.location })
    });
    const complaint = allComplaints.find((item) => item._id === button.dataset.id);
    if (complaint) {
      complaint.upvotes = result.upvotes;
      complaint.hasUpvoted = result.hasUpvoted;
      renderList();
    }
  } catch (err) {
    showAlert(formAlert, err.message);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(formAlert);
  try {
    const duplicates = await getDuplicates();
    if (duplicates.length) {
      renderDuplicates(duplicates);
      throw new Error('This complaint has already been raised at this location with the same priority.');
    }
    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('location', document.getElementById('location').value);
    formData.append('priority', document.getElementById('priority').value);
    formData.append('description', document.getElementById('description').value);
    const evidence = document.getElementById('evidence').files[0];
    if (evidence) {
      if (evidence.size > 5 * 1024 * 1024) throw new Error('Image must be 5MB or smaller');
      formData.append('evidence', evidence);
    }
    await api('/complaints', {
      method: 'POST',
      body: formData
    });
    form.reset();
    document.getElementById('priority').value = 'Medium';
    showAlert(formAlert, 'Complaint submitted successfully.', 'success');
    await load();
  } catch (err) {
    showAlert(formAlert, err.message);
  }
});

init();
setInterval(load, 30000);
