import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, printf } = format;

/**
 * Custom log format
 * The log format includes the timestamp, log level, and message
 * If the log level is error, the stack trace is included in the log message
 */
const customFormat = printf(({ level, message, timestamp, stack }) => {
  const formattedTimestamp = new Date(timestamp as string).toLocaleString();
  return `${formattedTimestamp} - [${level}]: ${stack || message}`;
});

const options = {
  /**
   * Log to file for production
   * Log files are stored in the logs directory
   * The log file is rotated every day and kept for 5 days, limiting the total size to 5MB
   */
  file: {
    level: 'info',
    filename: 'logs/app.log',
    handleExceptions: true,
    format: combine(timestamp(), customFormat),
    maxsize: 5242880,
    maxFiles: 5,
  },
};

/**
 * Create a logger instance with the specified options depending on the environment
 */
const devLogger = createLogger({
  format: combine(
    label({ label: 'dev' }),
    timestamp(),
    format.colorize(),
    customFormat,
  ),
  level: 'debug',
  transports: [new transports.Console()],
  exitOnError: false,
});
const prodLogger = createLogger({
  format: combine(timestamp(), customFormat),
  transports: [new transports.File(options.file)],
  exitOnError: false,
});

export const logger =
  process.env.NODE_ENV === 'production' ? prodLogger : devLogger;
