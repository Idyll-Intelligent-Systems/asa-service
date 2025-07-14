/**
 * Enhanced Logger Utility for ASA Service
 * Provides colored console output and file logging
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.verboseLogging = process.env.VERBOSE_LOGGING === 'true';
        this.logFile = process.env.LOG_FILE || 'logs/app.log';
        
        // Ensure logs directory exists
        this.ensureLogDirectory();
        
        // Log levels
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        // Console colors
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m'
        };
    }
    
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.logLevel];
    }
    
    formatTimestamp() {
        return new Date().toISOString();
    }
    
    formatMessage(level, message, meta = {}) {
        const timestamp = this.formatTimestamp();
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }
    
    writeToFile(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        try {
            const logMessage = this.formatMessage(level, message, meta);
            fs.appendFileSync(this.logFile, logMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    writeToConsole(level, message, meta = {}, emoji = '') {
        if (!this.shouldLog(level)) return;
        
        const timestamp = this.formatTimestamp();
        const colorMap = {
            debug: this.colors.cyan,
            info: this.colors.blue,
            warn: this.colors.yellow,
            error: this.colors.red
        };
        
        const color = colorMap[level] || this.colors.white;
        const metaStr = Object.keys(meta).length > 0 && this.verboseLogging ? ` ${JSON.stringify(meta, null, 2)}` : '';
        
        console.log(
            `${color}${emoji} [${timestamp}] [${level.toUpperCase()}]${this.colors.reset} ${message}${metaStr}`
        );
    }
    
    debug(message, meta = {}) {
        this.writeToConsole('debug', message, meta, '🔍');
        this.writeToFile('debug', message, meta);
    }
    
    info(message, meta = {}) {
        this.writeToConsole('info', message, meta, 'ℹ️');
        this.writeToFile('info', message, meta);
    }
    
    warn(message, meta = {}) {
        this.writeToConsole('warn', message, meta, '⚠️');
        this.writeToFile('warn', message, meta);
    }
    
    error(message, meta = {}) {
        this.writeToConsole('error', message, meta, '❌');
        this.writeToFile('error', message, meta);
    }
    
    success(message, meta = {}) {
        this.writeToConsole('info', message, meta, '✅');
        this.writeToFile('info', message, meta);
    }
    
    startup(message, meta = {}) {
        this.writeToConsole('info', message, meta, '🚀');
        this.writeToFile('info', message, meta);
    }
    
    database(message, meta = {}) {
        this.writeToConsole('info', message, meta, '🗃️');
        this.writeToFile('info', message, meta);
    }
    
    api(message, meta = {}) {
        this.writeToConsole('info', message, meta, '🌐');
        this.writeToFile('info', message, meta);
    }
    
    performance(message, meta = {}) {
        this.writeToConsole('debug', message, meta, '⚡');
        this.writeToFile('debug', message, meta);
    }
    
    security(message, meta = {}) {
        this.writeToConsole('warn', message, meta, '🔒');
        this.writeToFile('warn', message, meta);
    }
    
    // Method to log HTTP requests
    request(req, res, responseTime) {
        const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`;
        const meta = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        };
        
        if (res.statusCode >= 400) {
            this.warn(message, meta);
        } else {
            this.api(message, meta);
        }
    }
    
    // Method to log database operations
    dbOperation(operation, table, duration, rowCount = null) {
        const message = `Database ${operation} on ${table} completed in ${duration}ms${rowCount ? ` (${rowCount} rows)` : ''}`;
        const meta = {
            operation,
            table,
            duration: `${duration}ms`,
            rowCount
        };
        
        this.database(message, meta);
    }
    
    // Method to log service operations
    service(serviceName, operation, duration, success = true) {
        const emoji = success ? '✅' : '❌';
        const level = success ? 'info' : 'error';
        const message = `${serviceName} ${operation} ${success ? 'completed' : 'failed'} in ${duration}ms`;
        const meta = {
            service: serviceName,
            operation,
            duration: `${duration}ms`,
            success
        };
        
        this.writeToConsole(level, message, meta, emoji);
        this.writeToFile(level, message, meta);
    }
    
    // Express middleware for request logging
    middleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                this.request(req, res, duration);
            });
            
            next();
        };
    }
    
    // Create child logger with additional context
    child(context = {}) {
        const childLogger = Object.create(this);
        childLogger.context = { ...this.context, ...context };
        
        // Override log methods to include context
        ['debug', 'info', 'warn', 'error'].forEach(level => {
            const originalMethod = this[level].bind(this);
            childLogger[level] = (message, meta = {}) => {
                originalMethod(message, { ...childLogger.context, ...meta });
            };
        });
        
        return childLogger;
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
