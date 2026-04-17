"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDashboardActivity = buildDashboardActivity;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.addDays = addDays;
function buildDashboardActivity(items) {
    const grouped = [];
    const groupedUpdates = new Map();
    for (const item of items) {
        if (item.type === "animal_update") {
            const key = `${item.animal_public_id}::${new Date(item.created_at).toISOString()}`;
            if (!groupedUpdates.has(key)) {
                groupedUpdates.set(key, {
                    createdAt: item.created_at,
                    animalPublicId: item.animal_public_id,
                    animalTagNumber: item.animal_tag_number,
                    changes: [],
                });
            }
            groupedUpdates.get(key).changes.push({
                field: item.field ?? null,
                from: item.from_value ?? null,
                to: item.to_value ?? null,
            });
            continue;
        }
        let title = "Activity recorded";
        let description = "A ranch activity was recorded";
        if (item.type === "health") {
            title = "Health status updated";
            description = `Animal ${item.animal_tag_number ?? item.animal_public_id} marked as ${item.status}`;
        }
        else if (item.type === "movement") {
            title = "Animal moved";
            description = `Animal ${item.animal_tag_number ?? item.animal_public_id} movement type: ${item.movement_type}`;
        }
        else if (item.type === "vaccination") {
            title = "Vaccination recorded";
            description = `${item.vaccine_name} recorded for animal ${item.animal_tag_number ?? item.animal_public_id}`;
        }
        else if (item.type === "task_created") {
            title = "Task created";
            description = `Task "${item.task_title}" was created`;
        }
        else if (item.type === "task_submission") {
            title = "Task proof submitted";
            description = `Proof was submitted for task "${item.task_title}"`;
        }
        else if (item.type === "task_review") {
            title = "Task submission reviewed";
            description = `Submission for task "${item.task_title}" was ${item.review_status}`;
        }
        else if (item.type === "inventory_movement") {
            const movementType = item.inventory_movement_type ?? "movement";
            const itemName = item.inventory_item_name ?? "Inventory item";
            const quantity = Number(item.inventory_quantity ?? 0);
            const previousQuantity = Number(item.inventory_previous_quantity ?? 0);
            const newQuantity = Number(item.inventory_new_quantity ?? 0);
            if (movementType === "stock_in") {
                title = "Inventory stocked in";
                description = `${quantity} added to ${itemName} (${previousQuantity} → ${newQuantity})`;
            }
            else if (movementType === "stock_out") {
                title = "Inventory stocked out";
                description = `${quantity} removed from ${itemName} (${previousQuantity} → ${newQuantity})`;
            }
            else if (movementType === "adjustment") {
                title = "Inventory adjusted";
                description = `${itemName} adjusted from ${previousQuantity} to ${newQuantity}`;
            }
            else {
                title = "Inventory movement recorded";
                description = `${movementType} recorded for ${itemName}`;
            }
        }
        grouped.push({
            type: item.type,
            id: item.id,
            createdAt: item.created_at,
            animalPublicId: item.animal_public_id,
            animalTagNumber: item.animal_tag_number,
            taskPublicId: item.task_public_id,
            taskTitle: item.task_title,
            inventoryItemPublicId: item.inventory_item_public_id,
            inventoryItemName: item.inventory_item_name,
            title,
            description,
        });
    }
    for (const [key, value] of groupedUpdates.entries()) {
        grouped.push({
            type: "animal_update",
            id: key,
            createdAt: value.createdAt,
            animalPublicId: value.animalPublicId,
            animalTagNumber: value.animalTagNumber,
            title: "Animal record updated",
            description: `${value.changes.length} field${value.changes.length > 1 ? "s" : ""} updated`,
            changes: value.changes,
        });
    }
    grouped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return grouped.slice(0, 10);
}
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
