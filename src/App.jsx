import { useMemo, useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const CATEGORIES = ['lodging', 'food', 'entertainment', 'travel']

const CATEGORY_META = {
  lodging: { label: 'Lodging', color: '#cf5f42' },
  food: { label: 'Food', color: '#e7a94e' },
  entertainment: { label: 'Entertainment', color: '#4d8b7a' },
  travel: { label: 'Travel', color: '#49718f' },
}

function parseCsv(source) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value || row.length) {
    row.push(value)
    rows.push(row)
  }

  const [headers, ...data] = rows
  return data.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), cells[index]?.trim() ?? ''])),
  )
}

const tripDays = parseCsv(tripDaysCsv).sort((a, b) => Number(a.day_number) - Number(b.day_number))
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv)

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function toDate(value) {
  return new Date(`${value}T00:00:00Z`)
}

function DonutChart({ totals, selectedCategory, onSelect }) {
  const overall = CATEGORIES.reduce((sum, category) => sum + totals[category], 0)
  const radius = 74
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 200 200" role="img" aria-label="Trip expense distribution">
        <circle className="donut-track" cx="100" cy="100" r={radius} />
        {CATEGORIES.map((category) => {
          const amount = totals[category]
          const segment = (amount / overall) * circumference
          const currentOffset = offset
          offset += segment

          return (
            <circle
              key={category}
              className={`donut-slice ${selectedCategory === category ? 'is-active' : ''}`}
              cx="100"
              cy="100"
              r={radius}
              pathLength={circumference}
              stroke={CATEGORY_META[category].color}
              strokeDasharray={`${Math.max(segment - 2.5, 0)} ${circumference}`}
              strokeDashoffset={-currentOffset}
              onClick={() => onSelect(category)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(category)
                }
              }}
              role="button"
              tabIndex="0"
              aria-label={`${CATEGORY_META[category].label}: ${money.format(amount)}, ${Math.round((amount / overall) * 100)} percent`}
              aria-pressed={selectedCategory === category}
            />
          )
        })}
        <text className="donut-kicker" x="100" y="92" textAnchor="middle">TOTAL SPEND</text>
        <text className="donut-total" x="100" y="116" textAnchor="middle">{money.format(overall)}</text>
      </svg>
    </div>
  )
}

