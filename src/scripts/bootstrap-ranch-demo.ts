import axios from "axios";

const BASE_URL = "https://smartruga-api-d11b7da5a7fa.herokuapp.com/api/v1";

type RanchConfig = {
    slug: string;
    ownerToken: string;
    managerToken: string;
    workerToken: string;
    vetToken: string;
    storekeeperToken: string;
};

const ranches: RanchConfig[] = [
    {
        slug: "sunrise-pastures",
        ownerToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4MDI1Zjk4OS1jZGE0LTQ0ZjEtYjc5OC04YmY2Zjg5OTY1OWYiLCJwbGF0Zm9ybVJvbGUiOiJhZG1pbiIsImlhdCI6MTc3Njg1MTgyMCwiZXhwIjoxNzc2ODgwNjIwfQ.2gtudghpv3IUFUYXbIflSpYs1oVJDNgMCebpeIoBw5E",
        managerToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZGU5NWJjNy00N2E0LTQyNWEtYTZjNS0xYzNkMzdiNjExYzciLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUxODgyLCJleHAiOjE3NzY4ODA2ODJ9.bCWcB7R4zD05Y_CzhgllIvvcH5I7LVOyVLwwnmDAsno",
        workerToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NzU2ODZjZC1hYjJjLTRlODUtYjlkMC1lNmExNGFhYTEzNmEiLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUxOTIxLCJleHAiOjE3NzY4ODA3MjF9.pdeTMtpJ_1COQw-hfC1UfDb5kBbst_85RObeCVzs4gg",
        vetToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGYyYjQyYy03YjE5LTRhY2YtOTkyOS04YjJlODk4YTRlNzgiLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUxOTkwLCJleHAiOjE3NzY4ODA3OTB9.vwu5s3U_tEU3HZDMCOgrx2KPRKepIyKES3SnILsVh8Q",
        storekeeperToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyODBjNGE1ZS1iNDk3LTQ5NWItOTg0Ny05MTdhMGQ0M2NlMjMiLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUyMDQzLCJleHAiOjE3NzY4ODA4NDN9.2m2S_nu0UFfDIAL93HO-VMqSr1fQjLZjKVEOUuZfiVs",
    },
    {
        slug: "greenfield-ranch",
        ownerToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwOGYxMDYyNy04MTQxLTQwMDYtYjkxMi04YzlhMmM5MjU0NGMiLCJwbGF0Zm9ybVJvbGUiOiJhZG1pbiIsImlhdCI6MTc3Njg1MjA5MywiZXhwIjoxNzc2ODgwODkzfQ.mmHyNTIEsf4MKCA8X1Meg7t6eS-uiGRixZoKwOZYnOU",
        managerToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyY2FhMTFiOC0yY2E2LTRmMzItOGYzMi1lMTE2YTg2MDc0YzEiLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUyMTM1LCJleHAiOjE3NzY4ODA5MzV9.ZxtUc7f6pgZtbQKMnZdc7cXsvQv_aeGkDK0GmdkOVWg",
        workerToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MjE5MzYxZS1kOWVmLTQzODAtODY3Yi1lYjY2MjM3ZWMxMzkiLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUyMTgzLCJleHAiOjE3NzY4ODA5ODN9.RuzAgSIFGFXjC15nzi-brlUjrQgL3QBeHl73cvV7ezs",
        vetToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiZTlhZTkwZC1jYmQ1LTQ4NTAtYTM3ZC01NjBlYTNhYmNiYzkiLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUyMjI2LCJleHAiOjE3NzY4ODEwMjZ9.zKa9iZxEcUHwxzAlFdCFwTj8o_cxb8E5_mrsfUCsU2s",
        storekeeperToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxOTE3ZTBmMi0yYzU5LTRmNmEtODg2MS0zZDY4NmRlZTI5N2IiLCJwbGF0Zm9ybVJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2ODUyMjcyLCJleHAiOjE3NzY4ODEwNzJ9.G23IC2qO4Kze3H7r1r0NR0FfNyMUx1w0KijBirMDttM",
    },
];

function api(token: string) {
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
}

async function getRanchMembers(token: string, slug: string) {
    const res = await api(token).get(`/ranches/${slug}/members`);
    return res.data?.data?.members ?? [];
}

function resolveUserPublicId(member: any) {
    return (
        member?.user?.publicId ??
        member?.user?.public_id ??
        member?.user?.id ??
        member?.publicId ??
        member?.id
    );
}

