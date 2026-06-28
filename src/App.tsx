import {
  ArrowRightLeft,
  Braces,
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

type ToolId = 'timestamp' | 'worldTime' | 'jsonFormatter'

type PageWidthMode = 'default' | 'wide' | 'full'

type JsonOutputView = 'edit' | 'tree'

type TimeZoneOption = {
  label: string
  value: string
}

type WorldTimeZone = TimeZoneOption & {
  id: 'utc' | 'china' | 'japan' | 'berlin' | 'sydney' | 'losAngeles'
}

const defaultFormat = 'yyyy-MM-dd HH:mm:ss'
const defaultSourceTimeZone = 'UTC'
const defaultTargetTimeZone = 'Europe/Berlin'
const pageWidthStorageKey = 'loren-tools-page-width'

const pageWidthModes: Array<{ label: string; value: PageWidthMode }> = [
  { label: '默认', value: 'default' },
  { label: '较宽', value: 'wide' },
  { label: '全宽', value: 'full' },
]

const timeZoneOptions: TimeZoneOption[] = [
  { label: 'UTC', value: 'UTC' },
  { label: '上海', value: 'Asia/Shanghai' },
  { label: '悉尼', value: 'Australia/Sydney' },
  { label: '东京', value: 'Asia/Tokyo' },
  { label: '洛杉矶', value: 'America/Los_Angeles' },
  { label: '伦敦', value: 'Europe/London' },
  { label: '柏林', value: 'Europe/Berlin' },
]

const worldTimeZones: WorldTimeZone[] = [
  { id: 'utc', label: 'UTC', value: 'UTC' },
  { id: 'china', label: '中国/上海', value: 'Asia/Shanghai' },
  { id: 'japan', label: '日本/东京', value: 'Asia/Tokyo' },
  { id: 'berlin', label: '欧洲/柏林', value: 'Europe/Berlin' },
  { id: 'sydney', label: '澳大利亚/悉尼', value: 'Australia/Sydney' },
  { id: 'losAngeles', label: '美国/洛杉矶', value: 'America/Los_Angeles' },
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
  const [jsonInput, setJsonInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [jsonOutputView, setJsonOutputView] = useState<JsonOutputView>('edit')
  const [jsonTreeVersion, setJsonTreeVersion] = useState(0)
  const [pageWidthMode, setPageWidthMode] = useState<PageWidthMode>(() => {
    const savedMode = window.localStorage.getItem(pageWidthStorageKey)
    return isPageWidthMode(savedMode) ? savedMode : 'wide'
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(pageWidthStorageKey, pageWidthMode)
  }, [pageWidthMode])

  useEffect(() => {
    const sections = [
      { id: 'timestamp-converter', tool: 'timestamp' as const },
      { id: 'world-time', tool: 'worldTime' as const },
      { id: 'json-formatter', tool: 'jsonFormatter' as const },
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
    setJsonInput('')
    setJsonOutput('')
    setJsonError('')
    setJsonOutputView('edit')
    setJsonTreeVersion(0)
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

  function handleJsonFormat() {
    const source = jsonInput.trim()

    if (!source) {
      setJsonOutput('')
      setJsonError('请输入 JSON 数据')
      return
    }

    const formatResult = formatJsonInput(source)

    if (formatResult.output) {
      setJsonOutput(formatResult.output)
      setJsonError('')
      setJsonOutputView('tree')
      setJsonTreeVersion((version) => version + 1)
    } else {
      setJsonOutput('')
      setJsonError(formatResult.error)
      setJsonOutputView('edit')
    }
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
          <button
            className={`tool-nav-item ${activeTool === 'jsonFormatter' ? 'is-active' : ''}`}
            type="button"
            aria-current={activeTool === 'jsonFormatter' ? 'page' : undefined}
            onClick={() => navigateToTool('jsonFormatter', 'json-formatter')}
          >
            <Braces size={18} />
            JSON 解析
          </button>
        </nav>

        <div className="server-pill">
          <Server size={16} />
          本地服务
        </div>
      </aside>

      <main className={`workspace width-${pageWidthMode}`}>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Time Toolkit</p>
            <h1>loren-tools</h1>
          </div>
          <div className="header-actions">
            <div className="page-width-control" aria-label="页宽设置">
              <span>页宽</span>
              <div className="page-width-options">
                {pageWidthModes.map((mode) => (
                  <button
                    className={pageWidthMode === mode.value ? 'is-selected' : ''}
                    key={mode.value}
                    type="button"
                    onClick={() => setPageWidthMode(mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="tool-section" id="timestamp-converter">
          <div className="tool-section-header has-actions">
            <div className="tool-section-title">
              <span className="section-index">01</span>
              <div>
                <p className="eyebrow">Converter</p>
                <h2>时间戳转换</h2>
              </div>
            </div>
            <div className="section-actions">
              <button className="ghost-button" type="button" onClick={() => fillCurrentTime()}>
                <Clock3 size={17} />
                当前时间
              </button>
              <button className="ghost-button" type="button" onClick={resetForm}>
                <RotateCcw size={17} />
                重置
              </button>
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

        <section className="tool-section json-tool-section" id="json-formatter">
          <div className="tool-section-header">
            <span className="section-index">03</span>
            <div>
              <p className="eyebrow">JSON Formatter</p>
              <h2>JSON 解析</h2>
            </div>
          </div>

          <div className="json-formatter-grid" aria-label="JSON 解析工具">
            <label className="json-editor-panel">
              <span>输入</span>
              <textarea
                value={jsonInput}
                onChange={(event) => {
                  setJsonInput(event.target.value)
                  setJsonOutput('')
                  setJsonError('')
                }}
                placeholder='{"name":"loren-tools","enabled":true}'
                spellCheck={false}
              />
            </label>

            <div className="json-action-column">
              <button className="primary-button json-format-button" type="button" onClick={handleJsonFormat}>
                格式化
              </button>
            </div>

            <div className="json-editor-panel">
              <div className="json-panel-header">
                <span>输出</span>
                <div className="json-view-toggle" aria-label="输出视图">
                  <button
                    className={jsonOutputView === 'edit' ? 'is-selected' : ''}
                    type="button"
                    onClick={() => setJsonOutputView('edit')}
                  >
                    编辑
                  </button>
                  <button
                    className={jsonOutputView === 'tree' ? 'is-selected' : ''}
                    type="button"
                    onClick={() => setJsonOutputView('tree')}
                  >
                    折叠
                  </button>
                </div>
              </div>

              {jsonOutputView === 'tree' && !jsonError ? (
                <JsonTreeOutput key={jsonTreeVersion} value={jsonOutput} />
              ) : (
                <textarea
                  className={jsonError ? 'has-error' : ''}
                  value={jsonError || jsonOutput}
                  onChange={(event) => {
                    setJsonOutput(event.target.value)
                    setJsonError('')
                  }}
                  placeholder="格式化后的 JSON"
                  spellCheck={false}
                />
              )}
            </div>
          </div>
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

type JsonFormatResult = {
  output: string
  error: string
}

type JsonTreeSegment =
  | {
      type: 'text'
      value: string
    }
  | {
      type: 'json'
      value: unknown
    }

function isPageWidthMode(value: string | null): value is PageWidthMode {
  return value === 'default' || value === 'wide' || value === 'full'
}

function formatJsonInput(source: string): JsonFormatResult {
  try {
    return {
      output: stringifyJson(JSON.parse(source) as unknown),
      error: '',
    }
  } catch (fullParseError) {
    const partialResult = formatEmbeddedJson(source)

    if (partialResult.output !== source) {
      return {
        output: partialResult.output,
        error: '',
      }
    }

    return {
      output: '',
      error: fullParseError instanceof Error ? fullParseError.message : 'JSON 解析失败',
    }
  }
}

function formatEmbeddedJson(source: string) {
  let output = ''
  let cursor = 0

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char !== '{' && char !== '[') {
      continue
    }

    const end = findJsonSegmentEnd(source, index)

    if (end === -1) {
      continue
    }

    const candidate = source.slice(index, end)

    try {
      output += source.slice(cursor, index)
      output += stringifyJson(JSON.parse(candidate) as unknown)
      cursor = end
      index = end - 1
    } catch {
      continue
    }
  }

  return {
    output: output + source.slice(cursor),
  }
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function parseJsonTreeSegments(source: string): JsonTreeSegment[] {
  const segments: JsonTreeSegment[] = []
  let cursor = 0

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char !== '{' && char !== '[') {
      continue
    }

    const end = findJsonSegmentEnd(source, index)

    if (end === -1) {
      continue
    }

    const candidate = source.slice(index, end)

    try {
      const parsed = JSON.parse(candidate) as unknown
      const text = source.slice(cursor, index)

      if (text) {
        segments.push({ type: 'text', value: text })
      }

      segments.push({ type: 'json', value: parsed })
      cursor = end
      index = end - 1
    } catch {
      continue
    }
  }

  const rest = source.slice(cursor)

  if (rest) {
    segments.push({ type: 'text', value: rest })
  }

  return segments
}

function findJsonSegmentEnd(source: string, start: number) {
  const stack: string[] = []
  let isInString = false
  let isEscaped = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]

    if (isInString) {
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === '"') {
        isInString = false
      }

      continue
    }

    if (char === '"') {
      isInString = true
      continue
    }

    if (char === '{') {
      stack.push('}')
      continue
    }

    if (char === '[') {
      stack.push(']')
      continue
    }

    if (char === '}' || char === ']') {
      if (stack.pop() !== char) {
        return -1
      }

      if (stack.length === 0) {
        return index + 1
      }
    }
  }

  return -1
}

function JsonTreeOutput({ value }: { value: string }) {
  const segments = parseJsonTreeSegments(value)
  const hasJson = segments.some((segment) => segment.type === 'json')

  if (!value) {
    return <div className="json-tree-view is-empty">暂无输出</div>
  }

  if (!hasJson) {
    return <pre className="json-tree-view json-tree-text">{value}</pre>
  }

  return (
    <div className="json-tree-view">
      {segments.map((segment, index) =>
        segment.type === 'json' ? (
          <JsonNode key={`json-${index}`} value={segment.value} depth={0} />
        ) : (
          <pre className="json-tree-text" key={`text-${index}`}>
            {segment.value}
          </pre>
        ),
      )}
    </div>
  )
}

function JsonNode({ label, value, depth }: { label?: string; value: unknown; depth: number }) {
  const [isOpen, setIsOpen] = useState(true)

  if (!isJsonContainer(value)) {
    return (
      <div className="json-tree-leaf" style={{ paddingLeft: depth * 16 }}>
        {label ? <span className="json-tree-key">{label}: </span> : null}
        <span className={`json-tree-value ${getJsonValueClass(value)}`}>{formatJsonLeaf(value)}</span>
      </div>
    )
  }

  const isArray = Array.isArray(value)
  const entries: Array<[string, unknown]> = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, unknown>)
  const openBracket = isArray ? '[' : '{'
  const closeBracket = isArray ? ']' : '}'

  return (
    <details
      className="json-tree-node"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      style={{ marginLeft: depth * 16 }}
    >
      <summary>
        {label ? <span className="json-tree-key">{label}: </span> : null}
        <span className="json-tree-bracket">{entries.length === 0 ? `${openBracket}${closeBracket}` : openBracket}</span>
      </summary>
      {entries.length > 0 ? (
        <>
          <div className="json-tree-children">
            {entries.map(([entryKey, entryValue]) => (
              <JsonNode depth={depth + 1} key={entryKey} label={isArray ? undefined : entryKey} value={entryValue} />
            ))}
          </div>
          <div className="json-tree-close" style={{ paddingLeft: 16 }}>
            {closeBracket}
          </div>
        </>
      ) : null}
    </details>
  )
}

function isJsonContainer(value: unknown) {
  return typeof value === 'object' && value !== null
}

function formatJsonLeaf(value: unknown) {
  return JSON.stringify(value)
}

function getJsonValueClass(value: unknown) {
  if (value === null) {
    return 'is-null'
  }

  return `is-${typeof value}`
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
      {worldTimeZones.map((zone) => {
        const clock = formatWorldClock(now, zone.value)

        return (
          <article className={`world-card world-card-${zone.id}`} key={zone.value}>
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
