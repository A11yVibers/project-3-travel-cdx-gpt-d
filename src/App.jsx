import { useMemo, useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

function parseCsv(csv) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    const next = csv[index + 1]
    if (char === '"' && quoted && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      if (row.some((value) => value.length)) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [headers, ...values] = rows
  return values.map((valueRow) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), valueRow[index]?.trim() ?? ''])),
  )
}

const tripDays = parseCsv(tripDaysCsv)
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv)

const categories = [
  { key: 'lodging', label: 'Lodging', color: '#c65d3a', soft: '#f6ddd2' },
  { key: 'food', label: 'Food', color: '#a67522', soft: '#f4e5bd' },
  { key: 'entertainment', label: 'Entertainment', color: '#387a67', soft: '#d4e9df' },
  { key: 'travel', label: 'Travel', color: '#416d91', soft: '#d6e6f3' },
]

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const longDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

function localDate(value) {
  return new Date(`${value}T12:00:00`)
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3.4 2" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}

function Journey({ selectedDay, onSelect }) {
  return (
    <section className="journey-section" aria-labelledby="journey-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / The route</p>
          <h2 id="journey-title">Ten days, ten cities</h2>
        </div>
        <p className="section-note">Select a stop to open the day’s field notes.</p>
      </div>

      <div className="route-scroll" aria-label="Trip route">
        <div className="route-line" aria-hidden="true" />
        <ol className="route-list">
          {tripDays.map((day) => {
            const isSelected = selectedDay.day_id === day.day_id
            return (
              <li className={isSelected ? 'route-stop selected' : 'route-stop'} key={day.day_id}>
                <button
                  className="stop-button"
                  type="button"
                  onClick={() => onSelect(day)}
                  aria-pressed={isSelected}
                  aria-label={`Day ${day.day_number}, ${day.city}, ${longDate.format(localDate(day.date))}`}
                >
                  <span className="day-chip">Day {String(day.day_number).padStart(2, '0')}</span>
                  <span className="image-ring">
                    <img src={day.landmark_image_url} alt={day.iconic_landmark} />
                  </span>
                  <span className="stop-city">{day.city}</span>
                  <span className="stop-date">{shortDate.format(localDate(day.date))}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <ItineraryPanel day={selectedDay} />
    </section>
  )
}

function ItineraryPanel({ day }) {
  const items = itinerary
    .filter((item) => item.day_id === day.day_id)
    .sort((a, b) => Number(a.item_order) - Number(b.item_order))

  return (
    <div className="itinerary-card" key={day.day_id}>
      <div className="itinerary-intro">
        <div className="itinerary-number">{String(day.day_number).padStart(2, '0')}</div>
        <div>
          <p className="itinerary-kicker">Day {day.day_number} itinerary</p>
          <h3>{day.city}, {day.country}</h3>
          <p>{longDate.format(localDate(day.date))}</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Place</th>
              <th scope="col">Activity</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.day_id}-${item.item_order}`}>
                <td><span className="time-cell"><ClockIcon />{item.time}</span></td>
                <td><span className="place-cell"><PinIcon />{item.place}</span></td>
                <td>{item.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DonutChart({ totals, selectedCategory, onSelect }) {
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0)
  const radius = 78
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="donut-area">
      <div className="donut-wrap">
        <svg className="donut" viewBox="0 0 200 200" role="group" aria-label="Overall expense distribution">
          <circle className="donut-track" cx="100" cy="100" r={radius} />
          {categories.map((category) => {
            const amount = totals[category.key]
            const segment = (amount / grandTotal) * circumference
            const currentOffset = offset
            offset += segment
            const isSelected = selectedCategory === category.key
            return (
              <circle
                key={category.key}
                className={isSelected ? 'donut-segment active' : 'donut-segment'}
                cx="100"
                cy="100"
                r={radius}
                stroke={category.color}
                strokeDasharray={`${Math.max(segment - 2, 0)} ${circumference}`}
                strokeDashoffset={-currentOffset}
                role="button"
                tabIndex="0"
                aria-label={`${category.label}: ${money.format(amount)}, ${Math.round((amount / grandTotal) * 100)} percent. Select to compare by day.`}
                aria-pressed={isSelected}
                onClick={() => onSelect(category.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(category.key)
                  }
                }}
              />
            )
          })}
        </svg>
        <div className="donut-center" aria-hidden="true">
          <span>Total spent</span>
          <strong>{money.format(grandTotal)}</strong>
          <small>10 days</small>
        </div>
      </div>

      <div className="expense-legend" aria-label="Expense categories">
        {categories.map((category) => {
          const amount = totals[category.key]
          const active = selectedCategory === category.key
          return (
            <button
              type="button"
              className={active ? 'legend-row active' : 'legend-row'}
              key={category.key}
              onClick={() => onSelect(category.key)}
              aria-pressed={active}
            >
              <span className="legend-dot" style={{ backgroundColor: category.color }} />
              <span>{category.label}</span>
              <strong>{money.format(amount)}</strong>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DailyComparison({ category, values }) {
  const categoryInfo = categories.find((item) => item.key === category)
  const max = Math.max(...values.map((item) => item.amount))
  const total = values.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="comparison" style={{ '--chart-color': categoryInfo.color, '--chart-soft': categoryInfo.soft }}>
      <div className="comparison-heading">
        <div>
          <p className="comparison-label">Daily comparison</p>
          <h3>{categoryInfo.label}</h3>
        </div>
        <div className="category-total">
          <span>Trip total</span>
          <strong>{money.format(total)}</strong>
        </div>
      </div>
      <div className="bars" role="img" aria-label={`${categoryInfo.label} spending by city over ten days`}>
        {values.map((item) => (
          <div className="bar-column" key={item.day_id}>
            <span className="bar-value">{money.format(item.amount)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${(item.amount / max) * 100}%` }} />
            </div>
            <span className="bar-city">{item.city}</span>
            <span className="bar-day">D{String(item.day_number).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Expenses() {
  const [selectedCategory, setSelectedCategory] = useState('lodging')

  const { totals, daily } = useMemo(() => {
    const categoryTotals = Object.fromEntries(categories.map((category) => [category.key, 0]))
    const perDay = Object.fromEntries(
      tripDays.map((day) => [
        day.day_id,
        Object.fromEntries(categories.map((category) => [category.key, 0])),
      ]),
    )

    expenses.forEach((expense) => {
      const amount = Number(expense.amount_usd)
      categoryTotals[expense.category] += amount
      perDay[expense.day_id][expense.category] += amount
    })

    return { totals: categoryTotals, daily: perDay }
  }, [])

  const dailyValues = tripDays.map((day) => ({
    ...day,
    amount: daily[day.day_id][selectedCategory],
  }))

  return (
    <section className="expenses-section" aria-labelledby="expenses-title">
      <div className="section-heading expense-heading">
        <div>
          <p className="eyebrow">02 / The spend</p>
          <h2 id="expenses-title">Where the money went</h2>
        </div>
        <p className="section-note">Select a slice to compare that category across the journey.</p>
      </div>
      <div className="expense-card">
        <DonutChart totals={totals} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        <DailyComparison category={selectedCategory} values={dailyValues} />
      </div>
    </section>
  )
}

export default function App() {
  const [selectedDay, setSelectedDay] = useState(tripDays[0])

  return (
    <main>
      <header className="hero">
        <div className="hero-topline">
          <span>Travel journal</span>
          <span>01—10 June 2026</span>
        </div>
        <div className="hero-content">
          <p className="hero-stamp">10 days · 10 cities · 1 unforgettable route</p>
          <h1>Europe,<br /><em>in motion.</em></h1>
          <p className="hero-copy">A visual diary of trains, cobblestones, café tables and a new skyline every morning.</p>
        </div>
        <div className="hero-route" aria-hidden="true">
          <span>London</span><i />
          <span>Paris</span><i />
          <span>Brussels</span><i />
          <span>Amsterdam</span><i />
          <span>Berlin</span><i />
          <span>Prague</span><i />
          <span>Vienna</span><i />
          <span>Budapest</span><i />
          <span>Venice</span><i />
          <span>Rome</span>
        </div>
      </header>

      <div className="page-shell">
        <Journey selectedDay={selectedDay} onSelect={setSelectedDay} />
        <Expenses />
      </div>

      <footer>
        <span>Europe / Summer 2026</span>
        <span>End of journal</span>
      </footer>
    </main>
  )
}
