import { days } from "./config"
const moment = require('moment')

const end = () => moment().startOf('d') // End beginning of today
const start = () => moment().subtract(days, 'd').startOf('d') // Start 1 day ago at beginning of day
const reportHours = () => moment.duration(end().diff(start())).asHours()

// Tag single day runs as the start date, tag multi day as start_end
export const fileDateTag = () => reportHours() <= 24  ? fileStartDate() : `${fileStartDate()}_${fileEndDate()}`

// Some dates we use throughout the app in various formats
export const fileStartDate = () => start().format("YYYY-MM-DD")
export const fileEndDate = () => end().format("YYYY-MM-DD")
export const startTime = () => start().toISOString()
export const endTime = () => end().toISOString()