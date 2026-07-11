type LogFields = Record<string, unknown>;

function stamp() {
  return new Date().toISOString();
}

function formatFields(fields?: LogFields): string {
  if (!fields || Object.keys(fields).length === 0) return "";
  try {
    return ` ${JSON.stringify(fields)}`;
  } catch {
    return " [unserializable fields]";
  }
}

/** Lightweight structured logger for the research API / graph. */
export const log = {
  info(message: string, fields?: LogFields) {
    console.log(`[${stamp()}] [info] ${message}${formatFields(fields)}`);
  },
  warn(message: string, fields?: LogFields) {
    console.warn(`[${stamp()}] [warn] ${message}${formatFields(fields)}`);
  },
  error(message: string, fields?: LogFields) {
    console.error(`[${stamp()}] [error] ${message}${formatFields(fields)}`);
  },
  node(name: string, phase: "enter" | "exit" | "route", fields?: LogFields) {
    console.log(
      `[${stamp()}] [graph:${name}] ${phase}${formatFields(fields)}`,
    );
  },
};
