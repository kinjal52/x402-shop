import { db } from "../src/db.js";

const MAX_SYSTEM_BUDGET = 100.00;
const MAX_BOOKS = 5;

export class BudgetGuard {
  static validate(productIds: string[], userBudget: number): { valid: boolean; total: number; error?: string } {
    if (productIds.length > MAX_BOOKS) return { valid: false, total: 0, error: "Exceeds maximum allowed books (5)." };
    
    let total = 0;
    for (const id of productIds) {
      const product = db.prepare("SELECT price_usd FROM products WHERE id = ?").get(id) as any;
      if (!product) return { valid: false, total: 0, error: `Invalid product ID: ${id}` };
      total += product.price_usd;
    }

    if (total > userBudget) return { valid: false, total, error: `Total $${total} exceeds user budget of $${userBudget}` };
    if (total > MAX_SYSTEM_BUDGET) return { valid: false, total, error: `Total exceeds hard system limit of $${MAX_SYSTEM_BUDGET}` };

    return { valid: true, total };
  }
}
