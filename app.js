// config and imports
require('dotenv').config()

const http = require('http'),
      request = require('request'),
      parser = require('xml2json'),
      lodash = require('lodash')

const hostname = process.env.HOST
const port = process.env.PORT

const TFS_API_URL = process.env.TFS_API_URL
const TRUCK_ID = process.env.TRUCK_ID
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

// setup of server
const server = http.createServer((req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  res.end('Erik\'s Fire App\n')
})

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
})

// declaration of functions and app variables
let timesRequested = 0
let eriksCalls = []

const minutes = process.env.POLLING_INTERVAL_IN_MINS
const frequency = minutes * 60 * 1000

const logUpdates = (updates) => {
  if (updates.length < 1) {
    console.log('No new updates!')
    return
  }

  console.log('LOGGING NEW UPDATES!')

  updates.forEach(u => {
    console.log('UPDATE: ', u)
  })
}

const constructMessage = (updates) => {
  const update = updates[updates.length - 1]
  let msg = 'Erik is out on a call'
  if (typeof update.cross_streets === "string") {
    msg += ` near ${update.cross_streets} - ${update.prime_street}!\n`
  } else {
    msg += ` near ${update.prime_street}!\n`
  }

  msg += `Event type: ${update.event_type}\n`
  msg += `Alarm level: ${update.alarm_lev}\n\n`
  msg += 'Give him a pat on the back for keeping people safe!'

  return msg
}

const sendUpdateMessage = (updates) => {
  const options = {
    url: SLACK_WEBHOOK_URL,
    headers: {
      'Content-type': 'application/json'
    },
    method: 'POST',
    json: {
      "text": constructMessage(updates)
    }
  }

  request(options, (error, response, body) => {
    console.log('SLACK MESSAGE REQUEST SENT!')

    if (response && response.statusCode == 200) {
      console.log('Slack message sent successfully')
    }

    if (error) {
      console.log('error:', error)
    }
  })
}

const getUpdates = (updates) => {
  if (eriksCalls.length < 1 && updates.length > 0) {
    return updates
  }

  return lodash.differenceBy(updates, eriksCalls, 'event_num')
}

const updateEriksCalls = (updatedCalls) => {
  const updates = getUpdates(updatedCalls)
  logUpdates(updates)

  if (updates.length > 0) {
    sendUpdateMessage(updates)
    eriksCalls = [...eriksCalls, ...updates]
  }
}

const fetchTFSData = () => {
  request(TFS_API_URL, (error, response, body) => {
    timesRequested += 1
    console.log(`Times we've called the TFS API: ${timesRequested}`)

    if (response && response.statusCode == 200) {
      console.log('Request successful')
    }

    if (error) {
      console.log('error:', error)
    } else {
      const result = JSON.parse(parser.toJson(body))
      const relevantCalls = result.tfs_active_incidents.event.filter(e => e.units_disp.includes(TRUCK_ID))
      const updatedCalls = []

      relevantCalls.forEach(c => {
        updatedCalls.push(c)
      })

      updateEriksCalls(updatedCalls)
    }

  })
}

// app calls
fetchTFSData()

// set up polling
setInterval(() => {
  fetchTFSData()
}, frequency)