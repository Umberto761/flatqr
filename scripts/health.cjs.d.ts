import type { IncomingMessage, ServerResponse } from "node:http";

export function healthPathname(url?: string): string;
export function isHealthPath(url?: string): boolean;
export function writeHealth(req: IncomingMessage, res: ServerResponse): void;
export function installHealthIntercept(): void;
