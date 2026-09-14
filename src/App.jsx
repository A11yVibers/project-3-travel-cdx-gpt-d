import { useMemo, useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const CATEGORIES = [
  { key: 'lodging', label: 'Lodging', color: '#bf5b45' },
  { key: 'food', label: 'Food', color: '#e2a340' },
  { key: 'entertainment', label: 'Entertainment', color: '#567f70' },
  { key: 'travel', label: 'Travel', color: '#29485a' },
]

function parseCsv(text) {
  const rows = []
  let row = [], value = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(value); value = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(value); if (row.some(Boolean)) rows.push(row)
      row = []; value = ''
    } else value += char
  }
  if (value || row.length) { row.push(value); rows.push(row) }
  const [headers, ...data] = rows
  return data.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])))
}

const days = parseCsv(tripDaysCsv)
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv)
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const dateLabel = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))

function Donut({ totals, selected, onSelect }) {
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0)
  let offset = 0
  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 220 220" role="img" aria-label="Trip expense distribution">
        <circle className="donut-track" cx="110" cy="110" r="78" />
        {CATEGORIES.map((category) => {
          const length = totals[category.key] / grandTotal * 100
          const currentOffset = offset
          offset += length
          return <circle key={category.key} className={`donut-slice ${selected === category.key ? 'active' : ''}`} cx="110" cy="110" r="78" pathLength="100" stroke={category.color} strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-currentOffset} onClick={() => onSelect(category.key)} tabIndex="0" role="button" aria-label={`${category.label}: ${money.format(totals[category.key])}`} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(category.key)} />
        })}
      </svg>
      <div className="donut-center"><span>Total spent</span><strong>{money.format(grandTotal)}</strong><small>10 days</small></div>
    </div>
  )
}

export default function App() {
  const [selectedDay, setSelectedDay] = useState('D01')
  const [selectedCategory, setSelectedCategory] = useState('lodging')
  const selected = days.find((day) => day.day_id === selectedDay)
  const dayItinerary = itinerary.filter((item) => item.day_id === selectedDay)
  const totals = useMemo(() => Object.fromEntries(CATEGORIES.map(({ key }) => [key, expenses.filter((e) => e.category === key).reduce((sum, e) => sum + Number(e.amount_usd), 0)])), [])
  const selectedMeta = CATEGORIES.find((category) => category.key === selectedCategory)
  const byDay = days.map((day) => ({ ...day, amount: expenses.filter((e) => e.day_id === day.day_id && e.category === selectedCategory).reduce((sum, e) => sum + Number(e.amount_usd), 0) }))
  const maxAmount = Math.max(...byDay.map((item) => item.amount))

  return (
    <main>
      <header className="hero">
        <nav><a className="wordmark" href="#top">Roam / 26</a><div><a href="#journey">Journey</a><a href="#expenses">Expenses</a></div></nav>
        <div className="hero-copy" id="top">
          <p className="eyebrow">A summer field journal · June 2026</p>
          <h1>Ten days.<br/><em>Ten cities.</em></h1>
          <p className="intro">From London rain to Roman evenings—one new city, every day, traced across the heart of Europe.</p>
          <div className="trip-stats"><span><b>10</b> days</span><i/><span><b>9</b> countries</span><i/><span><b>1</b> unforgettable route</span></div>
        </div>
        <div className="stamp" aria-hidden="true">EUROPE<br/><b>06 · 26</b></div>
      </header>

      <section className="journey-section" id="journey">
        <div className="section-heading"><div><p className="eyebrow">01 · The journey</p><h2>Follow the route</h2></div><p>Select a city to open the day’s field notes.</p></div>
        <div className="route-scroller">
          <div className="route" role="list" aria-label="Ten day journey">
            {days.map((day) => <button type="button" role="listitem" key={day.day_id} className={`city-node ${selectedDay === day.day_id ? 'selected' : ''}`} onClick={() => setSelectedDay(day.day_id)} aria-pressed={selectedDay === day.day_id}>
              <span className="day-num">Day {String(day.day_number).padStart(2, '0')}</span>
              <span className="portrait"><img src={day.landmark_image_url} alt={day.iconic_landmark}/><span className="node-dot"/></span>
              <strong>{day.city}</strong><small>{dateLabel(day.date)} · {day.country}</small>
            </button>)}
          </div>
        </div>

        <article className="itinerary-card" aria-live="polite">
          <div className="itinerary-title"><div><span>Day {String(selected.day_number).padStart(2, '0')}</span><h3>{selected.city}, <em>{selected.country}</em></h3></div><time>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${selected.date}T12:00:00`))}</time></div>
          <div className="table-wrap"><table><thead><tr><th>Time</th><th>Place</th><th>Activity</th></tr></thead><tbody>{dayItinerary.map((item) => <tr key={item.item_order}><td>{item.time}</td><td>{item.place}</td><td>{item.activity}</td></tr>)}</tbody></table></div>
        </article>
      </section>

      <section className="expense-section" id="expenses">
        <div className="section-heading light"><div><p className="eyebrow">02 · The ledger</p><h2>Where it all went</h2></div><p>A complete look at the trip’s spending, from beds to bridges.</p></div>
        <div className="expense-grid">
          <div className="breakdown-card"><Donut totals={totals} selected={selectedCategory} onSelect={setSelectedCategory}/><div className="legend">{CATEGORIES.map((category) => <button type="button" className={selectedCategory === category.key ? 'selected' : ''} key={category.key} onClick={() => setSelectedCategory(category.key)}><i style={{ background: category.color }}/><span>{category.label}<small>{Math.round(totals[category.key] / Object.values(totals).reduce((a,b) => a+b,0) * 100)}% of trip</small></span><strong>{money.format(totals[category.key])}</strong></button>)}</div></div>
          <div className="comparison-card">
            <div className="comparison-title"><div><span style={{ color: selectedMeta.color }}>{selectedMeta.label}</span><h3>City by city</h3></div><strong>{money.format(totals[selectedCategory])}<small>category total</small></strong></div>
            <div className="bars" aria-label={`${selectedMeta.label} spending by city`}>{byDay.map((item) => <div className="bar-row" key={item.day_id}><span><b>{item.city}</b><small>Day {item.day_number}</small></span><div className="bar-track"><div className="bar-fill" style={{ width: `${item.amount / maxAmount * 100}%`, background: selectedMeta.color }}/></div><strong>{money.format(item.amount)}</strong></div>)}</div>
          </div>
        </div>
      </section>
      <footer><span>Roam / 26</span><p>10 cities · 9 countries · 1 story</p><a href="#top">Back to top ↑</a></footer>
    </main>
  )
}
