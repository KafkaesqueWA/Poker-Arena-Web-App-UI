import { basicBot } from "./basicBot";
import { warrenBot } from "./warrenBot";
import { BotDefinition } from "./types";

export const botRegistry: BotDefinition[] = [basicBot, warrenBot];

export function getBotById(id: string): BotDefinition | undefined {
  return botRegistry.find((bot) => bot.id === id);
}

export { basicBot, warrenBot };
export type { BotDefinition } from "./types";