async function createExtraTasks(ranch: RanchConfig) {
    const members = await getRanchMembers(ranch.ownerToken, ranch.slug);

    const worker = members.find((m: any) => m.ranchRole === "worker" || m.role === "worker");
    const vet = members.find((m: any) => m.ranchRole === "vet" || m.role === "vet");
    const storekeeper = members.find(
        (m: any) => m.ranchRole === "storekeeper" || m.role === "storekeeper"
    );

    const ownerApi = api(ranch.ownerToken);
    const managerApi = api(ranch.managerToken);

    const ownerTasks = [
        worker && {
            title: `Morning pen check - ${ranch.slug}`,
            description: "Inspect all pens and report cleanliness and animal behaviour.",
            assignedToUserPublicId: resolveUserPublicId(worker),
            dueDate: "2026-04-27",
        },
        storekeeper && {
            title: `Stock count verification - ${ranch.slug}`,
            description: "Confirm actual stock against system record in the store.",
            assignedToUserPublicId: resolveUserPublicId(storekeeper),
            dueDate: "2026-04-27",
        },
    ].filter(Boolean);

    const managerTasks = [
        vet && {
            title: `Medication review - ${ranch.slug}`,
            description: "Review animals needing treatment and update recommendations.",
            assignedToUserPublicId: resolveUserPublicId(vet),
            dueDate: "2026-04-26",
        },
        worker && {
            title: `Fence inspection - ${ranch.slug}`,
            description: "Inspect perimeter fencing and report weak points.",
            assignedToUserPublicId: resolveUserPublicId(worker),
            dueDate: "2026-04-26",
        },
    ].filter(Boolean);

    for (const task of ownerTasks as any[]) {
        try {
            await ownerApi.post(`/ranches/${ranch.slug}/tasks`, task);
            console.log(`✅ [${ranch.slug}] Extra owner task created: ${task.title}`);
        } catch (err: any) {
            console.log(`❌ [${ranch.slug}] Extra owner task failed:`, err.response?.data ?? err.message);
        }
    }

    for (const task of managerTasks as any[]) {
        try {
            await managerApi.post(`/ranches/${ranch.slug}/tasks`, task);
            console.log(`✅ [${ranch.slug}] Extra manager task created: ${task.title}`);
        } catch (err: any) {
            console.log(`❌ [${ranch.slug}] Extra manager task failed:`, err.response?.data ?? err.message);
        }
    }
}

async function createExtraConcerns(ranch: RanchConfig) {
    const workerApi = api(ranch.workerToken);
    const vetApi = api(ranch.vetToken);
    const storekeeperApi = api(ranch.storekeeperToken);

    const payloads = [
        {
            client: workerApi,
            title: `Water supply concern - ${ranch.slug}`,
            description: "Observed inconsistent water level in one animal section.",
            category: "facility",
            priority: "medium",
        },
        {
            client: vetApi,
            title: `Animal health concern - ${ranch.slug}`,
            description: "A small group of animals need closer observation.",
            category: "health",
            priority: "high",
        },
        {
            client: storekeeperApi,
            title: `Inventory discrepancy - ${ranch.slug}`,
            description: "Physical stock count differs from the expected quantity.",
            category: "inventory",
            priority: "high",
        },
    ];

    for (const item of payloads) {
        try {
            await item.client.post(`/ranches/${ranch.slug}/concerns`, {
                title: item.title,
                description: item.description,
                category: item.category,
                priority: item.priority,
            });
            console.log(`✅ [${ranch.slug}] Extra concern created: ${item.title}`);
        } catch (err: any) {
            console.log(`❌ [${ranch.slug}] Extra concern failed:`, err.response?.data ?? err.message);
        }
    }
}

async function createExtraPlatformTickets(ranch: RanchConfig) {
    const ownerApi = api(ranch.ownerToken);
    const managerApi = api(ranch.managerToken);

    const tickets = [
        {
            client: ownerApi,
            title: `Role access review - ${ranch.slug}`,
            description: "Please review whether all ranch roles have the expected access.",
            category: "account_access",
            priority: "medium",
        },
        {
            client: managerApi,
            title: `Feature request - ${ranch.slug}`,
            description: "Would like improved reporting for tasks and ranch activities.",
            category: "feature_request",
            priority: "low",
        },
    ];

    for (const ticket of tickets) {
        try {
            await ticket.client.post(`/ranches/${ranch.slug}/platform-tickets`, {
                title: ticket.title,
                description: ticket.description,
                category: ticket.category,
                priority: ticket.priority,
            });
            console.log(`✅ [${ranch.slug}] Extra platform ticket created: ${ticket.title}`);
        } catch (err: any) {
            console.log(
                `❌ [${ranch.slug}] Extra platform ticket failed:`,
                err.response?.data ?? err.message
            );
        }
    }
}

async function main() {
    for (const ranch of ranches) {
        console.log(`\n🚀 Running extra activity seed for ${ranch.slug}`);
        await createExtraTasks(ranch);
        await createExtraConcerns(ranch);
        await createExtraPlatformTickets(ranch);
        console.log(`🎉 [${ranch.slug}] Extra activity seed complete`);
    }

    console.log("\n✅ Extra activity seeding completed for both ranches");
}

main().catch((err: any) => {
    console.error("EXTRA_ACTIVITY_SEED_ERROR:", err.response?.data ?? err.message);
});