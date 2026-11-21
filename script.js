// PocketPlan – student budget tracker
// Data lives in localStorage; no backend needed.

// ---------- Constants ----------
const STORAGE_KEY = "pocketplan-v1";
const CATEGORIES = ["Food", "Transport", "Study", "Fun", "Other"];
const ICONS = { Food: "🍔", Transport: "🚌", Study: "📚", Fun: "🎬", Other: "✨" };
const COLORS = {
  Food: "#e7588f",      // pink
  Transport: "#6b7d35", // olive
  Study: "#f4a6c3",     // light pink
  Fun: "#4f5d26",       // dark olive
  Other: "#c3cf8f",     // pale olive
};

// ---------- State ----------
let state = loadState();
let viewMonth = todayISO().slice(0, 7); // "YYYY-MM"
let editingId = null;
let chart = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.expenses)) {
      return {
        budget: Number(saved.budget) || 0,
        expenses: saved.expenses.filter(
          (e) => e && typeof e.date === "string" && Number.isFinite(e.amount) && CATEGORIES.includes(e.category)
        ),
      };
    }
  } catch (e) {
    /* corrupted or unavailable storage: start fresh */
  }
  return { budget: 0, expenses: [] };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage unavailable: app still works for this session */
  }
}

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const form = $("expense-form");
const amountEl = $("amount");
const categoryEl = $("category");
const noteEl = $("note");
const dateEl = $("date");
const budgetEl = $("budget");
const submitBtn = $("submit-btn");
const cancelBtn = $("cancel-btn");
const listEl = $("list");
const emptyEl = $("empty");
const filterEl = $("filter");
const spentEl = $("spent");
const leftEl = $("left");
const perDayEl = $("perday");
const barEl = $("bar");
const barFillEl = $("bar-fill");
const alertEl = $("alert");
const breakdownEl = $("breakdown");
const monthLabelEl = $("month-label");
const prevMonthBtn = $("prev-month");
const nextMonthBtn = $("next-month");
const chartWrapEl = $("chart-wrap");
const chartEmptyEl = $("chart-empty");
const chartCanvas = $("chart");

// ---------- Helpers ----------
const money = (n) => "Rs " + Math.round(n).toLocaleString("en-PK");

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function currentMonthISO() {
  return todayISO().slice(0, 7);
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function monthName(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function monthExpenses() {
  return state.expenses.filter((e) => e.date.startsWith(viewMonth));
}

function totalsByCategory(list) {
  const totals = {};
  CATEGORIES.forEach((c) => (totals[c] = 0));
  list.forEach((e) => (totals[e.category] += e.amount));
  return totals;
}

// ---------- Rendering ----------
function render() {
  const monthly = monthExpenses();
  const totals = totalsByCategory(monthly);
  const spent = monthly.reduce((sum, e) => sum + e.amount, 0);
  const budget = state.budget;
  const isCurrent = viewMonth === currentMonthISO();

  monthLabelEl.textContent = monthName(viewMonth);
  nextMonthBtn.disabled = viewMonth >= currentMonthISO();

  spentEl.textContent = money(spent);

  // Left, safe-per-day, progress bar, warning
  const left = budget - spent;
  leftEl.textContent = budget > 0 ? money(left) : "—";
  leftEl.classList.toggle("over", budget > 0 && left < 0);

  if (budget > 0 && isCurrent) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate() + 1; // including today
    perDayEl.textContent = left > 0 ? money(left / daysLeft) : "Rs 0";
    perDayEl.classList.toggle("over", left <= 0);
  } else {
    perDayEl.textContent = "—";
    perDayEl.classList.remove("over");
  }

  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  barFillEl.style.width = pct + "%";
  barEl.setAttribute("aria-valuenow", String(Math.round(pct)));
  barFillEl.classList.toggle("warn", pct >= 80 && spent <= budget);
  barFillEl.classList.toggle("over", budget > 0 && spent > budget);

  if (budget > 0 && spent > budget) {
    alertEl.textContent = "You're over budget by " + money(spent - budget) + ".";
    alertEl.hidden = false;
  } else if (budget > 0 && pct >= 80) {
    alertEl.textContent = "Careful! You've used " + Math.round(pct) + "% of your budget.";
    alertEl.hidden = false;
  } else if (budget === 0 && spent > 0) {
    alertEl.textContent = "Set a monthly budget to see how much you can spend per day.";
    alertEl.hidden = false;
  } else {
    alertEl.hidden = true;
  }

  renderChart(totals, spent);
  renderBreakdown(totals, spent);
  renderList(monthly);
}

function renderChart(totals, spent) {
  const hasChartLib = typeof Chart !== "undefined";
  chartEmptyEl.hidden = spent > 0;
  chartWrapEl.hidden = spent === 0 || !hasChartLib;
  if (spent === 0 || !hasChartLib) return;

  const data = CATEGORIES.map((c) => totals[c]);
  if (chart) {
    chart.data.datasets[0].data = data;
    chart.update();
    return;
  }
  chart = new Chart(chartCanvas, {
    type: "doughnut",
    data: {
      labels: CATEGORIES,
      datasets: [
        {
          data: data,
          backgroundColor: CATEGORIES.map((c) => COLORS[c]),
          borderColor: "#ffffff",
          borderWidth: 3,
        },
      ],
    },
    options: {
      cutout: "62%",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => " " + ctx.label + ": " + money(ctx.parsed) },
        },
      },
    },
  });
}

