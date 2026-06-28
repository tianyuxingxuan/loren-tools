import express, { type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type TimestampUnit = 'seconds' | 'milliseconds'

type ConvertRequest = {
  timestamp?: unknown
  inputUnit?: unknown
  sourceTimeZone?: unknown
  targetTimeZone?: unknown
  format?: unknown
}

type TimeView = {
  timeZone: string
  formatted: string
  readable: string
  offset: string
}

const DEFAULT_FORMAT = 'yyyy-MM-dd HH:mm:ss'
const MAX_DATE_MS = 8.64e15
const __dirname = dirname(fileURLToPath(import.meta.url))

const commonTimeZones = [
  'UTC',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Asia/Tokyo',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
]

const app = express()
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'loren-tools' })
})

app.get('/api/timezones', (_req: Request, res: Response) => {
  const supportedTimeZones = getSupportedTimeZones()
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  res.json({
    localTimeZone,
    common: mergeUnique([localTimeZone, ...commonTimeZones]).filter(isValidTimeZone),
    all: supportedTimeZones,
  })
})

app.post('/api/timestamp/convert', (req: Request, res: Response) => {
  const parsed = parseConvertRequest(req.body as ConvertRequest)

  if (!parsed.ok) {
    res.status(400).json({ message: parsed.message })
    return
  }

  const date = new Date(parsed.epochMilliseconds)
  const result = {
    input: {
      timestamp: parsed.timestamp,
      unit: parsed.inputUnit,
      sourceTimeZone: parsed.sourceTimeZone,
      targetTimeZone: parsed.targetTimeZone,
      format: parsed.format,
    },
    epochSeconds: Math.trunc(parsed.epochMilliseconds / 1000),
    epochMilliseconds: parsed.epochMilliseconds,
    utcIso: date.toISOString(),
    source: buildTimeView(date, parsed.sourceTimeZone, parsed.format),
    target: buildTimeView(date, parsed.targetTimeZone, parsed.format),
  }

  res.json(result)
})

const clientDistPath = join(__dirname, '..', 'dist')
const clientIndexPath = join(clientDistPath, 'index.html')

if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath))
}

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && existsSync(clientIndexPath)) {
    res.sendFile(clientIndexPath)
    return
  }

  next()
})

const port = parsePort(process.env.PORT)
const host = process.env.HOST || '0.0.0.0'

app.listen(port, host, () => {
  console.log(`loren-tools started: http://${host}:${port}`)
})

function parseConvertRequest(body: ConvertRequest):
  | {
      ok: true
      timestamp: string
      inputUnit: TimestampUnit
      sourceTimeZone: string
      targetTimeZone: string
      format: string
      epochMilliseconds: number
    }
  | { ok: false; message: string } {
  const timestamp = typeof body.timestamp === 'string' ? body.timestamp.trim() : ''
  const inputUnit = body.inputUnit === 'seconds' || body.inputUnit === 'milliseconds' ? body.inputUnit : null
  const sourceTimeZone = typeof body.sourceTimeZone === 'string' ? body.sourceTimeZone.trim() : ''
  const targetTimeZone = typeof body.targetTimeZone === 'string' ? body.targetTimeZone.trim() : ''
  const format = typeof body.format === 'string' && body.format.trim() ? body.format.trim() : DEFAULT_FORMAT

  if (!timestamp) {
    return { ok: false, message: '请输入时间戳' }
  }

  if (!inputUnit) {
    return { ok: false, message: '时间戳单位只支持 seconds 或 milliseconds' }
  }

  if (!Number.isFinite(Number(timestamp))) {
    return { ok: false, message: '时间戳必须是数字' }
  }

  if (!isValidTimeZone(sourceTimeZone)) {
    return { ok: false, message: '原时区不被当前运行环境支持' }
  }

  if (!isValidTimeZone(targetTimeZone)) {
    return { ok: false, message: '目标时区不被当前运行环境支持' }
  }

  if (format.length > 80) {
    return { ok: false, message: '格式模板不能超过 80 个字符' }
  }

  const timestampNumber = Number(timestamp)
  const epochMilliseconds = inputUnit === 'seconds' ? timestampNumber * 1000 : timestampNumber

  if (!Number.isFinite(epochMilliseconds) || Math.abs(epochMilliseconds) > MAX_DATE_MS) {
    return { ok: false, message: '时间戳超出可转换范围' }
  }

  return {
    ok: true,
    timestamp,
    inputUnit,
    sourceTimeZone,
    targetTimeZone,
    format,
    epochMilliseconds: Math.trunc(epochMilliseconds),
  }
}

function buildTimeView(date: Date, timeZone: string, format: string): TimeView {
  return {
    timeZone,
    formatted: formatWithPattern(date, timeZone, format),
    readable: formatWithPattern(date, timeZone, 'yyyy年MM月dd日 HH:mm:ss z'),
    offset: getOffsetLabel(date, timeZone),
  }
}

function formatWithPattern(date: Date, timeZone: string, pattern: string): string {
  const partMap = getDatePartMap(date, timeZone)
  const tokens: Record<string, string> = {
    yyyy: partMap.year,
    MM: partMap.month,
    dd: partMap.day,
    HH: partMap.hour,
    mm: partMap.minute,
    ss: partMap.second,
    SSS: partMap.fractionalSecond || '000',
    z: partMap.timeZoneName || getOffsetLabel(date, timeZone),
  }

  return pattern.replace(/yyyy|MM|dd|HH|mm|ss|SSS|z/g, (token) => tokens[token] || token)
}

function getDatePartMap(date: Date, timeZone: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hourCycle: 'h23',
      timeZoneName: 'shortOffset',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
}

function getOffsetLabel(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((item) => item.type === 'timeZoneName')

  return (part?.value || 'GMT').replace('GMT', 'UTC')
}

function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) {
    return false
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

function getSupportedTimeZones(): string[] {
  const fromRuntime =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

  return mergeUnique([...commonTimeZones, ...fromRuntime]).filter(isValidTimeZone)
}

function mergeUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value || 3000)
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 3000
}