function App() {
  const [selectedDayId, setSelectedDayId] = useState(tripDays[0].day_id)
  const [selectedCategory, setSelectedCategory] = useState('lodging')

  const selectedDay = tripDays.find((day) => day.day_id === selectedDayId)
  const selectedItinerary = itinerary
    .filter((item) => item.day_id === selectedDayId)
    .sort((a, b) => Number(a.item_order) - Number(b.item_order))

  const expenseData = useMemo(() => {
    const totals = Object.fromEntries(CATEGORIES.map((category) => [category, 0]))
    const byDay = Object.fromEntries(
      tripDays.map((day) => [day.day_id, Object.fromEntries(CATEGORIES.map((category) => [category, 0]))]),
    )

    expenses.forEach((expense) => {
      const category = expense.category.toLowerCase()
      if (!CATEGORIES.includes(category) || !byDay[expense.day_id]) return
      const amount = Number(expense.amount_usd)
      totals[category] += amount
      byDay[expense.day_id][category] += amount
    })

    return { totals, byDay }
  }, [])

  const selectedMeta = CATEGORY_META[selectedCategory]
  const selectedTotal = expenseData.totals[selectedCategory]
  const categoryMaximum = Math.max(...tripDays.map((day) => expenseData.byDay[day.day_id][selectedCategory]))

  return (
    <main>
      <header className="hero">
        <nav className="topbar" aria-label="Page sections">
          <a className="brand" href="#top" aria-label="Postcard Europe home">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span>POSTCARD EUROPE</span>
          </a>
          <div className="nav-links">
            <a href="#journey">Journey</a>
            <a href="#expenses">Expenses</a>
          </div>
        </nav>

        <div className="hero-copy" id="top">
          <p className="eyebrow">01–10 JUNE 2026 · EUROPE</p>
          <h1>Ten days.<br /><em>Ten cities.</em></h1>
          <p className="hero-intro">A visual diary tracing one summer route across Europe—one city, one story, every day.</p>
          <a className="text-link" href="#journey">Follow the route <span aria-hidden="true">↓</span></a>
        </div>
        <div className="route-stamp" aria-hidden="true">
          <span>10</span>
          <small>DAYS<br />IN MOTION</small>
        </div>
      </header>

      <section className="journey-section" id="journey">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE JOURNEY</p>
            <h2>A city every day</h2>
          </div>
          <p>Select a stop to revisit the day.</p>
        </div>

        <div className="timeline-shell">
          <div className="timeline" role="list" aria-label="Ten-day European route">
            {tripDays.map((day) => {
              const active = selectedDayId === day.day_id
              return (
                <button
                  className={`day-node ${active ? 'is-active' : ''}`}
                  key={day.day_id}
                  onClick={() => setSelectedDayId(day.day_id)}
                  type="button"
                  role="listitem"
                  aria-pressed={active}
                  aria-label={`Day ${day.day_number}, ${day.city}, ${longDate.format(toDate(day.date))}`}
                >
                  <span className="day-number">DAY {String(day.day_number).padStart(2, '0')}</span>
                  <span className="landmark-frame">
                    <img src={day.landmark_image_url} alt={day.iconic_landmark} />
                  </span>
                  <span className="city-name">{day.city}</span>
                  <span className="node-date">{shortDate.format(toDate(day.date))}</span>
                </button>
              )
            })}
          </div>
        </div>

        <article className="day-detail" aria-live="polite">
          <div className="detail-summary">
            <p className="eyebrow">DAY {String(selectedDay.day_number).padStart(2, '0')} · {selectedDay.country.toUpperCase()}</p>
            <h3>{selectedDay.city}</h3>
            <p className="detail-date">{longDate.format(toDate(selectedDay.date))}</p>
            <p className="landmark-note"><span aria-hidden="true">✦</span> {selectedDay.iconic_landmark}</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Time</th><th>Place</th><th>Activity</th></tr>
              </thead>
              <tbody>
                {selectedItinerary.map((item) => (
                  <tr key={`${item.day_id}-${item.item_order}`}>
                    <td>{item.time}</td>
                    <td>{item.place}</td>
                    <td>{item.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="expense-section" id="expenses">
        <div className="section-heading expense-heading">
          <div>
            <p className="eyebrow">THE SPEND</p>
            <h2>Where it all went</h2>
          </div>
          <p>Select a category to compare each city.</p>
        </div>

        <div className="expense-dashboard">
          <div className="distribution-card">
            <DonutChart totals={expenseData.totals} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
            <div className="legend" aria-label="Expense categories">
              {CATEGORIES.map((category) => {
                const meta = CATEGORY_META[category]
                const active = selectedCategory === category
                return (
                  <button
                    className={active ? 'is-active' : ''}
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={active}
                  >
                    <span className="legend-dot" style={{ backgroundColor: meta.color }} />
                    <span className="legend-label">{meta.label}</span>
                    <strong>{money.format(expenseData.totals[category])}</strong>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="comparison-card">
            <div className="comparison-title">
              <div>
                <span className="category-swatch" style={{ backgroundColor: selectedMeta.color }} />
                <p>{selectedMeta.label} by city</p>
              </div>
              <strong>{money.format(selectedTotal)}</strong>
            </div>
            <div className="bars" aria-label={`${selectedMeta.label} spending by city`}>
              {tripDays.map((day) => {
                const amount = expenseData.byDay[day.day_id][selectedCategory]
                const width = categoryMaximum === 0 ? 0 : (amount / categoryMaximum) * 100
                return (
                  <div className="bar-row" key={day.day_id}>
                    <span className="bar-city">{day.city}</span>
                    <div className="bar-track">
                      <span className="bar-fill" style={{ width: `${width}%`, backgroundColor: selectedMeta.color }} />
                    </div>
                    <strong>{money.format(amount)}</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <footer>
        <p>10 days · 10 cities · countless stories</p>
        <span>EUROPE · 2026</span>
      </footer>
    </main>
  )
}

export default App
