import {
  ArrowRightLeft,
  CalendarClock,
  Check,
  Clipboard,
  Clock3,
  Globe2,
  RotateCcw,
  Server,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import './App.css'

type TimestampUnit = 'seconds' | 'milliseconds'

type TimeView = {
  timeZone: string
  formatted: string
  offset: string
}

type ConvertResult = {
  target: TimeView
}

type ToolId = 'timestamp' | 'worldTime'

type TimeZoneOption = {
  label: string
  value: string
}

const defaultFormat = 'yyyy-MM-dd HH:mm:ss'
const defaultSourceTimeZone = 'UTC'
const defaultTargetTimeZone = 'Europe/Berlin'

const timeZoneOptions: TimeZoneOption[] = [
  { label: 'UTC', value: 'UTC' },
  { label: '上海', value: 'Asia/Shanghai' },
  { label: '悉尼', value: 'Australia/Sydney' },
  { label: '东京', value: 'Asia/Tokyo' },
  { label: '洛杉矶', value: 'America/Los_Angeles' },
  { label: '伦敦', value: 'Europe/London' },
  { label: '柏林', value: 'Europe/Berlin' },
]

function App() {
  const [timestamp, setTimestamp] = useState(() => String(Math.trunc(Date.now() / 1000)))
  const [inputUnit, setInputUnit] = useState<TimestampUnit>('seconds')
  const [sourceTimeZone, setSourceTimeZone] = useState(defaultSourceTimeZone)
  const [targetTimeZone, setTargetTimeZone] = useState(defaultTargetTimeZone)
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [activeTool, setActiveTool] = useState<ToolId>('timestamp')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const sections = [
      { id: 'timestamp-converter', tool: 'timestamp' as const },
      { id: 'world-time', tool: 'worldTime' as const },
    ]
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        if (!visibleEntry) {
          return
        }

        const visibleSection = sections.find((section) => section.id === visibleEntry.target.id)
        if (visibleSection) {
          setActiveTool(visibleSection.tool)
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0.1, 0.4, 0.7] },
    )

    sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [])

  async function handleConvert() {
    setIsLoading(true)

    try {
      const response = await fetch('/api/timestamp/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp,
          inputUnit,
          sourceTimeZone,
          targetTimeZone,
          format: defaultFormat,
        }),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.message || '转换失败')
      }

      setResult(body as ConvertResult)
      setError('')
    } catch (requestError) {
      setResult(null)
      setError(requestError instanceof Error ? requestError.message : '转换失败')
    } finally {
      setIsLoading(false)
    }
  }

  function fillCurrentTime(nextUnit = inputUnit) {
    const now = Date.now()
    setTimestamp(String(nextUnit === 'seconds' ? Math.trunc(now / 1000) : now))
    clearResult()
  }

  function resetForm() {
    setInputUnit('seconds')
    setSourceTimeZone(defaultSourceTimeZone)
    setTargetTimeZone(defaultTargetTimeZone)
    setTimestamp(String(Math.trunc(Date.now() / 1000)))
    clearResult()
  }

  function switchUnit(nextUnit: TimestampUnit) {
    setInputUnit(nextUnit)
    clearResult()
  }

  function swapTimeZones() {
    setSourceTimeZone(targetTimeZone)
    setTargetTimeZone(sourceTimeZone)
    clearResult()
  }

  function clearResult() {
    setResult(null)
    setError('')
  }

  function navigateToTool(tool: ToolId, sectionId: string) {
    setActiveTool(tool)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${sectionId}`)
  }

  return (
    <div className="app-shell">
      <aside className="tool-rail" aria-label="工具导航">
        <div className="brand">
          <img className="brand-mark" src="/logo.png" alt="loren-tools logo" />
          <div>
            <strong>loren-tools</strong>
            <span>Local Toolkit</span>
          </div>
        </div>

        <nav className="tool-nav">
          <button
            className={`tool-nav-item ${activeTool === 'timestamp' ? 'is-active' : ''}`}
            type="button"
            aria-current={activeTool === 'timestamp' ? 'page' : undefined}
            onClick={() => navigateToTool('timestamp', 'timestamp-converter')}
          >
            <CalendarClock size={18} />
            时间戳转换
          </button>
          <button
            className={`tool-nav-item ${activeTool === 'worldTime' ? 'is-active' : ''}`}
            type="button"
            aria-current={activeTool === 'worldTime' ? 'page' : undefined}
            onClick={() => navigateToTool('worldTime', 'world-time')}
          >
            <Globe2 size={18} />
            世界时间
          </button>
        </nav>

        <div className="server-pill">
          <Server size={16} />
          本地服务
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Time Toolkit</p>
            <h1>loren-tools</h1>
          </div>
          <div className="header-actions">
            <button className="ghost-button" type="button" onClick={() => fillCurrentTime()}>
              <Clock3 size={17} />
              当前时间
            </button>
            <button className="ghost-button" type="button" onClick={resetForm}>
              <RotateCcw size={17} />
              重置
            </button>
          </div>
        </header>

        <section className="tool-section" id="timestamp-converter">
          <div className="tool-section-header">
            <span className="section-index">01</span>
            <div>
              <p className="eyebrow">Converter</p>
              <h2>时间戳转换</h2>
            </div>
          </div>

          <div className="converter-grid" aria-label="时间戳转换工具">
            <form
              className="panel input-panel"
              onSubmit={(event) => {
                event.preventDefault()
                void handleConvert()
              }}
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Input</p>
                  <h2>输入</h2>
                </div>
              </div>

              <label className="field">
                <span>时间戳</span>
                <div className="input-with-action">
                  <input
                    inputMode="decimal"
                    value={timestamp}
                    onChange={(event) => {
                      setTimestamp(event.target.value)
                      clearResult()
                    }}
                    placeholder={inputUnit === 'milliseconds' ? '1782564692123' : '1782564692'}
                  />
                  <div className="unit-toggle" aria-label="时间戳单位">
                    <button
                      className={inputUnit === 'milliseconds' ? 'is-selected' : ''}
                      type="button"
                      onClick={() => switchUnit('milliseconds')}
                    >
                      毫秒
                    </button>
                    <button
                      className={inputUnit === 'seconds' ? 'is-selected' : ''}
                      type="button"
                      onClick={() => switchUnit('seconds')}
                    >
                      秒
                    </button>
                  </div>
                </div>
              </label>

              <div className="timezone-row">
                <TimeZoneField
                  label="原时区"
                  value={sourceTimeZone}
                  onChange={(value) => {
                    setSourceTimeZone(value)
                    clearResult()
                  }}
                  options={timeZoneOptions}
                />
                <button
                  className="swap-button"
                  title="交换时区"
                  type="button"
                  onClick={swapTimeZones}
                  aria-label="交换原时区和目标时区"
                >
                  <ArrowRightLeft size={18} />
                </button>
                <TimeZoneField
                  label="目标时区"
                  value={targetTimeZone}
                  onChange={(value) => {
                    setTargetTimeZone(value)
                    clearResult()
                  }}
                  options={timeZoneOptions}
                />
              </div>

              <button className="primary-button" type="submit" disabled={isLoading}>
                转换
              </button>
            </form>

            <section className="panel result-panel" aria-label="转换结果">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Output</p>
                  <h2>结果</h2>
                </div>
                <span className={`status-dot ${isLoading ? 'is-loading' : ''}`}>
                  {isLoading ? '转换中' : result ? '已转换' : '待转换'}
                </span>
              </div>

              {error ? (
                <div className="error-box">{error}</div>
              ) : result ? (
                <ResultView result={result} />
              ) : (
                <div className="empty-state">输入时间戳后点击转换，或在输入框内按 Enter</div>
              )}
            </section>
          </div>
        </section>

        <section className="tool-section world-time-section" id="world-time">
          <div className="tool-section-header">
            <span className="section-index">02</span>
            <div>
              <p className="eyebrow">World Time</p>
              <h2>世界时间</h2>
            </div>
          </div>

          <WorldTimeGrid now={now} />
        </section>
      </main>
    </div>
  )
}

type TimeZoneFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}

function TimeZoneField({ label, value, onChange, options }: TimeZoneFieldProps) {
  return (
    <label className="field timezone-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((zone) => (
          <option key={zone.value} value={zone.value}>
            {zone.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function WorldTimeGrid({ now }: { now: Date }) {
  return (
    <div className="world-grid" aria-label="世界时间">
      {timeZoneOptions.map((zone) => {
        const clock = formatWorldClock(now, zone.value)

        return (
          <article className="world-card" key={zone.value}>
            <div className="world-card-header">
              <span>{zone.label}</span>
              <small>{clock.offset}</small>
            </div>
            <time>{clock.time}</time>
            <p>{clock.date}</p>
          </article>
        )
      })}
    </div>
  )
}

function formatWorldClock(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('zh-CN', {
      timeZone,
      month: 'numeric',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const hour = Number(parts.hour)

  return {
    time: `${parts.hour}:${parts.minute}`,
    date: `${parts.month}月${parts.day}日${parts.weekday}（${getDayPeriod(hour)}）`,
    offset: getOffsetLabel(date, timeZone),
  }
}

function getDayPeriod(hour: number) {
  if (hour < 6) {
    return '凌晨'
  }

  if (hour < 12) {
    return '上午'
  }

  if (hour < 18) {
    return '下午'
  }

  return '晚上'
}

function getOffsetLabel(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((item) => item.type === 'timeZoneName')

  return (part?.value || 'GMT').replace('GMT', 'UTC')
}

function ResultView({ result }: { result: ConvertResult }) {
  return (
    <div className="result-content">
      <div className="simple-result">
        <span>转换结果</span>
        <output>{result.target.formatted}</output>
        <small>
          {result.target.timeZone} {result.target.offset}
        </small>
        <CopyButton value={result.target.formatted} />
      </div>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await copyText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button className="copy-button" title="复制" type="button" onClick={copy} aria-label="复制">
      {copied ? <Check size={16} /> : <Clipboard size={16} />}
      <span>{copied ? '已复制' : '复制'}</span>
    </button>
  )
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export default App
