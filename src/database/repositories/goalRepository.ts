import { getDatabase } from '../database';

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  currency_code: string;
  icon: string;
  color: string;
  deadline: string | null;
  status: 'active' | 'completed' | 'paused';
  note: string | null;
  created_at: string;
  updated_at: string;
  currency_symbol?: string;
}

export interface GoalContribution {
  id: number;
  goal_id: number;
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
}

export interface CreateGoalDto {
  name: string;
  target_amount?: number;
  currency_code: string;
  icon: string;
  color: string;
  deadline?: string;
  note?: string;
}

export interface UpdateGoalDto {
  name: string;
  target_amount?: number;
  currency_code: string;
  icon: string;
  color: string;
  deadline?: string;
  note?: string;
}

export async function getGoals(
  status?: 'active' | 'completed' | 'paused'
): Promise<Goal[]> {
  const db = await getDatabase();
  const where = status ? 'WHERE g.status = ?' : '';
  const query = `
    SELECT g.*, c.symbol AS currency_symbol
    FROM goals g
    JOIN currencies c ON g.currency_code = c.code
    ${where}
    ORDER BY g.created_at DESC
  `;
  return db.getAllAsync<Goal>(query, status ? [status] : []);
}

export async function getGoalById(id: number): Promise<Goal | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Goal>(
    `SELECT g.*, c.symbol AS currency_symbol
     FROM goals g
     JOIN currencies c ON g.currency_code = c.code
     WHERE g.id = ?`,
    [id]
  );
}

export async function createGoal(dto: CreateGoalDto): Promise<number> {
  const db = await getDatabase();
  const safeTarget = dto.target_amount && dto.target_amount > 0 ? dto.target_amount : 0;
  const result = await db.runAsync(
    `INSERT INTO goals (name, target_amount, currency_code, icon, color, deadline, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      dto.name, safeTarget, dto.currency_code,
      dto.icon, dto.color,
      dto.deadline ?? null, dto.note ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateGoal(id: number, dto: UpdateGoalDto): Promise<void> {
  const db = await getDatabase();
  const safeTarget = dto.target_amount && dto.target_amount > 0 ? dto.target_amount : 0;
  await db.runAsync(
    `UPDATE goals
     SET name          = ?,
         target_amount = ?,
         currency_code = ?,
         icon          = ?,
         color         = ?,
         deadline      = ?,
         note          = ?,
         updated_at    = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      dto.name, safeTarget, dto.currency_code,
      dto.icon, dto.color,
      dto.deadline ?? null, dto.note ?? null,
      id,
    ]
  );
}

export async function updateGoalStatus(
  id: number,
  status: 'active' | 'completed' | 'paused'
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE goals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, id]
  );
}

export async function deleteGoal(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM goals WHERE id = ?`, [id]);
}

export async function addContribution(
  goalId: number,
  amount: number,
  date: string,
  note?: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO goal_contributions (goal_id, amount, date, note) VALUES (?, ?, ?, ?)`,
    [goalId, amount, date, note ?? null]
  );
  await db.runAsync(
    `UPDATE goals
     SET current_amount = current_amount + ?,
         updated_at     = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [amount, goalId]
  );
  // Auto-complete when target reached
  await db.runAsync(
    `UPDATE goals
     SET status = 'completed'
     WHERE id = ? AND target_amount > 0 AND current_amount >= target_amount AND status = 'active'`,
    [goalId]
  );
}

export async function deleteContribution(
  contributionId: number,
  goalId: number,
  amount: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM goal_contributions WHERE id = ?`,
    [contributionId]
  );
  await db.runAsync(
    `UPDATE goals
     SET current_amount = MAX(0, current_amount - ?),
         status         = CASE WHEN status = 'completed' THEN 'active' ELSE status END,
         updated_at     = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [amount, goalId]
  );
}

export async function getContributions(goalId: number): Promise<GoalContribution[]> {
  const db = await getDatabase();
  return db.getAllAsync<GoalContribution>(
    `SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY date DESC`,
    [goalId]
  );
}
