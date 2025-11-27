// Helper methods for numbers
import os from "os";

/**
 * Round a number to the specified number of decimal places
 * @param num the number to round
 * @param places the number of decimals places to round to
 * @returns the rounded number
 */
export const round = (num: number, places: number): number => {
  const shift = 10 ** places;
  return Math.round(num * shift) / shift;
};

const formatBytes = (bytes: number, format: "MB" | "GB") => {
  const byteConversion = format === "MB" ? 1024 ** 2 : 1024 ** 3;
  return `${round(bytes / byteConversion, 2)} ${format}`;
};

/**
 * Log CPU & memory usage
 */
export const taskManager = () => {
  console.log("====Task Manager====");

  const totalMemory = formatBytes(os.totalmem(), "GB");
  const freeMemory = formatBytes(os.freemem(), "GB");
  const cpuCount = os.cpus().length;
  const systemUptime = round(os.uptime(), 0);
  console.log("System Information:");
  console.log(`  Total Memory: ${totalMemory}`);
  console.log(`  Free Memory: ${freeMemory}`);
  console.log(`  CPU Count: ${cpuCount}`);
  console.log(`  System Uptime: ${systemUptime} seconds`);

  const memoryUsage = process.memoryUsage();
  const residentSetSize = formatBytes(memoryUsage.rss, "MB");
  const heapTotal = formatBytes(memoryUsage.heapTotal, "MB");
  const heapUsed = formatBytes(memoryUsage.heapUsed, "MB");
  const externalMemory = formatBytes(memoryUsage.external, "MB");
  const arrayBuffers = formatBytes(memoryUsage.arrayBuffers, "MB");
  console.log("Memory Usage:");
  console.log(`  Total Memory (Resident Set Size): ${residentSetSize}`);
  console.log(`  Heap Total: ${heapTotal}`);
  console.log(`  Heap Used: ${heapUsed}`);
  console.log(`  External Memory: ${externalMemory}`);
  console.log(`  Array Buffers: ${arrayBuffers}`);

  console.log("====End Task Manager====");
};
