export const TRUE_RECURSIVE_RELATION_QUERY = `
  WITH RECURSIVE parent_modules AS (
    SELECT rm.*
    FROM relation_module rm
    WHERE rm.child_module_id = $1

    UNION

    SELECT rm2.*
    FROM relation_module rm2
    INNER JOIN parent_modules pm ON rm2.child_module_id = pm.parent_module_id
  ),
  child_modules AS (
    SELECT rm.*
    FROM relation_module rm
    WHERE rm.parent_module_id = $1

    UNION

    SELECT rm2.*
    FROM relation_module rm2
    INNER JOIN child_modules cm ON rm2.parent_module_id = cm.child_module_id
  ),
  all_relations AS (
    SELECT * FROM parent_modules
    UNION
    SELECT * FROM child_modules
    UNION
    SELECT * FROM relation_module 
      WHERE parent_module_id = $1 OR child_module_id = $1
  )
  SELECT DISTINCT id FROM all_relations;
`;


export const FALSE_RECURSIVE_RELATION_QUERY = `WITH RECURSIVE all_children AS (
  SELECT * FROM relation_module WHERE parent_module_id = $1

  UNION ALL

  SELECT rm.*
  FROM relation_module rm
  INNER JOIN all_children ac ON rm.parent_module_id = ac.child_module_id
)
SELECT id FROM all_children
UNION
SELECT id FROM relation_module WHERE parent_module_id = $1;

`;