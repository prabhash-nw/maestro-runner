/** Page Object Model — base page with common helpers. */

import { MaestroClient, ExecutionResult } from "../../src";

export abstract class BasePage {
  constructor(protected readonly client: MaestroClient) {}

  async waitForAnimation(): Promise<ExecutionResult> {
    return this.client.waitForAnimationToEnd();
  }

  async hideKeyboard(strategy?: string): Promise<ExecutionResult> {
    return this.client.hideKeyboard(strategy);
  }
}
