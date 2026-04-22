if (process.env.NODE_ENV === "production") {
    throw new Error("Seeding is disabled in production");
}

import "dotenv/config";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import {
    sequelize,
    User,
    Ranch,
    RanchMember,
    Species,
    Animal,
    AnimalHealthEvent,
    AnimalActivityEvent,
    Vaccination,
    Task,
    TaskSubmission,
    InventoryItem,
    InventoryStockMovement,
    Concern,
    RanchAlert,
} from "../models";

type RanchRole = "owner" | "manager" | "worker" | "vet" | "storekeeper";

const TARGET_RANCH_SLUGS = ["greenfield-ranch", "sunrise-pastures"];
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "Password123!";
const SHOULD_CREATE_EXTRA_USERS = false;

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
}

function pickOne<T>(items: T[]): T {
    return items[randInt(0, items.length - 1)];
}

function pickMany<T>(items: T[], count: number): T[] {
    const copy = [...items];
    const picked: T[] = [];
    while (copy.length > 0 && picked.length < count) {
        const index = randInt(0, copy.length - 1);
        picked.push(copy.splice(index, 1)[0]);
    }
    return picked;
}

function maybe<T>(value: T, probability = 0.5): T | null {
    return Math.random() < probability ? value : null;
}

function daysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
}

function daysFromNow(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

function addHours(date: Date, hours: number) {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
}

function animalTag(ranchSlug: string, speciesCode: string, index: number) {
    const ranchPrefix =
        ranchSlug === "greenfield-ranch"
            ? "GR"
            : ranchSlug === "sunrise-pastures"
                ? "SP"
                : "DM";
    return `${ranchPrefix}-${speciesCode.toUpperCase()}-${String(index).padStart(4, "0")}`;
}

function fakeEmail(prefix: string, index: number) {
    return `${prefix}${index}@smartruga-demo.local`;
}

async function ensureDemoUsersAndMemberships(ranchId: string) {
    const existingMemberships = await RanchMember.findAll({
        where: { ranch_id: ranchId },
        include: [{ model: User, as: "user" }],
    } as any);

    const members = existingMemberships.map((m: any) => ({
        membership: m,
        user: m.user ?? m.User ?? null,
        role: m.get("role") as RanchRole,
    }));

    if (!SHOULD_CREATE_EXTRA_USERS) {
        return members.filter((m) => m.user);
    }

    const targetPerRole: Record<RanchRole, number> = {
        owner: 1,
        manager: 2,
        worker: 5,
        vet: 2,
        storekeeper: 2,
    };

    const roleCounters: Record<RanchRole, number> = {
        owner: members.filter((m) => m.role === "owner").length,
        manager: members.filter((m) => m.role === "manager").length,
        worker: members.filter((m) => m.role === "worker").length,
        vet: members.filter((m) => m.role === "vet").length,
        storekeeper: members.filter((m) => m.role === "storekeeper").length,
    };

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const roleProfiles: Record<RanchRole, Array<{ first: string; last: string }>> = {
        owner: [{ first: "Demo", last: "Owner" }],
        manager: [
            { first: "Grace", last: "Manager" },
            { first: "Daniel", last: "Lead" },
        ],
        worker: [
            { first: "John", last: "Worker" },
            { first: "Mary", last: "Field" },
            { first: "Paul", last: "Rancher" },
            { first: "Ruth", last: "Care" },
            { first: "David", last: "Hands" },
            { first: "Sarah", last: "Assist" },
        ],
        vet: [
            { first: "Helen", last: "Vet" },
            { first: "Mark", last: "Animalcare" },
        ],
        storekeeper: [
            { first: "Peter", last: "Store" },
            { first: "Lydia", last: "Supplies" },
        ],
    };

    for (const role of Object.keys(targetPerRole) as RanchRole[]) {
        while (roleCounters[role] < targetPerRole[role]) {
            const index = roleCounters[role] + 1;
            const profile =
                roleProfiles[role][(index - 1) % roleProfiles[role].length] || {
                    first: role,
                    last: String(index),
                };

            const email = fakeEmail(`${role}.`, index);

            let user = await User.findOne({ where: { email } } as any);
            if (!user) {
                user = await User.create({
                    id: randomUUID(),
                    first_name: profile.first,
                    last_name: profile.last,
                    email,
                    password_hash: passwordHash,
                    phone: `080${randInt(10000000, 99999999)}`,
                    platform_role: "user",
                    is_active: true,
                    image_url: null,
                    image_public_id: null,
                    deleted_at: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                } as any);
            }

            const existingMembership = await RanchMember.findOne({
                where: {
                    ranch_id: ranchId,
                    user_id: user.get("id"),
                },
            } as any);

            if (!existingMembership) {
                await RanchMember.create({
                    ranch_id: ranchId,
                    user_id: user.get("id"),
                    role,
                    status: "active",
                    created_at: new Date(),
                    updated_at: new Date(),
                } as any);
            }

            roleCounters[role] += 1;
        }
    }

    const refreshedMemberships = await RanchMember.findAll({
        where: { ranch_id: ranchId },
        include: [{ model: User, as: "user" }],
    } as any);

    return refreshedMemberships
        .map((m: any) => ({
            membership: m,
            user: m.user ?? m.User ?? null,
            role: m.get("role") as RanchRole,
        }))
        .filter((m) => m.user);
}

async function ensureSpecies() {
    const seedSpecies = [
        { name: "Cow", code: "cow" },
        { name: "Goat", code: "goat" },
        { name: "Sheep", code: "sheep" },
        { name: "Pig", code: "pig" },
        { name: "Chicken", code: "chicken" },
    ];

    const speciesRecords: any[] = [];

    for (const item of seedSpecies) {
        let species = await Species.findOne({
            where: { code: item.code },
        } as any);

        if (!species) {
            species = await Species.create({
                id: randomUUID(),
                name: item.name,
                code: item.code,
                created_at: new Date(),
                updated_at: new Date(),
            } as any);
        }

        speciesRecords.push(species);
    }

    return speciesRecords;
}

async function seedAnimals(ranchId: string, ranchSlug: string, speciesList: any[]) {
    const existingDemoAnimals = Number(
        await Animal.count({
            where: {
                ranch_id: ranchId,
                tag_number: { [Op.like]: `${ranchSlug === "greenfield-ranch" ? "GR" : "SP"}-%` },
            },
        } as any)
    );

    if (existingDemoAnimals >= 40) {
        const animals = await Animal.findAll({
            where: {
                ranch_id: ranchId,
            },
            limit: 100,
            order: [["created_at", "DESC"]],
        } as any);
        return animals;
    }

    const sexOptions = ["male", "female", "unknown"];
    const statusWeighted = [
        "active",
        "active",
        "active",
        "active",
        "active",
        "active",
        "sold",
        "deceased",
    ];

    const breedBySpecies: Record<string, string[]> = {
        cow: ["Holstein", "Jersey", "Angus", "White Fulani", "Bunaji"],
        goat: ["Boer", "Saanen", "West African Dwarf", "Red Sokoto"],
        sheep: ["Merino", "Dorper", "Yankasa"],
        pig: ["Large White", "Landrace", "Duroc"],
        chicken: ["Broiler", "Layer", "Noiler"],
    };

    const animals: any[] = [];

    for (let i = 1; i <= 50; i++) {
        const species = pickOne(speciesList);
        const speciesCode = String(species.get("code"));
        const breed = pickOne(breedBySpecies[speciesCode] || ["Mixed"]);
        const status = pickOne(statusWeighted);

        const createdAt = daysAgo(randInt(5, 200));
        const updatedAt = daysAgo(randInt(0, 20));

        const animal = await Animal.create({
            id: randomUUID(),
            public_id: randomUUID(),
            ranch_id: ranchId,
            species_id: species.get("id"),
            current_location_id: null,
            tag_number: animalTag(ranchSlug, speciesCode, i),
            rfid_tag: `982000${randInt(100000000, 999999999)}`,
            breed,
            weight:
                speciesCode === "chicken"
                    ? randFloat(1.2, 4.5)
                    : randFloat(18, 550),
            sex: pickOne(sexOptions),
            date_of_birth: daysAgo(randInt(90, 1400)),
            status,
            image_url: null,
            image_public_id: null,
            created_at: createdAt,
            updated_at: updatedAt,
        } as any);

        animals.push(animal);
    }

    return animals;
}

async function seedAnimalHealthEvents(animals: any[], members: any[]) {
    const vetsAndManagers = members.filter((m) =>
        ["owner", "manager", "vet"].includes(m.role)
    );

    const statuses = [
        "healthy",
        "healthy",
        "healthy",
        "sick",
        "recovering",
        "quarantined",
    ];

    const selectedAnimals = pickMany(animals, Math.min(30, animals.length));

    for (const animal of selectedAnimals) {
        const recorder = pickOne(vetsAndManagers).user;
        const count = randInt(1, 3);

        for (let i = 0; i < count; i++) {
            const createdAt = daysAgo(randInt(0, 60));

            await AnimalHealthEvent.create({
                id: randomUUID(),
                public_id: randomUUID(),
                animal_id: animal.get("id"),
                status: pickOne(statuses),
                notes: pickOne([
                    "Routine health check completed",
                    "Observed mild symptoms and started monitoring",
                    "Animal isolated for observation",
                    "Responding well to treatment",
                    "Recovered and returned to normal activity",
                ]),
                recorded_by: recorder.get("id"),
                created_at: createdAt,
                updated_at: createdAt,
            } as any);
        }
    }
}

async function seedAnimalActivityEvents(animals: any[], members: any[], ranchId: string) {
    const recorders = members.filter((m) =>
        ["owner", "manager", "vet"].includes(m.role)
    );

    const fields = ["weight", "breed", "tag_number", "image_url"];

    for (const animal of pickMany(animals, Math.min(20, animals.length))) {
        const recorder = pickOne(recorders).user;
        const createdAt = daysAgo(randInt(1, 40));

        await AnimalActivityEvent.create({
            id: randomUUID(),
            public_id: randomUUID(),
            ranch_id: ranchId,
            animal_id: animal.get("id"),
            event_type: "animal_update",
            field: pickOne(fields),
            from_value: pickOne(["Old value", "120", "Jersey", null]),
            to_value: pickOne(["New value", "150", "Holstein", null]),
            notes: "Demo seeded activity event",
            recorded_by: recorder.get("id"),
            created_at: createdAt,
            updated_at: createdAt,
        } as any);
    }
}

async function seedVaccinations(ranchId: string, animals: any[], members: any[]) {
    const vaccineNames = [
        "Anthrax Vaccine",
        "Foot and Mouth Vaccine",
        "PPR Vaccine",
        "Rabies Vaccine",
        "CBPP Vaccine",
    ];

    const admins = members.filter((m) =>
        ["owner", "manager", "vet"].includes(m.role)
    );

    for (const animal of pickMany(animals, Math.min(35, animals.length))) {
        const administeredAt = daysAgo(randInt(1, 180));

        let nextDueAt: Date | null = null;
        const bucket = randInt(1, 10);

        if (bucket <= 3) nextDueAt = daysAgo(randInt(1, 20));
        else if (bucket <= 5) nextDueAt = new Date();
        else nextDueAt = daysFromNow(randInt(1, 14));

        const admin = admins.length ? pickOne(admins).user : null;

        await Vaccination.create({
            id: randomUUID(),
            public_id: randomUUID(),
            ranch_id: ranchId,
            animal_id: animal.get("id"),
            vaccine_name: pickOne(vaccineNames),
            dose: pickOne(["1 ml", "2 ml", "5 ml", null]),
            administered_at: administeredAt,
            next_due_at: nextDueAt,
            administered_by: admin ? admin.get("id") : null,
            notes: "Demo vaccination record",
            created_at: administeredAt,
            updated_at: new Date(),
            updated_by: admin ? admin.get("id") : null,
            deleted_at: null,
            deleted_by: null,
            delete_reason: null,
        } as any);
    }
}

async function seedInventory(ranchId: string, members: any[]) {
    const existingDemoItems = Number(
        await InventoryItem.count({
            where: {
                ranch_id: ranchId,
                sku: { [Op.like]: "DEMO-SKU-%" },
            },
        } as any)
    );

    if (existingDemoItems >= 12) {
        const items = await InventoryItem.findAll({
            where: {
                ranch_id: ranchId,
            },
            order: [["created_at", "DESC"]],
            limit: 30,
        } as any);
        return items;
    }

    const managers = members.filter((m) =>
        ["owner", "manager", "storekeeper"].includes(m.role)
    );
    const actor = pickOne(managers).user;

    const itemsSeed = [
        ["Anthrax Vaccine", "vaccine", "dose"],
        ["Dewormer", "medicine", "bottle"],
        ["Vitamin Supplement", "supplement", "pack"],
        ["Disinfectant", "sanitation", "litre"],
        ["Protective Gloves", "consumable", "box"],
        ["Syringes", "consumable", "pack"],
        ["Antibiotics", "medicine", "pack"],
        ["Feed Additive", "feed", "bag"],
        ["Water Treatment", "sanitation", "bottle"],
        ["Bandages", "first_aid", "roll"],
        ["Tick Spray", "medicine", "bottle"],
        ["Mineral Salt", "supplement", "bag"],
    ];

    const createdItems: any[] = [];

    for (let i = 0; i < itemsSeed.length; i++) {
        const [name, category, unit] = itemsSeed[i];
        const quantity = randFloat(10, 250);
        const reorder = randFloat(5, 40);
        const createdAt = daysAgo(randInt(5, 100));
        const updatedAt = daysAgo(randInt(0, 10));

        const item = await InventoryItem.create({
            id: randomUUID(),
            public_id: randomUUID(),
            ranch_id: ranchId,
            name,
            category,
            unit,
            sku: `DEMO-SKU-${String(i + 1).padStart(3, "0")}`,
            description: `${name} seeded for frontend demo`,
            image_url: null,
            image_public_id: null,
            quantity_on_hand: quantity,
            reorder_level: reorder,
            is_active: true,
            created_by_user_id: actor.get("id"),
            updated_by_user_id: actor.get("id"),
            created_at: createdAt,
            updated_at: updatedAt,
        } as any);

        createdItems.push(item);
    }

    return createdItems;
}

async function seedInventoryMovements(ranchId: string, inventoryItems: any[], members: any[]) {
    const actors = members.filter((m) =>
        ["owner", "manager", "storekeeper"].includes(m.role)
    );

    const movementTypes = ["stock_in", "stock_out", "adjustment"];

    for (const item of inventoryItems) {
        let currentQty = Number(item.get("quantity_on_hand"));
        const movementCount = randInt(2, 5);

        for (let i = 0; i < movementCount; i++) {
            const type = pickOne(movementTypes);
            const actor = pickOne(actors).user;
            const previousQuantity = currentQty;
            const createdAt = daysAgo(randInt(0, 30));

            let quantity = randFloat(1, 20);
            let newQuantity = currentQty;

            if (type === "stock_in") {
                newQuantity = currentQty + quantity;
            } else if (type === "stock_out") {
                quantity = Math.min(quantity, currentQty);
                newQuantity = currentQty - quantity;
            } else {
                newQuantity = randFloat(2, 150);
                quantity = newQuantity;
            }

            await InventoryStockMovement.create({
                id: randomUUID(),
                public_id: randomUUID(),
                inventory_item_id: item.get("id"),
                ranch_id: ranchId,
                type,
                quantity,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                reason: pickOne([
                    "Routine stock update",
                    "Used for treatment",
                    "Restocked from supplier",
                    "Corrected count after audit",
                ]),
                reference_type: null,
                reference_public_id: null,
                recorded_by_user_id: actor.get("id"),
                created_at: createdAt,
                updated_at: createdAt,
            } as any);

            currentQty = newQuantity;
        }

        await item.update({
            quantity_on_hand: currentQty,
            updated_at: new Date(),
        });
    }
}

async function seedTasks(ranchId: string, members: any[]) {
    const existingDemoTasks = Number(
        await Task.count({
            where: {
                ranch_id: ranchId,
                title: { [Op.like]: "%#%" },
            },
        } as any)
    );

    if (existingDemoTasks >= 20) {
        const tasks = await Task.findAll({
            where: { ranch_id: ranchId },
            order: [["created_at", "DESC"]],
            limit: 50,
        } as any);
        return tasks;
    }

    const managers = members.filter((m) => ["owner", "manager"].includes(m.role));
    const assignees = members.filter((m) =>
        ["worker", "vet", "storekeeper", "manager"].includes(m.role)
    );

    const taskTitles = [
        "Inspect cattle pen",
        "Vaccinate young calves",
        "Refill medicine cabinet",
        "Check feed stock",
        "Clean isolation area",
        "Update animal records",
        "Inspect water troughs",
        "Tag new animals",
        "Prepare deworming kit",
        "Review store inventory",
        "Disinfect holding area",
        "Examine sick goat batch",
    ];

    const tasks: any[] = [];

    for (let i = 0; i < 25; i++) {
        const assigner = pickOne(managers).user;
        const assignee = pickOne(assignees).user;
        const status = pickOne([
            "pending",
            "pending",
            "in_progress",
            "completed",
            "cancelled_seed_helper",
        ]);

        const createdAt = daysAgo(randInt(0, 40));
        const dueDate = addHours(createdAt, randInt(24, 240));

        const task = await Task.create({
            id: randomUUID(),
            public_id: randomUUID(),
            ranch_id: ranchId,
            title: `${pickOne(taskTitles)} #${i + 1}`,
            description: "Demo seeded task for frontend testing",
            image_url: null,
            image_public_id: null,
            assigned_to_user_id: assignee.get("id"),
            assigned_by_user_id: assigner.get("id"),
            status: status === "cancelled_seed_helper" ? "pending" : status,
            due_date: dueDate,
            cancelled_at: status === "cancelled_seed_helper" ? daysAgo(randInt(0, 10)) : null,
            cancelled_by_user_id:
                status === "cancelled_seed_helper" ? assigner.get("id") : null,
            cancel_reason:
                status === "cancelled_seed_helper" ? "Demo cancelled task" : null,
            created_at: createdAt,
            updated_at: new Date(),
        } as any);

        tasks.push(task);
    }

    return tasks;
}

async function seedTaskSubmissions(tasks: any[], members: any[]) {
    const managers = members.filter((m) => ["owner", "manager"].includes(m.role));

    for (const task of pickMany(tasks, Math.min(18, tasks.length))) {
        if (task.get("cancelled_at")) continue;

        const existingSubmission = await TaskSubmission.findOne({
            where: { task_id: task.get("id") },
        } as any);

        if (existingSubmission) continue;

        const status = pickOne(["pending", "approved", "rejected"]);
        const reviewer = pickOne(managers).user;
        const submittedAt = daysAgo(randInt(0, 20));

        await TaskSubmission.create({
            id: randomUUID(),
            public_id: randomUUID(),
            task_id: task.get("id"),
            submitted_by_user_id: task.get("assigned_to_user_id"),
            proof_type: pickOne(["image", "scan"]),
            proof_url: "https://example.com/demo-proof.jpg",
            image_url: null,
            image_public_id: null,
            notes: "Demo seeded task submission",
            status,
            review_notes:
                status === "pending" ? null : pickOne(["Looks good", "Please rework and resubmit"]),
            reviewed_by_user_id: status === "pending" ? null : reviewer.get("id"),
            reviewed_at: status === "pending" ? null : daysAgo(randInt(0, 10)),
            created_at: submittedAt,
            updated_at: new Date(),
        } as any);

        if (status === "approved") {
            await task.update({ status: "completed" });
        } else if (status === "rejected") {
            await task.update({ status: "in_progress" });
        }
    }
}

async function seedConcerns(ranchId: string, members: any[]) {
    const existingDemoConcerns = Number(
        await Concern.count({
            where: {
                ranch_id: ranchId,
                description: "Demo seeded concern for frontend testing",
            },
        } as any)
    );

    if (existingDemoConcerns >= 15) return;

    const raisers = members.filter((m) =>
        ["worker", "vet", "storekeeper", "manager"].includes(m.role)
    );
    const resolvers = members.filter((m) => ["owner", "manager"].includes(m.role));

    const categories = [
        "health",
        "inventory",
        "animal",
        "facility",
        "security",
        "task",
        "other",
    ];

    const titles = [
        "Vaccine fridge not cooling properly",
        "Feed bag count does not match records",
        "One goat showing unusual behaviour",
        "Water supply interrupted in north pen",
        "Syringes running low in store",
        "Fence damage near isolation area",
        "Task assignment unclear for morning shift",
        "Suspected infection in calf group",
    ];

    const statuses = ["open", "open", "in_review", "resolved", "dismissed"];
    const priorities = ["low", "medium", "high", "urgent"];

    for (let i = 0; i < 18; i++) {
        const raisedBy = pickOne(raisers).user;
        const assignedTo = pickOne(resolvers).user;
        const status = pickOne(statuses);
        const createdAt = daysAgo(randInt(0, 30));

        await Concern.create({
            id: randomUUID(),
            public_id: randomUUID(),
            ranch_id: ranchId,
            raised_by_user_id: raisedBy.get("id"),
            assigned_to_user_id: maybe(assignedTo.get("id"), 0.8),
            category: pickOne(categories),
            title: `${pickOne(titles)} #${i + 1}`,
            description: "Demo seeded concern for frontend testing",
            priority: pickOne(priorities),
            status,
            entity_type: null,
            entity_public_id: null,
            image_url: null,
            image_public_id: null,
            resolution_notes:
                status === "resolved"
                    ? "Issue handled and resolved."
                    : status === "dismissed"
                        ? "Reviewed and dismissed."
                        : null,
            resolved_by_user_id:
                status === "resolved" || status === "dismissed"
                    ? assignedTo.get("id")
                    : null,
            resolved_at:
                status === "resolved" || status === "dismissed"
                    ? daysAgo(randInt(0, 5))
                    : null,
            created_at: createdAt,
            updated_at: new Date(),
        } as any);
    }
}

async function seedAlerts(ranchId: string, animals: any[], tasks: any[]) {
    const existingDemoAlerts = Number(
        await RanchAlert.count({
            where: {
                ranch_id: ranchId,
                title: { [Op.like]: "Demo alert:%" },
            },
        } as any)
    );

    if (existingDemoAlerts >= 12) return;

    const alertTypes = [
        "health_sick",
        "health_quarantined",
        "status_sold",
        "status_deceased",
        "low_stock",
        "vaccination_overdue",
        "task_created",
        "task_status_changed",
        "task_cancelled",
        "task_submission_pending_review",
        "task_submission_rejected",
        "concern_raised",
        "concern_resolved",
    ];

    for (let i = 0; i < 15; i++) {
        const alertType = pickOne(alertTypes);
        const animal = maybe(pickOne(animals), 0.4);
        const task = maybe(pickOne(tasks), 0.4);

        await RanchAlert.create({
            id: randomUUID(),
            public_id: randomUUID(),
            ranch_id: ranchId,
            animal_id: animal ? animal.get("id") : null,
            alert_type: alertType,
            title: `Demo alert: ${alertType}`,
            message: `Seeded alert for ${alertType}`,
            priority: pickOne(["low", "medium", "high"]),
            entity_type: task ? "task" : animal ? "animal" : "system",
            entity_public_id: task
                ? task.get("public_id")
                : animal
                    ? animal.get("public_id")
                    : null,
            is_read: Math.random() < 0.35,
            read_by: null,
            read_at: null,
            created_at: daysAgo(randInt(0, 15)),
        } as any);
    }
}

async function seedOneRanch(ranchSlug: string, speciesList: any[]) {
    const ranch = await Ranch.findOne({
        where: { slug: ranchSlug },
    } as any);

    if (!ranch) {
        console.log(`⚠️ Ranch with slug "${ranchSlug}" not found, skipping...`);
        return;
    }

    const ranchId = String(ranch.get("id"));

    console.log(`🌱 Seeding demo data into ranch: ${ranchSlug}`);

    const members = await ensureDemoUsersAndMemberships(ranchId);
    if (members.length === 0) {
        throw new Error(`No ranch members found or created for ${ranchSlug}.`);
    }

    const animals = await seedAnimals(ranchId, ranchSlug, speciesList);
    await seedAnimalHealthEvents(animals, members);
    await seedAnimalActivityEvents(animals, members, ranchId);
    await seedVaccinations(ranchId, animals, members);

    const inventoryItems = await seedInventory(ranchId, members);
    await seedInventoryMovements(ranchId, inventoryItems, members);

    const tasks = await seedTasks(ranchId, members);
    await seedTaskSubmissions(tasks, members);

    await seedConcerns(ranchId, members);
    await seedAlerts(ranchId, animals, tasks);

    console.log(`✅ Demo seed complete for ${ranchSlug}`);
    console.log(`Members available: ${members.length}`);
    console.log(`Animals seeded/available: ${animals.length}`);
    console.log(`Inventory items seeded: ${inventoryItems.length}`);
    console.log(`Tasks seeded: ${tasks.length}`);
    console.log("---------------------------------------------------");
}

async function main() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Seeding is disabled in production");
    }

    await sequelize.authenticate();

    const speciesList = await ensureSpecies();

    for (const ranchSlug of TARGET_RANCH_SLUGS) {
        await seedOneRanch(ranchSlug, speciesList);
    }

    console.log("✅ All requested ranch seeds completed");
    console.log(`Default demo user password: ${DEFAULT_PASSWORD}`);

    await sequelize.close();
}

main().catch(async (error) => {
    console.error("❌ Seed failed:", error);
    try {
        await sequelize.close();
    } catch { }
    process.exit(1);
});