export function profileMissingFields(user: any) {
    const missing: string[] = [];
    if (!user.get("first_name")) missing.push("first_name");
    if (!user.get("last_name")) missing.push("last_name");
    if (!user.get("phone")) missing.push("phone");
    return missing;
}