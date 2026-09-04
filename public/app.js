// Read-only list view (issue #18). Create/edit/delete/complete wiring lands in #19.

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTodos(todos) {
  const tbody = document.getElementById('todos-body');
  const emptyState = document.getElementById('empty-state');
  tbody.innerHTML = '';

  if (todos.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const todo of todos) {
    const overdue = todo.dueDate && !todo.isCompleted && todo.dueDate < todayStr();
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    tr.innerHTML = `
      <td class="px-4 py-3">
        <div class="text-sm font-semibold text-gray-900">${escapeHtml(todo.title)}</div>
        ${todo.description ? `<div class="text-sm text-gray-500">${escapeHtml(todo.description)}</div>` : ''}
      </td>
      <td class="px-4 py-3 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}">
        ${todo.dueDate ?? '—'}${overdue ? ' (overdue)' : ''}
      </td>
      <td class="px-4 py-3">
        <span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${
          todo.isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }">
          ${todo.isCompleted ? 'Completed' : 'Active'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function fetchTodos() {
  const params = new URLSearchParams();

  const completed = document.getElementById('filter-completed').value;
  if (completed !== 'all') params.set('completed', completed);

  const sortBy = document.getElementById('sort-by').value;
  if (sortBy) {
    params.set('sortBy', sortBy);
    params.set('order', document.getElementById('sort-order').value);
  }

  const res = await fetch(`/todos?${params.toString()}`);
  const todos = await res.json();
  renderTodos(todos);
}

document.getElementById('filter-completed').addEventListener('change', fetchTodos);
document.getElementById('sort-by').addEventListener('change', fetchTodos);
document.getElementById('sort-order').addEventListener('change', fetchTodos);

fetchTodos();
