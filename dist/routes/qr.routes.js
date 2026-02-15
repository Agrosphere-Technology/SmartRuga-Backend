"use strict";
// Documentation for QR routes
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @openapi
 * /a/{publicId}:
 *   get:
 *     tags: [QR]
 *     summary: Public QR scan endpoint (no auth)
 *     description: Public endpoint used by QR scanners. Returns JSON and may return HTML when opened in a browser.
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Public animal view
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnimalPublic'
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Animal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Import necessary modules and middlewares
const express_1 = require("express");
const qr_controller_1 = require("../controllers/qr.controller");
const router = (0, express_1.Router)();
// Public QR entry point (no auth for now; can be upgraded later)
router.get("/a/:publicId", qr_controller_1.qrScanAnimal);
exports.default = router;
