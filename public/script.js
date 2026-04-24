async function loadVersions() {
  const nodeEl = document.getElementById('node-version');
  const npmEl = document.getElementById('npm-version');

  nodeEl.textContent = '...';
  npmEl.textContent = '...';

  try {
    const res = await fetch('/api/versions');
    const data = await res.json();
    nodeEl.textContent = data.node;
    npmEl.textContent = data.npm;
  } catch (err) {
    nodeEl.textContent = 'помилка';
    npmEl.textContent = 'помилка';
    console.error(err);
  }
}

document.getElementById('refresh-btn').addEventListener('click', loadVersions);
loadVersions();
