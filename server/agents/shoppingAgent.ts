import { intentAgent } from "./intentAgent.js";
import { recommendationAgent } from "./recommendationAgent.js";
import { BudgetGuard } from "./budgetAgent.js";

export const shoppingAgent = {
  name: "Shopping Orchestrator",
  run: async (prompt: string) => {
    // 1. Parse Intent
    const intent = await intentAgent.run(prompt);
    
    // 2. Get Recommendations
    const productIds = await recommendationAgent.run(JSON.stringify(intent));
    
    // 3. Guard constraints
    const validation = BudgetGuard.validate(productIds, intent.budget);
    if (!validation.valid) {
      throw new Error(`Budget Guard rejected plan: ${validation.error}`);
    }

    return {
      intent,
      productIds,
      totalCost: validation.total,
      requiresApproval: true
    };
  }
};
