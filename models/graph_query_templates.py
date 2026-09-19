GRAPH_TEMPLATES = {
    "direct_connections": {
        "description": "Finds everything directly connected to a single entity (1-hop). Use for facts, attributes, and immediate relationships. (e.g., 'What did X do?', 'Who is X?', 'What does X own?')",
        "cypher": """
            MATCH (n:Entity)-[r:CONNECTED_TO]-(m:Entity) 
            WHERE ($project IS NULL OR r.project = $project)
              AND toLower(n.id) CONTAINS toLower($entity) 
            RETURN n.id AS source, r.type AS relation, m.id AS target, r.source_text AS narrative, r.project AS source_company
            LIMIT 15
        """,
        "required_params": ["entity"]
    },
    "deep_context": {
        "description": "Finds the extended network around an entity (2-hops). Use when the user asks for broad context, a deep dive, or 'Tell me everything about X's ecosystem'.",
        "cypher": """
            MATCH (n:Entity)-[r1:CONNECTED_TO]-(m:Entity)-[r2:CONNECTED_TO]-(o:Entity)
            WHERE ($project IS NULL OR (r1.project = $project AND r2.project = $project))
              AND toLower(n.id) CONTAINS toLower($entity)
            RETURN n.id AS source, r1.type AS relation1, m.id AS intermediate, r2.type AS relation2, o.id AS target, r1.source_text AS narrative1, r2.source_text AS narrative2
            LIMIT 15
        """,
        "required_params": ["entity"]
    },
    "shortest_path": {
        "description": "Finds how two different entities are connected to each other. Use when the user asks 'How is X related to Y?', 'What is the connection between X and Y?', or 'Link X to Y'.",
        "cypher": """
            MATCH (n:Entity), (m:Entity)
            WHERE ($project IS NULL OR (n.project = $project AND m.project = $project))
              AND toLower(n.id) CONTAINS toLower($entity1) AND toLower(m.id) CONTAINS toLower($entity2)
            MATCH p = shortestPath((n)-[:CONNECTED_TO*1..4]-(m))
            WHERE ALL(r IN relationships(p) WHERE $project IS NULL OR r.project = $project)
            RETURN [x IN nodes(p) | x.id] AS path_nodes, [r IN relationships(p) | r.type] AS path_relations, [r IN relationships(p) | r.source_text] AS path_narratives
            LIMIT 5
        """,
        "required_params": ["entity1", "entity2"]
    },
    "shared_connections": {
        "description": "Finds entities that are mutually connected to two target entities. Use when the user asks 'What do X and Y have in common?' or 'What connects X and Y?'.",
        "cypher": """
            MATCH (n:Entity)-[r1:CONNECTED_TO]-(common:Entity)-[r2:CONNECTED_TO]-(m:Entity)
            WHERE ($project IS NULL OR (r1.project = $project AND r2.project = $project))
              AND toLower(n.id) CONTAINS toLower($entity1) AND toLower(m.id) CONTAINS toLower($entity2)
            RETURN n.id AS entity1, r1.type AS relation1, common.id AS shared_entity, r2.type AS relation2, m.id AS entity2, r1.source_text AS narrative1, r2.source_text AS narrative2
            LIMIT 15
        """,
        "required_params": ["entity1", "entity2"]
    },
    "relationship_search": {
        "description": "Finds entities connected by a specific verb/action. Use when the user asks 'Who [action] X?' (e.g., 'Who acquired X?', 'What did X invest in?').",
        "cypher": """
            MATCH (n:Entity)-[r:CONNECTED_TO]-(m:Entity)
            WHERE ($project IS NULL OR r.project = $project)
              AND toLower(r.type) CONTAINS toLower($action_verb) AND toLower(n.id) CONTAINS toLower($entity)
            RETURN n.id AS source, r.type AS relation, m.id AS target, r.source_text AS narrative
            LIMIT 20
        """,
        "required_params": ["entity", "action_verb"]
    },
    "top_hubs": {
        "description": "Finds the most connected, important, or central entities in the graph. Use when the user asks 'Who are the key players?', 'What are the main concepts?', or 'Who is the most important?'.",
        "cypher": """
            MATCH (n:Entity)-[r:CONNECTED_TO]-()
            WHERE ($project IS NULL OR r.project = $project)
            RETURN n.id AS important_entity, count(r) AS degree_of_connection
            ORDER BY degree_of_connection DESC
            LIMIT 15
        """,
        "required_params": []
    }
}