function renderBreakdown(totals, spent) {
  breakdownEl.textContent = "";
  CATEGORIES.forEach((cat) => {
    const pct = spent > 0 ? (totals[cat] / spent) * 100 : 0;

    const row = document.createElement("div");
    row.className = "cat-row";

    const head = document.createElement("div");
    head.className = "cat-head";
    const name = document.createElement("span");
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = COLORS[cat];
    name.append(swatch, ICONS[cat] + " " + cat);
    const val = document.createElement("span");
    val.textContent = money(totals[cat]) + (spent > 0 ? " · " + Math.round(pct) + "%" : "");
    head.append(name, val);

    const track = document.createElement("div");
    track.className = "cat-track";
    const fill = document.createElement("div");
    fill.className = "cat-fill";
    fill.style.width = pct + "%";
    fill.style.background = COLORS[cat];
    track.append(fill);

    row.append(head, track);
    breakdownEl.append(row);
  });
}

function renderList(monthly) {
  listEl.textContent = "";
  const filter = filterEl.value;
  const shown = monthly
    .filter((e) => filter === "All" || e.category === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  emptyEl.hidden = shown.length > 0;
  emptyEl.textContent =
    monthly.length === 0
      ? "No expenses in " + monthName(viewMonth) + " yet."
      : "No " + filter + " expenses this month.";

  shown.forEach((e) => {
    const li = document.createElement("li");
    if (e.id === editingId) li.className = "editing";

    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = ICONS[e.category] + " " + e.category;

    const info = document.createElement("div");
    info.className = "info";
    const title = document.createElement("span");
    title.textContent = e.note || e.category;
    const when = document.createElement("small");
    when.textContent = new Date(e.date + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    info.append(title, when);

    const amt = document.createElement("span");
    amt.className = "amt";
    amt.textContent = money(e.amount);

    const label = e.note || e.category;
    const edit = document.createElement("button");
    edit.className = "edit";
    edit.type = "button";
    edit.textContent = "✎";
    edit.setAttribute("aria-label", "Edit expense " + label);
    edit.addEventListener("click", () => startEdit(e.id));

    const del = document.createElement("button");
    del.className = "del";
    del.type = "button";
    del.textContent = "✕";
    del.setAttribute("aria-label", "Delete expense " + label);
    del.addEventListener("click", () => deleteExpense(e.id));

    li.append(pill, info, amt, edit, del);
    listEl.append(li);
  });
}

// ---------- Actions ----------
function resetForm() {
  editingId = null;
  form.reset();
  dateEl.value = todayISO();
  submitBtn.textContent = "Add expense";
  cancelBtn.hidden = true;
  $("add-title").textContent = "Add expense";
}

function submitExpense(event) {
  event.preventDefault();
  const amount = Number(amountEl.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    amountEl.focus();
    return;
  }
  const date = dateEl.value || todayISO();

  if (editingId !== null) {
    const item = state.expenses.find((e) => e.id === editingId);
    if (item) {
      item.amount = amount;
      item.category = categoryEl.value;
      item.note = noteEl.value.trim();
      item.date = date;
    }
  } else {
    state.expenses.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      amount: amount,
      category: categoryEl.value,
      note: noteEl.value.trim(),
      date: date,
    });
  }

  saveState();
  viewMonth = date.slice(0, 7); // jump to the month of the saved expense
  resetForm();
  render();
  amountEl.focus();
}

