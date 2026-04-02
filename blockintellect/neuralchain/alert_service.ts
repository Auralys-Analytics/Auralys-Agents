import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export const ALERT_LEVELS = Object.freeze(["info", "warning", "critical"] as const)
export type AlertLevel = (typeof ALERT_LEVELS)[number]

export interface AlertSignal {
  title: string
  message: string
  level: AlertLevel
}

export class AlertService {
  constructor(private readonly cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal): Promise<void> {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure ?? port === 465,
        auth: { user, pass },
      })

      await transporter.sendMail({
        from,
        to,
        subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
        text: signal.message,
      })
    } catch (err) {
      console.error(`[AlertService] Failed to send email:`, err)
    }
  }

  private logConsole(signal: AlertSignal): void {
    if (!this.cfg.console) return
    const prefix = `[AlertService][${signal.level.toUpperCase()}]`
    console.log(`${prefix} ${signal.title}\n${signal.message}`)
  }

  /** Dispatch multiple alert signals */
  async dispatch(signals: AlertSignal[]): Promise<void> {
    for (const sig of signals) {
      await this.sendEmail(sig)
      this.logConsole(sig)
    }
  }
}
