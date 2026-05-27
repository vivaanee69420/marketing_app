// Raw parameterized SQL. Always called inside withOrg(tx) so RLS scopes to org.

export async function listBusinesses(tx) {
  const { rows } = await tx.query(
    `select id, name, slug, timezone, is_active, created_at
       from businesses
      order by name asc`
  );
  return rows;
}

export async function getBusiness(tx, id) {
  const { rows } = await tx.query(
    `select id, name, slug, timezone, is_active, created_at
       from businesses
      where id = $1`,
    [id]
  );
  return rows[0] || null;
}
