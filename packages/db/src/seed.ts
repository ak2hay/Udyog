import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  tenants,
  branches,
  customers,
  suppliers,
  items,
  warehouses,
  stockBalances,
  workCenters,
  bomHeaders,
  bomLines,
  routings,
  routingOperations,
} from "./schema";

async function seed() {
  const db = getDb();

  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "demo-precision"),
  });
  if (existing) {
    console.log("Demo tenant already exists:", existing.id);
    console.log("Sign up in the app, then link membership manually or create a new company via onboarding.");
    return existing.id;
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Precision Parts India",
      legalName: "Precision Parts India Pvt Ltd",
      slug: "demo-precision",
      industry: "manufacturing",
      businessType: "industrial_parts",
      gstin: "27AABCP1234A1Z5",
      pan: "AABCP1234A",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      phone: "+91 98765 43210",
      email: "admin@precision.demo",
    })
    .returning();

  const [branch] = await db
    .insert(branches)
    .values({
      tenantId: tenant.id,
      code: "HO",
      name: "Head Office",
      isDefault: true,
      city: "Pune",
      state: "Maharashtra",
    })
    .returning();

  const [warehouse] = await db
    .insert(warehouses)
    .values({
      tenantId: tenant.id,
      branchId: branch.id,
      code: "WH-MAIN",
      name: "Main Stores",
      isDefault: true,
    })
    .returning();

  await db.insert(customers).values({
    tenantId: tenant.id,
    code: "CUST-001",
    name: "ABC Engineering Works",
    gstin: "27AABCA9999A1Z1",
    contactPerson: "Ramesh Patil",
    email: "purchase@abceng.demo",
    phone: "+91 90000 11111",
    paymentTerms: "Net 30",
    creditLimit: "500000",
  });

  await db.insert(suppliers).values({
    tenantId: tenant.id,
    code: "SUP-001",
    name: "Steel Mart Traders",
    contactPerson: "Suresh",
    phone: "+91 90000 22222",
    leadTimeDays: "5",
  });

  const [en8] = await db
    .insert(items)
    .values({
      tenantId: tenant.id,
      code: "RM-EN8",
      name: "EN8 Steel Rod",
      itemType: "raw_material",
      material: "Steel",
      materialGrade: "EN8",
      uom: "KG",
      hsn: "7214",
      gstRate: "18",
      minStock: "200",
      reorderLevel: "500",
      purchasePrice: "85",
    })
    .returning();

  const [bearing] = await db
    .insert(items)
    .values({
      tenantId: tenant.id,
      code: "RM-BRG-6205",
      name: "Bearing 6205",
      itemType: "raw_material",
      uom: "PCS",
      hsn: "8482",
      gstRate: "18",
      minStock: "20",
      reorderLevel: "50",
      purchasePrice: "120",
    })
    .returning();

  const [shaft] = await db
    .insert(items)
    .values({
      tenantId: tenant.id,
      code: "FG-SHAFT-01",
      name: "Shaft Coupling Assembly",
      itemType: "finished_good",
      drawingNumber: "DWG-SC-001",
      drawingRevision: "B",
      uom: "PCS",
      hsn: "8483",
      gstRate: "18",
      salePrice: "2500",
      minStock: "10",
      reorderLevel: "25",
    })
    .returning();

  await db.insert(stockBalances).values([
    {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      itemId: en8.id,
      quantity: "700",
      reservedQuantity: "0",
    },
    {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      itemId: bearing.id,
      quantity: "80",
      reservedQuantity: "0",
    },
  ]);

  const [cnc] = await db
    .insert(workCenters)
    .values({
      tenantId: tenant.id,
      code: "CNC-02",
      name: "CNC Turning Center 02",
      machineName: "CNC-02",
      capacityPerHour: "12",
    })
    .returning();

  await db.insert(workCenters).values({
    tenantId: tenant.id,
    code: "MILL-01",
    name: "Milling Station 01",
    machineName: "MILL-01",
    capacityPerHour: "8",
  });

  const [bom] = await db
    .insert(bomHeaders)
    .values({
      tenantId: tenant.id,
      itemId: shaft.id,
      revision: "A",
      quantity: "1",
      scrapPercent: "2",
      status: "active",
    })
    .returning();

  await db.insert(bomLines).values([
    {
      tenantId: tenant.id,
      bomId: bom.id,
      componentItemId: en8.id,
      quantity: "1.2",
      uom: "KG",
      scrapPercent: "5",
      sequence: 1,
    },
    {
      tenantId: tenant.id,
      bomId: bom.id,
      componentItemId: bearing.id,
      quantity: "2",
      uom: "PCS",
      sequence: 2,
    },
  ]);

  const [routing] = await db
    .insert(routings)
    .values({
      tenantId: tenant.id,
      itemId: shaft.id,
      revision: "A",
      status: "active",
    })
    .returning();

  await db.insert(routingOperations).values([
    {
      tenantId: tenant.id,
      routingId: routing.id,
      sequence: 10,
      operationName: "CNC Turning",
      workCenterId: cnc.id,
      setupMinutes: "30",
      runMinutesPerUnit: "12",
      qualityCheckRequired: false,
    },
    {
      tenantId: tenant.id,
      routingId: routing.id,
      sequence: 20,
      operationName: "Final QC",
      setupMinutes: "0",
      runMinutesPerUnit: "3",
      qualityCheckRequired: true,
    },
  ]);

  console.log("Seeded demo manufacturing data for tenant", tenant.id);
  console.log("Create an account via /signup, then use onboarding OR attach membership to this tenant.");
  return tenant.id;
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
