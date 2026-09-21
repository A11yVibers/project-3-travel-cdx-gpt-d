import { useMemo, useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const parseCsv = (text) => {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1 } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field); field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''
    } else field += char
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [headers, ...records] = rows
  return records.map((values) => Object.fromEntries(headers.map((header, i) => [header.trim(), values[i]?.trim() ?? ''])))
}

const days = parseCsv(tripDaysCsv).map((d) => ({ ...d, day_number: Number(d.day_number) }))
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv).map((e) => ({ ...e, amount_usd: Number(e.amount_usd) }))
const categories = [
  { key: 'lodging', label: 'Lodging', color: '#b85c38' }, { key: 'food', label: 'Food', color: '#e9a23b' },
  { key: 'entertainment', label: 'Entertainment', color: '#4b8378' }, { key: 'travel', label: 'Travel', color: '#395d82' },
]
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const displayDate = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))

function DonutChart({ totals, selected, onSelect }) {
  const grandTotal = totals.reduce((sum, item) => sum + item.total, 0)
  const radius = 74, circumference = 2 * Math.PI * radius
  let runningOffset = 0
  return <div className="donut-wrap">
    <svg className="donut" viewBox="0 0 200 200" aria-hidden="true">
      <circle className="donut-track" cx="100" cy="100" r={radius} />
      {totals.map((item) => { const length = item.total / grandTotal * circumference; const offset = runningOffset; runningOffset += length; return <circle key={item.key} className={`donut-slice ${selected === item.key ? 'is-active' : ''}`} cx="100" cy="100" r={radius} stroke={item.color} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} /> })}
    </svg>
    <div className="donut-total"><span>Total spent</span><strong>{money.format(grandTotal)}</strong></div>
    <div className="expense-legend" aria-label="Select an expense category">
      {totals.map((item) => <button className={`legend-item ${selected === item.key ? 'is-active' : ''}`} key={item.key} type="button" aria-pressed={selected === item.key} onClick={() => onSelect(item.key)}>
        <span className="legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" /><span><strong>{item.label}</strong><small>{money.format(item.total)} · {Math.round(item.total / grandTotal * 100)}%</small></span>
      </button>)}
    </div>
  </div>
}

export default function App() {
  const [selectedDayId, setSelectedDayId] = useState(days[0].day_id)
  const [selectedCategory, setSelectedCategory] = useState(categories[0].key)
  const selectedDay = days.find((day) => day.day_id === selectedDayId)
  const selectedItinerary = itinerary.filter((item) => item.day_id === selectedDayId)
  const categoryTotals = useMemo(() => categories.map((category) => ({ ...category, total: expenses.filter((e) => e.category === category.key).reduce((sum, e) => sum + e.amount_usd, 0) })), [])
  const dailyExpenses = useMemo(() => days.map((day) => ({ ...day, amount: expenses.filter((e) => e.day_id === day.day_id && e.category === selectedCategory).reduce((sum, e) => sum + e.amount_usd, 0) })), [selectedCategory])
  const category = categoryTotals.find((item) => item.key === selectedCategory)
  const maxDaily = Math.max(...dailyExpenses.map((item) => item.amount))

  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="hero" id="top">
      <nav className="topbar" aria-label="Primary navigation"><a className="brand" href="#top"><span aria-hidden="true">✦</span> ATLAS &amp; DAYS</a><div><a href="#journey">Journey</a><a href="#expenses">Expenses</a></div></nav>
      <div className="hero-copy"><p className="eyebrow">A summer journal · June 2026</p><h1>Ten days,<br /><em>ten cities.</em></h1><p className="intro">A daily passage through Europe—from London’s clock towers to Rome’s ancient stones.</p><a className="text-link" href="#journey">Trace the route <span aria-hidden="true">↓</span></a></div>
      <div className="hero-stats" aria-label="Trip summary"><span><strong>10</strong> days</span><span><strong>10</strong> cities</span><span><strong>8</strong> countries</span></div>
    </header>
    <main id="main-content">
      <section className="section journey-section" id="journey" aria-labelledby="journey-title">
        <div className="section-heading"><div><p className="eyebrow">01 · The journey</p><h2 id="journey-title">Follow the <em>days</em></h2></div><p>Select a city to revisit the places and moments that shaped each day.</p></div>
        <div className="journey-flow" aria-label="Ten-day journey">
          {days.map((day, index) => <div className="journey-stop" key={day.day_id}>
            <button className={`day-node ${selectedDayId === day.day_id ? 'is-active' : ''}`} type="button" aria-pressed={selectedDayId === day.day_id} aria-label={`Day ${day.day_number}, ${day.city}, ${displayDate(day.date)}. View itinerary.`} onClick={() => setSelectedDayId(day.day_id)}>
              <span className="day-number">{String(day.day_number).padStart(2, '0')}</span><span className="landmark-frame"><img src={day.landmark_image_url} alt={day.iconic_landmark} /></span><span className="city">{day.city}</span><span className="date">{displayDate(day.date)}</span>
            </button>{index < days.length - 1 && <span className="route-line" aria-hidden="true" />}
          </div>)}
        </div>
        <article className="itinerary-card" aria-live="polite" aria-labelledby="itinerary-title">
          <div className="itinerary-title-block"><p>Day {selectedDay.day_number} · {selectedDay.country}</p><h3 id="itinerary-title">A day in {selectedDay.city}</h3><span>{displayDate(selectedDay.date)}, 2026</span></div>
          <div className="table-wrap"><table><thead><tr><th scope="col">Time</th><th scope="col">Place</th><th scope="col">Activity</th></tr></thead><tbody>{selectedItinerary.map((item) => <tr key={`${item.day_id}-${item.item_order}`}><td>{item.time}</td><td>{item.place}</td><td>{item.activity}</td></tr>)}</tbody></table></div>
        </article>
      </section>
      <section className="section expense-section" id="expenses" aria-labelledby="expenses-title">
        <div className="section-heading expense-heading"><div><p className="eyebrow">02 · The spend</p><h2 id="expenses-title">Where it <em>went</em></h2></div><p>Select a category to compare spending from one destination to the next.</p></div>
        <div className="expense-panel"><DonutChart totals={categoryTotals} selected={selectedCategory} onSelect={setSelectedCategory} />
          <div className="daily-comparison" aria-live="polite"><div className="comparison-header"><div><p>10-day comparison</p><h3>{category.label} by city</h3></div><strong>{money.format(category.total)} <small>total</small></strong></div>
            <div className="bars" role="img" aria-label={`${category.label} spending by city. ${dailyExpenses.map((item) => `${item.city}: ${money.format(item.amount)}`).join(', ')}`}>
              {dailyExpenses.map((item) => <div className="bar-row" key={item.day_id}><span className="bar-city">{item.city}</span><span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ width: `${item.amount / maxDaily * 100}%`, backgroundColor: category.color }} /></span><strong>{money.format(item.amount)}</strong></div>)}
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer><span>✦</span><p>A European summer, remembered in places and moments.</p><span>2026</span></footer>
  </>
}
