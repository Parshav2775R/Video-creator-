import { Router } from "express";
import crypto from "crypto";
import { pool } from "@workspace/db";

const router = Router();

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scenes: unknown[];
  video_url: string | null;
  thumbnail_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function serializeProject(row: ProjectRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    scenes: (row.scenes as unknown[]) ?? [],
    videoUrl: row.video_url ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

// List all projects
router.get("/projects", async (req, res) => {
  try {
    const result = await pool.query<ProjectRow>(
      "SELECT * FROM projects ORDER BY created_at DESC",
    );
    res.json(result.rows.map(serializeProject));
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    const message = err instanceof Error ? err.message : "Failed to list projects";
    res.status(500).json({ error: message });
  }
});

// Create a project
router.post("/projects", async (req, res) => {
  const { title, description, scenes } = req.body as {
    title?: string;
    description?: string;
    scenes?: unknown[];
  };

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  try {
    const id = crypto.randomUUID();
    const result = await pool.query<ProjectRow>(
      `INSERT INTO projects (id, title, description, status, scenes, video_url, thumbnail_url, created_at, updated_at)
       VALUES ($1, $2, $3, 'draft', $4, NULL, NULL, NOW(), NOW())
       RETURNING *`,
      [id, title, description ?? null, JSON.stringify(scenes ?? [])],
    );
    res.status(201).json(serializeProject(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    const message = err instanceof Error ? err.message : "Failed to create project";
    res.status(500).json({ error: message });
  }
});

// Get a project by ID
router.get("/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query<ProjectRow>(
      "SELECT * FROM projects WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(serializeProject(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    const message = err instanceof Error ? err.message : "Failed to get project";
    res.status(500).json({ error: message });
  }
});

// Update a project
router.patch("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body as {
    title?: string;
    description?: string;
    status?: string;
    scenes?: unknown[];
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
  };

  try {
    // Build dynamic SET clause
    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (body.title !== undefined) {
      setClauses.push(`title = $${paramIdx++}`);
      values.push(body.title);
    }
    if (body.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      values.push(body.description);
    }
    if (body.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(body.status);
    }
    if (body.scenes !== undefined) {
      setClauses.push(`scenes = $${paramIdx++}`);
      values.push(JSON.stringify(body.scenes));
    }
    if (body.videoUrl !== undefined) {
      setClauses.push(`video_url = $${paramIdx++}`);
      values.push(body.videoUrl);
    }
    if (body.thumbnailUrl !== undefined) {
      setClauses.push(`thumbnail_url = $${paramIdx++}`);
      values.push(body.thumbnailUrl);
    }

    values.push(id);
    const result = await pool.query<ProjectRow>(
      `UPDATE projects SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(serializeProject(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    const message = err instanceof Error ? err.message : "Failed to update project";
    res.status(500).json({ error: message });
  }
});

// Delete a project
router.delete("/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM projects WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    const message = err instanceof Error ? err.message : "Failed to delete project";
    res.status(500).json({ error: message });
  }
});

export default router;
