const { google } = require('googleapis')
require('dotenv').config()

const calendar = google.calendar({
  version: 'v3',
  auth: process.env.GOOGLE_CAL_API_KEY
})

const params = {
  calendarId: process.env.GOOGLE_CAL_CAL_ID
}

async function getCalendarEvents() {
  const res = await calendar.events.list({ calendarId: params.calendarId })
  return res.data.items
}

module.exports = {
  getCalendarEvents
}