function startEdit(id) {
  const item = state.expenses.find((e) => e.id === id);
  if (!item) return;
  editingId = id;
  amountEl.value = item.amount;
  categoryEl.value = item.category;
  noteEl.value = item.note;
  dateEl.value = item.date;
  submitBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  $("add-title").textContent = "Edit expense";
  render();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  amountEl.focus();
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter((e) => e.id !== id);
  if (editingId === id) resetForm();
  saveState();
  render();
}

function updateBudget() {
  state.budget = Math.max(0, Number(budgetEl.value) || 0);
  saveState();
  render();
}

function loadDemoData() {
  const today = new Date();
  const ym = currentMonthISO();
  const day = (n) => ym + "-" + String(Math.max(1, today.getDate() - n)).padStart(2, "0");
  const samples = [
    [180, "Food", "Chai and samosa", 0],
    [650, "Food", "Lunch with friends", 1],
    [120, "Transport", "Rickshaw to campus", 1],
    [900, "Study", "Printed notes", 2],
    [450, "Fun", "Movie ticket", 3],
    [300, "Food", "Cafeteria biryani", 4],
    [200, "Transport", "Metro card top-up", 5],
    [1500, "Study", "Programming book", 6],
    [350, "Other", "Phone load", 7],
  ];
  samples.forEach(([amount, category, note, back], i) => {
    state.expenses.push({ id: Date.now() + i, amount, category, note, date: day(back) });
  });
  if (!state.budget) {
    state.budget = 15000;
    budgetEl.value = state.budget;
  }
  viewMonth = ym;
  saveState();
  render();
}

function exportCSV() {
  // Prefix cells that start with =, +, -, @ so spreadsheets don't treat them as formulas.
  const safe = (v) => {
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const rows = [["Date", "Category", "Note", "Amount (Rs)"]];
  [...state.expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => rows.push([e.date, e.category, e.note, e.amount]));
  const csv = rows.map((r) => r.map(safe).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pocketplan-expenses.csv";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearAll() {
  if (!confirm("Delete all expenses and your budget? This can't be undone.")) return;
  state = { budget: 0, expenses: [] };
  budgetEl.value = "";
  saveState();
  resetForm();
  render();
}

// ---------- Init ----------
form.addEventListener("submit", submitExpense);
cancelBtn.addEventListener("click", () => {
  resetForm();
  render();
});
budgetEl.addEventListener("input", updateBudget);
filterEl.addEventListener("change", render);
prevMonthBtn.addEventListener("click", () => {
  viewMonth = shiftMonth(viewMonth, -1);
  render();
});
nextMonthBtn.addEventListener("click", () => {
  if (viewMonth < currentMonthISO()) {
    viewMonth = shiftMonth(viewMonth, 1);
    render();
  }
});
$("demo-btn").addEventListener("click", loadDemoData);
$("export-btn").addEventListener("click", exportCSV);
$("clear-btn").addEventListener("click", clearAll);

dateEl.value = todayISO();
budgetEl.value = state.budget || "";
render();
