const express = require("express");
const db = require("../db");
const router = express.Router();

// Get all prompts
router.get("/prompts", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, model, content, is_default, created_at, updated_at
       FROM prompts
       WHERE deleted_at IS NULL
       ORDER BY is_default DESC, name ASC`
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching prompts:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prompts",
      error: error.message
    });
  }
});

// Get a single prompt by ID
router.get("/prompts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT id, name, model, content, is_default, created_at, updated_at
       FROM prompts
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Prompt not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching prompt:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prompt",
      error: error.message
    });
  }
});

// Create a new prompt
router.post("/prompts", async (req, res) => {
  try {
    const { name, model, content, is_default } = req.body;
    
    // Validate required fields
    if (!name || !model || !content) {
      return res.status(400).json({
        success: false,
        message: "Name, model, and content are required"
      });
    }
    
    // If this prompt is set as default, unset any existing default prompts
    if (is_default) {
      await db.query(
        `UPDATE prompts SET is_default = FALSE WHERE is_default = TRUE`
      );
    }
    
    const result = await db.query(
      `INSERT INTO prompts (name, model, content, is_default)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, model, content, is_default, created_at, updated_at`,
      [name, model, content, is_default || false]
    );
    
    res.status(201).json({
      success: true,
      message: "Prompt created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error creating prompt:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create prompt",
      error: error.message
    });
  }
});

// Update an existing prompt
router.put("/prompts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, content, is_default } = req.body;
    
    // Validate required fields
    if (!name || !model || !content) {
      return res.status(400).json({
        success: false,
        message: "Name, model, and content are required"
      });
    }
    
    // If this prompt is set as default, unset any existing default prompts
    if (is_default) {
      await db.query(
        `UPDATE prompts SET is_default = FALSE WHERE is_default = TRUE`
      );
    }
    
    const result = await db.query(
      `UPDATE prompts
       SET name = $1, model = $2, content = $3, is_default = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND deleted_at IS NULL
       RETURNING id, name, model, content, is_default, created_at, updated_at`,
      [name, model, content, is_default || false, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Prompt not found"
      });
    }
    
    res.json({
      success: true,
      message: "Prompt updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating prompt:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update prompt",
      error: error.message
    });
  }
});

// Delete a prompt (soft delete)
router.delete("/prompts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the prompt is set as default
    const checkResult = await db.query(
      `SELECT is_default FROM prompts WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Prompt not found"
      });
    }
    
    // Don't allow deleting the default prompt
    if (checkResult.rows[0].is_default) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the default prompt"
      });
    }
    
    const result = await db.query(
      `UPDATE prompts
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Prompt not found"
      });
    }
    
    res.json({
      success: true,
      message: "Prompt deleted successfully",
      id: result.rows[0].id
    });
  } catch (error) {
    console.error("Error deleting prompt:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete prompt",
      error: error.message
    });
  }
});

module.exports = router;