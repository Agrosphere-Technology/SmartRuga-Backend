"use strict";
/**
 * @openapi
 * tags:
 *   - name: Ranch Locations
 *     description: Ranch location management
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @openapi
 * components:
 *   schemas:
 *     RanchLocation:
 *       type: object
 *       properties:
 *         public_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         code:
 *           type: string
 *           nullable: true
 *         location_type:
 *           type: string
 *           enum: [barn, pen, pasture, quarantine, clinic, loading_bay, market, external, other]
 *         description:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *
 *     RanchLocationResponse:
 *       type: object
 *       properties:
 *         location:
 *           $ref: '#/components/schemas/RanchLocation'
 *
 *     RanchLocationListResponse:
 *       type: object
 *       properties:
 *         locations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RanchLocation'
 */
/**
 * @openapi
 * /api/v1/ranches/{slug}/locations:
 *   post:
 *     tags:
 *       - Ranch Locations
 *     summary: Create a ranch location
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, locationType]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *                 nullable: true
 *               locationType:
 *                 type: string
 *                 enum: [barn, pen, pasture, quarantine, clinic, loading_bay, market, external, other]
 *               description:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Location created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RanchLocationResponse'
 *
 *   get:
 *     tags:
 *       - Ranch Locations
 *     summary: List ranch locations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Locations list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RanchLocationListResponse'
 */
/**
 * @openapi
 * /api/v1/ranches/{slug}/locations/{id}:
 *   get:
 *     tags:
 *       - Ranch Locations
 *     summary: Get a ranch location
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Location details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RanchLocationResponse'
 *
 *   patch:
 *     tags:
 *       - Ranch Locations
 *     summary: Update a ranch location
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *                 nullable: true
 *               locationType:
 *                 type: string
 *                 enum: [barn, pen, pasture, quarantine, clinic, loading_bay, market, external, other]
 *               description:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Location updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RanchLocationResponse'
 */
/**
 * @openapi
 * /api/v1/ranches/{slug}/locations/{id}/animals:
 *   get:
 *     tags:
 *       - Ranch Locations
 *     summary: List animals currently assigned to a ranch location
 *     description: Returns all animals whose current location is the specified ranch location.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Animals currently in the location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 location:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *                       nullable: true
 *                     locationType:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                 animals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       publicId:
 *                         type: string
 *                         format: uuid
 *                       tagNumber:
 *                         type: string
 *                         nullable: true
 *                       rfidTag:
 *                         type: string
 *                         nullable: true
 *                       sex:
 *                         type: string
 *                       dateOfBirth:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       status:
 *                         type: string
 *                       species:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                             nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ranch or location not found
 *       500:
 *         description: Server error
 */
/**
 * @openapi
 * /api/v1/ranches/{slug}/location-inventory:
 *   get:
 *     tags:
 *       - Ranch Locations
 *     summary: Get ranch location inventory overview
 *     description: Returns ranch locations with the count of animals currently assigned to each location.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: test-wolf-ranch
 *     responses:
 *       200:
 *         description: Ranch location inventory overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLocations:
 *                   type: integer
 *                 totalAnimals:
 *                   type: integer
 *                 locations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                         nullable: true
 *                       locationType:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       isActive:
 *                         type: boolean
 *                       animalCount:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ranch not found
 *       500:
 *         description: Server error
 */
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const ranchAccess_1 = require("../middlewares/ranchAccess");
const ranchLocation_controller_1 = require("../controllers/ranchLocation.controller");
const router = (0, express_1.Router)({ mergeParams: true });
router.post("/:slug/locations", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), ranchLocation_controller_1.createRanchLocation);
router.get("/:slug/locations", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), ranchLocation_controller_1.listRanchLocations);
router.get("/:slug/locations/:id", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), ranchLocation_controller_1.getRanchLocationById);
router.patch("/:slug/locations/:id", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), ranchLocation_controller_1.updateRanchLocation);
router.get("/:slug/locations/:id/animals", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), ranchLocation_controller_1.listAnimalsInLocation);
router.get("/:slug/location-inventory", (0, auth_1.requireAuth)(), (0, ranchAccess_1.requireRanchAccess)("slug"), ranchLocation_controller_1.getRanchLocationInventory);
exports.default = router;
