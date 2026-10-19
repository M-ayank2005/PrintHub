import { exec } from 'child_process';
import util from 'util';
import { logger } from '../logger';

const execAsync = util.promisify(exec);

export interface DetectedPrinter {
  name: string;
  isDefault: boolean;
  isOnline: boolean;
  isColor: boolean;
  isDuplex: boolean;
  isVirtual: boolean;
  paperSizes: string[];
}

export class PrinterService {
  async getSystemPrinters(): Promise<DetectedPrinter[]> {
    try {
      const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default, CapabilityDescriptions, Capabilities, PrinterStatus, ExtendedPrinterStatus, WorkOffline, PortName, DriverName | ConvertTo-Json -Depth 3"`;
      const { stdout } = await execAsync(cmd, { timeout: 8000 });
      if (!stdout || !stdout.trim()) {
        return [];
      }

      const raw = JSON.parse(stdout);
      const list = Array.isArray(raw) ? raw : [raw];

      const printers: DetectedPrinter[] = list.map((p: any) => {
        const caps: string[] = Array.isArray(p.CapabilityDescriptions) ? p.CapabilityDescriptions : [];
        const isColor = caps.some((c: string) => /color/i.test(c));
        const isDuplex = caps.some((c: string) => /duplex/i.test(c));
        const isVirtual =
          /pdf|xps|onenote|fax|writer|document/i.test(p.Name || '') ||
          (p.PortName && /portprompt|nul/i.test(p.PortName));

        // Online if not explicitly offline and not in error state
        const isOffline = !!p.WorkOffline || p.PrinterStatus === 7 || p.ExtendedPrinterStatus === 7;

        return {
          name: p.Name,
          isDefault: !!p.Default,
          isOnline: !isOffline,
          isColor,
          isDuplex,
          isVirtual,
          paperSizes: ['A4', 'A3'],
        };
      });

      logger.info({ count: printers.length }, 'Discovered real Windows printers from spooler');
      return printers;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to query Win32_Printer from Windows spooler');
      return [];
    }
  }
}

export const printerService = new PrinterService();
