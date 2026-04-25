#!/usr/bin/env node

// Discovers devices on the local /24 and writes an HTML map.
// Run on a network you own or have permission to scan.

const os = require('os')
const dns = require('dns').promises
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

const CONCURRENCY = 32
const PING_TIMEOUT_MS = 1000
const OUTPUT_FILE = path.join(process.cwd(), 'network-map.html')

function pickInterface () {
  const ifaces = os.networkInterfaces()
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) return { name, ...a }
    }
  }
  return null
}

function subnetHosts (cidr) {
  // Only handles /24. That covers the vast majority of home/office LANs.
  const [ip, bits] = cidr.split('/')
  if (bits !== '24') throw new Error(`only /24 is supported, got /${bits}`)
  const [a, b, c] = ip.split('.').map(Number)
  const hosts = []
  for (let i = 1; i < 255; i++) hosts.push(`${a}.${b}.${c}.${i}`)
  return hosts
}

function pingCmd (ip) {
  if (process.platform === 'darwin') return `ping -c 1 -W ${PING_TIMEOUT_MS} ${ip}`
  if (process.platform === 'win32') return `ping -n 1 -w ${PING_TIMEOUT_MS} ${ip}`
  // linux uses -W in seconds
  const sec = Math.max(1, Math.round(PING_TIMEOUT_MS / 1000))
  return `ping -c 1 -W ${sec} ${ip}`
}

async function ping (ip) {
  try {
    await execAsync(pingCmd(ip), { timeout: PING_TIMEOUT_MS + 500 })
    return true
  } catch {
    return false
  }
}

async function pool (items, worker, size) {
  const results = new Array(items.length)
  let next = 0
  async function run () {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: size }, run))
  return results
}

async function readArpTable () {
  // map of ip -> mac
  const table = new Map()
  try {
    const { stdout } = await execAsync('arp -an', { timeout: 5000 })
    for (const line of stdout.split('\n')) {
      const ipMatch = line.match(/\(([\d.]+)\)/)
      const macMatch = line.match(/([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i)
      if (ipMatch && macMatch) table.set(ipMatch[1], macMatch[1].toLowerCase())
    }
  } catch (err) {
    console.warn(`warning: could not read arp table: ${err.message}`)
  }
  return table
}

async function reverseDns (ip) {
  try {
    const names = await dns.reverse(ip)
    return names[0] || null
  } catch {
    return null
  }
}

function ouiVendorHint (mac) {
  // Tiny built-in OUI hint table. Not exhaustive; just labels common vendors.
  if (!mac) return null
  const oui = mac.split(':').slice(0, 3).join(':').toLowerCase()
  const known = {
    '3c:22:fb': 'Apple',
    'a4:83:e7': 'Apple',
    'f0:18:98': 'Apple',
    'b8:27:eb': 'Raspberry Pi',
    'dc:a6:32': 'Raspberry Pi',
    'e4:5f:01': 'Raspberry Pi',
    '00:17:88': 'Philips Hue',
    '00:1a:11': 'Google',
    'd8:6c:63': 'Google',
    '18:b4:30': 'Nest',
    '50:c7:bf': 'TP-Link',
    'b0:be:76': 'TP-Link',
    '00:11:32': 'Synology',
    '00:1d:0f': 'TP-Link',
    'f0:9f:c2': 'Ubiquiti',
    '78:8a:20': 'Ubiquiti',
  }
  return known[oui] || null
}

function escapeHtml (s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

function renderHtml ({ iface, gateway, devices, scannedAt }) {
  const rows = devices.map(d => `
    <tr>
      <td><code>${escapeHtml(d.ip)}</code></td>
      <td>${escapeHtml(d.hostname || '')}</td>
      <td><code>${escapeHtml(d.mac || '')}</code></td>
      <td>${escapeHtml(d.vendor || '')}</td>
    </tr>`).join('')

  // Hub-and-spoke SVG: gateway in the middle, devices around it.
  const cx = 400, cy = 320, r = 240
  const nodes = devices.map((d, i) => {
    const a = (2 * Math.PI * i) / devices.length - Math.PI / 2
    return { ...d, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  const edges = nodes.map(n =>
    `<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" stroke="#bbb" stroke-width="1"/>`
  ).join('')
  const dots = nodes.map(n => `
    <g>
      <circle cx="${n.x}" cy="${n.y}" r="6" fill="#3b82f6"/>
      <text x="${n.x}" y="${n.y - 10}" text-anchor="middle" font-size="10" fill="#111">
        ${escapeHtml(n.hostname || n.ip)}
      </text>
    </g>`).join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Network map</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 24px; color: #111; }
  h1 { margin: 0 0 4px; }
  .meta { color: #666; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; }
  th { background: #f7f7f7; }
  svg { background: #fafafa; border: 1px solid #eee; border-radius: 8px; }
</style></head>
<body>
  <h1>Network map</h1>
  <div class="meta">
    Interface <code>${escapeHtml(iface)}</code>
    &middot; gateway <code>${escapeHtml(gateway || 'unknown')}</code>
    &middot; ${devices.length} device(s)
    &middot; scanned ${escapeHtml(scannedAt)}
  </div>
  <svg width="800" height="640" viewBox="0 0 800 640">
    ${edges}
    <circle cx="${cx}" cy="${cy}" r="14" fill="#111"/>
    <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="11" fill="#111">
      gateway ${escapeHtml(gateway || '')}
    </text>
    ${dots}
  </svg>
  <table>
    <thead><tr><th>IP</th><th>Hostname</th><th>MAC</th><th>Vendor</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`
}

async function findGateway () {
  try {
    if (process.platform === 'linux') {
      const { stdout } = await execAsync('ip route show default', { timeout: 2000 })
      const m = stdout.match(/default via ([\d.]+)/)
      return m ? m[1] : null
    }
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync('route -n get default', { timeout: 2000 })
      const m = stdout.match(/gateway:\s*([\d.]+)/)
      return m ? m[1] : null
    }
  } catch {}
  return null
}

async function main () {
  const iface = pickInterface()
  if (!iface) {
    console.error('no external IPv4 interface found')
    process.exit(1)
  }
  const cidr = iface.cidr
  console.log(`scanning ${cidr} on ${iface.name} (${iface.address})`)

  const hosts = subnetHosts(cidr)
  const alive = []
  await pool(hosts, async ip => {
    if (await ping(ip)) {
      alive.push(ip)
      process.stdout.write('.')
    }
  }, CONCURRENCY)
  process.stdout.write('\n')

  const arp = await readArpTable()
  const gateway = await findGateway()

  const devices = await Promise.all(alive.sort(ipSort).map(async ip => {
    const mac = arp.get(ip) || null
    const hostname = await reverseDns(ip)
    return { ip, mac, hostname, vendor: ouiVendorHint(mac) }
  }))

  const html = renderHtml({
    iface: `${iface.name} (${iface.address}/24)`,
    gateway,
    devices,
    scannedAt: new Date().toISOString(),
  })
  fs.writeFileSync(OUTPUT_FILE, html)

  console.log(`found ${devices.length} device(s):`)
  for (const d of devices) {
    console.log(`  ${d.ip.padEnd(15)} ${(d.mac || '-').padEnd(17)} ${d.hostname || ''} ${d.vendor ? '(' + d.vendor + ')' : ''}`)
  }
  console.log(`\nwrote ${OUTPUT_FILE}`)
}

function ipSort (a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 4; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

main().catch(err => { console.error(err); process.exit(1) })
