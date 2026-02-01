/**
 * 前端 Logger 服务
 * 用于渲染进程的日志输出
 */

const isDev = process.env.NODE_ENV === 'development';

class Logger {
    private formatMessage(level: string, args: unknown[]): string {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
        const message = args.map(arg =>
            typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    debug(...args: unknown[]): void {
        if (isDev) {
            console.log(this.formatMessage('debug', args));
        }
    }

    info(...args: unknown[]): void {
        if (isDev) {
            console.log(this.formatMessage('info', args));
        }
    }

    warn(...args: unknown[]): void {
        console.warn(this.formatMessage('warn', args));
    }

    error(...args: unknown[]): void {
        console.error(this.formatMessage('error', args));
    }
}

export const logger = new Logger();
