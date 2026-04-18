import axios from "axios";

const BASE_URL = "https://smartruga-api-d11b7da5a7fa.herokuapp.com/api/v1";
const RANCH_SLUG = "sunrise-pastures";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4MDI1Zjk4OS1jZGE0LTQ0ZjEtYjc5OC04YmY2Zjg5OTY1OWYiLCJwbGF0Zm9ybVJvbGUiOiJhZG1pbiIsImlhdCI6MTc3NjUwODgwMiwiZXhwIjoxNzc2NTA5NzAyfQ.K-UBe9W0qN9MvbC97AE0IeBr_zg1HQymVSRLjICisVo";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
    },
});

async function createAnimals() {
    const animals = [
        {
            speciesId: "8c8d0149-6ad4-43b4-a025-61942e93a7a9",
            tagNumber: "SP-COW-001",
            rfidTag: "982000100000001",
            sex: "female",
            dateOfBirth: "2023-02-10",
            breed: "White Fulani",
            weight: 320,
        },
        {
            speciesId: "8c8d0149-6ad4-43b4-a025-61942e93a7a9",
            tagNumber: "SP-COW-002",
            rfidTag: "982000100000002",
            sex: "male",
            dateOfBirth: "2022-08-15",
            breed: "Sokoto Gudali",
            weight: 410,
        },
        {
            speciesId: "7836a987-892b-4fb5-81b4-5dfda6dc04fe",
            tagNumber: "SP-GOAT-001",
            rfidTag: "982000100000003",
            sex: "female",
            dateOfBirth: "2023-06-01",
            breed: "Red Sokoto",
            weight: 42,
        },
        {
            speciesId: "7836a987-892b-4fb5-81b4-5dfda6dc04fe",
            tagNumber: "SP-GOAT-002",
            rfidTag: "982000100000004",
            sex: "male",
            dateOfBirth: "2022-11-20",
            breed: "West African Dwarf",
            weight: 38,
        },
        {
            speciesId: "5b5d769b-1162-4a83-aaec-26cc6b7c5fe0",
            tagNumber: "SP-SHEEP-001",
            rfidTag: "982000100000005",
            sex: "female",
            dateOfBirth: "2023-03-12",
            breed: "Yankasa",
            weight: 55,
        },
        {
            speciesId: "8c8d0149-6ad4-43b4-a025-61942e93a7a9",
            tagNumber: "SP-COW-003",
            rfidTag: "982000100000006",
            sex: "male",
            dateOfBirth: "2021-09-05",
            breed: "Bunaji",
            weight: 460,
        },
    ];

    const created: any[] = [];

    for (const animal of animals) {
        try {
            const res = await api.post(`/ranches/${RANCH_SLUG}/animals`, animal);
            created.push(res.data.data.animal);
            console.log(`✅ Animal created: ${animal.tagNumber}`);
        } catch (err: any) {
            console.log(`❌ Failed animal ${animal.tagNumber}:`, err.response?.data ?? err.message);
        }
    }

    return created;
}

async function createHealthRecords(animals: any[]) {
    const records = [
        {
            animalPublicId: animals[0]?.publicId,
            payload: {
                status: "healthy",
                notes: "Routine inspection completed by ranch owner.",
            },
        },
        {
            animalPublicId: animals[1]?.publicId,
            payload: {
                status: "sick",
                notes: "Owner observed reduced appetite and mild weakness.",
            },
        },
        {
            animalPublicId: animals[2]?.publicId,
            payload: {
                status: "quarantined",
                notes: "Owner isolated animal for closer observation.",
            },
        },
    ].filter((r) => r.animalPublicId);

    for (const record of records) {
        try {
            await api.post(
                `/ranches/${RANCH_SLUG}/animals/${record.animalPublicId}/health-events`,
                record.payload
            );
            console.log(`✅ Health record created for ${record.animalPublicId}`);
        } catch (err: any) {
            console.log(`❌ Failed health record for ${record.animalPublicId}:`, err.response?.data ?? err.message);
        }
    }
}

async function createInventoryItems() {
    const items = [
        {
            name: "Cattle Feed",
            category: "feed",
            unit: "bag",
            sku: "FD-001",
            description: "50kg cattle feed bags",
            quantityOnHand: 40,
            reorderLevel: 10,
        },
        {
            name: "Dewormer",
            category: "medicine",
            unit: "bottle",
            sku: "MED-001",
            description: "Livestock deworming medicine",
            quantityOnHand: 18,
            reorderLevel: 5,
        },
        {
            name: "Anthrax Vaccine",
            category: "vaccine",
            unit: "dose",
            sku: "VAC-001",
            description: "Anthrax prevention vaccine",
            quantityOnHand: 120,
            reorderLevel: 30,
        },
        {
            name: "Disinfectant",
            category: "supplies",
            unit: "container",
            sku: "SUP-001",
            description: "Barn and equipment disinfectant",
            quantityOnHand: 12,
            reorderLevel: 4,
        },
    ];

    for (const item of items) {
        try {
            await api.post(`/ranches/${RANCH_SLUG}/inventory-items`, item);
            console.log(`✅ Inventory item created: ${item.name}`);
        } catch (err: any) {
            console.log(`❌ Failed inventory item ${item.name}:`, err.response?.data ?? err.message);
        }
    }
}

async function main() {
    try {
        const animals = await createAnimals();
        await createHealthRecords(animals);
        await createInventoryItems();

        console.log("🎉 Ranch demo bootstrap completed");
        console.log("ℹ️ Tasks were skipped because /ranches/:slug/members endpoint does not exist.");
    } catch (err: any) {
        console.error("BOOTSTRAP_ERROR:", err.response?.data ?? err.message);
    }
}

main();