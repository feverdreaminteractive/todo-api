let currentTodos = [];
let editingId = null;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTodos(todos) {
  currentTodos = todos;
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
      <td class="px-4 py-3 space-x-2 whitespace-nowrap">
        <button data-action="toggle" data-id="${todo.id}" data-completed="${todo.isCompleted}"
          class="px-3 py-1.5 text-xs font-medium text-white rounded-lg ${
            todo.isCompleted ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700'
          }">
          ${todo.isCompleted ? 'Mark active' : 'Complete'}
        </button>
        <button data-action="edit" data-id="${todo.id}"
          class="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800">
          Edit
        </button>
        <button data-action="delete" data-id="${todo.id}"
          class="px-3 py-1.5 text-xs font-medium text-white bg-red-700 rounded-lg hover:bg-red-800">
          Delete
        </button>
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

function openModal(todo) {
  editingId = todo ? todo.id : null;
  document.getElementById('modal-title').textContent = todo ? 'Edit todo' : 'Add todo';
  document.getElementById('field-title').value = todo?.title ?? '';
  document.getElementById('field-description').value = todo?.description ?? '';
  document.getElementById('field-dueDate').value = todo?.dueDate ?? '';
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('todo-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('todo-modal').classList.add('hidden');
  document.getElementById('todo-form').reset();
  editingId = null;
}

function showFormError(message) {
  const errorEl = document.getElementById('form-error');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

async function handleSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('field-title').value.trim();
  const description = document.getElementById('field-description').value.trim();
  const dueDate = document.getElementById('field-dueDate').value;

  const body = { title };
  if (description) body.description = description;
  if (dueDate) body.dueDate = dueDate;

  const url = editingId ? `/todos/${editingId}` : '/todos';
  const method = editingId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showFormError(data?.error?.message ?? 'Something went wrong.');
    return;
  }

  closeModal();
  fetchTodos();
}

async function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'toggle') {
    const completed = button.dataset.completed === 'true';
    await fetch(`/todos/${id}/${completed ? 'incomplete' : 'complete'}`, { method: 'PATCH' });
    fetchTodos();
  } else if (action === 'edit') {
    const todo = currentTodos.find((t) => t.id === id);
    if (todo) openModal(todo);
  } else if (action === 'delete') {
    if (!confirm('Delete this todo? This cannot be undone.')) return;
    await fetch(`/todos/${id}`, { method: 'DELETE' });
    fetchTodos();
  }
}

document.getElementById('add-todo-btn').addEventListener('click', () => openModal(null));
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('todo-form').addEventListener('submit', handleSubmit);
document.getElementById('todos-body').addEventListener('click', handleTableClick);
document.getElementById('filter-completed').addEventListener('change', fetchTodos);
document.getElementById('sort-by').addEventListener('change', fetchTodos);
document.getElementById('sort-order').addEventListener('change', fetchTodos);

fetchTodos();
