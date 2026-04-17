"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileMissingFields = profileMissingFields;
function profileMissingFields(user) {
    const missing = [];
    if (!user.get("first_name"))
        missing.push("first_name");
    if (!user.get("last_name"))
        missing.push("last_name");
    if (!user.get("phone"))
        missing.push("phone");
    return missing;
}
