import { useMemo, useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"' && quoted && text[i + 1] === '"') {
      field += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [headers, ...data] = rows
  return data.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])))
}

const tripDays = parseCsv(tripDaysCsv)
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv)

const categoryMeta = {
  lodging: { label: 'Lodging', color: '#e77952', soft: '#fae4da' },
  food: { label: 'Food', color: '#dda930', soft: '#f8edce' },
  entertainment: { label: 'Entertainment', color: '#61937d', soft: '#dcebe4' },
  travel: { label: 'Travel', color: '#355c7d', soft: '#dce5ed' },
}

const categoryOrder = Object.keys(categoryMeta)
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fullDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>
}

function MapPinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>
}

function DonutChart({ totals, selected, onSelect }) {
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0)
  let angle = -90
  const segments = categoryOrder.map((category) => {
    const start = angle
    const sweep = (totals[category] / total) * 360
    angle += sweep
    const end = angle
    const point = (degrees, radius) => {
      const radians = (degrees * Math.PI) / 180
      return [100 + radius * Math.cos(radians), 100 + radius * Math.sin(radians)]
    }
    const [x1, y1] = point(start, 76)
    const [x2, y2] = point(end, 76)
    const path = `M ${x1} ${y1} A 76 76 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`
    return { category, path }
  })

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 200 200" role="img" aria-label="Interactive spending distribution chart">
        {segments.map(({ category, path }) => (
          <path
            key={category}
            className={`donut-slice ${selected === category ? 'selected' : ''}`}
            d={path}
            fill="none"
            stroke={categoryMeta[category].color}
            strokeWidth={selected === category ? 31 : 27}
            onClick={() => onSelect(category)}
            role="button"
            tabIndex="0"
            aria-label={`${categoryMeta[category].label}: ${money.format(totals[category])}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(category)
            }}
          />
        ))}
      </svg>
      <div className="donut-center" aria-hidden="true">
        <span>Total spent</span>
        <strong>{money.format(total)}</strong>
        <small>10 days</small>
      </div>
    </div>
  )
}

export default function App() {
  const [selectedDay, setSelectedDay] = useState(tripDays[0].day_id)
  const [selectedCategory, setSelectedCategory] = useState('lodging')

  const currentDay = tripDays.find((day) => day.day_id === selectedDay)
  const currentItinerary = itinerary
    .filter((item) => item.day_id === selectedDay)
    .sort((a, b) => Number(a.item_order) - Number(b.item_order))

  const { categoryTotals, dailyTotals } = useMemo(() => {
    const totals = Object.fromEntries(categoryOrder.map((category) => [category, 0]))
    const daily = Object.fromEntries(tripDays.map((day) => [day.day_id, Object.fromEntries(categoryOrder.map((category) => [category, 0]))]))
    expenses.forEach((expense) => {
      const value = Number(expense.amount_usd)
      totals[expense.category] += value
      daily[expense.day_id][expense.category] += value
    })
    return { categoryTotals: totals, dailyTotals: daily }
  }, [])

  const selectedTotal = categoryTotals[selectedCategory]
  const maxDaily = Math.max(...tripDays.map((day) => dailyTotals[day.day_id][selectedCategory]))

  return (
    <main>
      <header className="hero">
        <nav aria-label="Journal navigation">
          <a className="brand" href="#top" aria-label="Postcards from Europe home">
            <span className="brand-mark">P</span>
            <span>Postcards<br/>from Europe</span>
          </a>
          <div className="nav-links">
            <a href="#journey">The journey</a>
            <a href="#expenses">Expenses</a>
          </div>
          <span className="trip-stamp">10 days · 10 cities</span>
        </nav>

        <div className="hero-copy" id="top">
          <p className="eyebrow">A summer travel journal · June 2026</p>
          <h1>Ten cities.<br/><em>One grand adventure.</em></h1>
          <p className="intro">From London rain to Roman sun—a daily record of the places, moments, and little discoveries that made Europe unforgettable.</p>
          <a className="text-link" href="#journey">Trace the route <ArrowIcon /></a>
        </div>
        <div className="hero-route" aria-hidden="true">LHR <span>→</span> CDG <span>→</span> BRU <span>→</span> AMS <span>→</span> BER <span>→</span> PRG <span>→</span> VIE <span>→</span> BUD <span>→</span> VCE <span>→</span> ROM</div>
      </header>

      <section className="journey-section" id="journey">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The journey</p>
            <h2>A new horizon, every day</h2>
          </div>
          <p>Select a stop to open the day’s story.</p>
        </div>

        <div className="route-scroll">
          <div className="route-track">
            {tripDays.map((day, index) => (
              <button
                className={`route-stop ${selectedDay === day.day_id ? 'active' : ''}`}
                key={day.day_id}
                onClick={() => setSelectedDay(day.day_id)}
                aria-pressed={selectedDay === day.day_id}
                aria-label={`Day ${day.day_number}, ${day.city}, ${fullDate.format(new Date(`${day.date}T00:00:00Z`))}`}
              >
                <span className="day-number">{String(day.day_number).padStart(2, '0')}</span>
                <span className="landmark-frame">
                  <img src={day.landmark_image_url} alt={day.iconic_landmark} />
                </span>
                <span className="stop-city">{day.city}</span>
                <span className="stop-date">{shortDate.format(new Date(`${day.date}T00:00:00Z`))}</span>
                {index < tripDays.length - 1 && <span className="route-line" aria-hidden="true"><i /></span>}
              </button>
            ))}
          </div>
        </div>

        <article className="day-card" aria-live="polite">
          <div className="day-card-title">
            <span className="day-badge">Day {currentDay.day_number}</span>
            <div>
              <h3>{currentDay.city} <span>— {currentDay.country}</span></h3>
              <p><MapPinIcon /> {currentDay.iconic_landmark} <i /> {fullDate.format(new Date(`${currentDay.date}T00:00:00Z`))}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Place</th><th>Activity</th></tr></thead>
              <tbody>
                {currentItinerary.map((item) => (
                  <tr key={`${item.day_id}-${item.item_order}`}>
                    <td><ClockIcon /> {item.time}</td>
                    <td>{item.place}</td>
                    <td>{item.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="expenses-section" id="expenses">
        <div className="section-heading light-heading">
          <div>
            <p className="eyebrow">The expense edit</p>
            <h2>Where the story was spent</h2>
          </div>
          <p>A look at the numbers behind the memories.</p>
        </div>

        <div className="expense-card">
          <div className="distribution-panel">
            <p className="panel-label">Overall distribution</p>
            <DonutChart totals={categoryTotals} selected={selectedCategory} onSelect={setSelectedCategory} />
            <div className="legend">
              {categoryOrder.map((category) => (
                <button key={category} className={selectedCategory === category ? 'active' : ''} onClick={() => setSelectedCategory(category)}>
                  <span className="legend-dot" style={{ background: categoryMeta[category].color }} />
                  <span>{categoryMeta[category].label}</span>
                  <strong>{money.format(categoryTotals[category])}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="comparison-panel" aria-live="polite">
            <div className="comparison-head">
              <div>
                <p className="panel-label">Daily comparison</p>
                <h3>{categoryMeta[selectedCategory].label} by destination</h3>
              </div>
              <div className="category-total" style={{ background: categoryMeta[selectedCategory].soft }}>
                <span>Category total</span>
                <strong style={{ color: categoryMeta[selectedCategory].color }}>{money.format(selectedTotal)}</strong>
              </div>
            </div>
            <div className="bars">
              {tripDays.map((day) => {
                const amount = dailyTotals[day.day_id][selectedCategory]
                return (
                  <div className="bar-row" key={day.day_id}>
                    <div className="bar-city"><span>{String(day.day_number).padStart(2, '0')}</span><strong>{day.city}</strong></div>
                    <div className="bar-track"><i style={{ width: `${(amount / maxDaily) * 100}%`, background: categoryMeta[selectedCategory].color }} /></div>
                    <strong className="bar-value">{money.format(amount)}</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <footer>
        <span>London</span><i /> <span>Rome</span>
        <p>10 days across Europe · June 2026</p>
      </footer>
    </main>
  )
}
