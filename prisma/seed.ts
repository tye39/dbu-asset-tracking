import { PrismaClient, RoleName } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";//the application can reuse connections.
import * as bcrypt from "bcryptjs";//hash passwords for security

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dbu_asset_tracking?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding started...");

  // 1. Seed Roles
  console.log("Seeding roles...");
  const rolesData = [
    { name: RoleName.SYSTEM_ADMINISTRATOR, description: "System Administrator with full access to settings, users, and core configuration." },
    { name: RoleName.PROPERTY_ADMINISTRATION_OFFICER, description: "Property Administration Officer responsible for asset registration, assignments, and transfers." },
    { name: RoleName.DEPARTMENT_HEAD, description: "Department Head overseeing department assets and initiating transfer requests." },
    { name: RoleName.STAFF_MEMBER, description: "Staff Member using assigned assets and reporting damages." },
    { name: RoleName.MAINTENANCE_TECHNICIAN, description: "Maintenance Technician handling asset repairs and status updates." },
    { name: RoleName.INTERNAL_AUDITOR, description: "Internal Auditor reviewing transactions and audit logs." },
    { name: RoleName.INVENTORY_PERSON, description: "Inventory Person responsible specifically for physical asset inventory verification." },
  ];

  const roles: Record<RoleName, any> = {} as any;
  for (const roleInfo of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleInfo.name },
      update: { description: roleInfo.description },
      create: { name: roleInfo.name, description: roleInfo.description },
    });
    roles[roleInfo.name] = role;
  }

  // 2. Seed Faculties
  console.log("Seeding faculties...");
  const facultyTech = await prisma.faculty.upsert({
    where: { code: "FTEC" },
    update: {},
    create: { name: "Faculty of Technology", code: "FTEC" },
  });

  const facultyBiz = await prisma.faculty.upsert({
    where: { code: "FBE" },
    update: {},
    create: { name: "Faculty of Business and Economics", code: "FBE" },
  });

  const facultyBranch = await prisma.faculty.upsert({
    where: { code: "CAMPUS" },
    update: {},
    create: { name: "Branch Campuses", code: "CAMPUS" },
  });

  // 3. Seed Organizational Units
  console.log("Seeding organizational units...");
  const collegeCCI = await prisma.organizationalUnit.upsert({
    where: { code: "CCI" },
    update: {},
    create: { name: "College of Computing and Informatics", code: "CCI", type: "COLLEGE" },
  });

  const deptSE = await prisma.organizationalUnit.upsert({
    where: { code: "SE" },
    update: {},
    create: { name: "Software Engineering", code: "SE", type: "DEPARTMENT", parentId: collegeCCI.id, facultyId: facultyTech.id },
  });

  const deptCS = await prisma.organizationalUnit.upsert({
    where: { code: "CS" },
    update: {},
    create: { name: "Computer Science", code: "CS", type: "DEPARTMENT", parentId: collegeCCI.id, facultyId: facultyTech.id },
  });

  const deptAcc = await prisma.organizationalUnit.upsert({
    where: { code: "ACC" },
    update: {},
    create: { name: "Accounting", code: "ACC", type: "DEPARTMENT", facultyId: facultyBiz.id },
  });

  await prisma.organizationalUnit.upsert({
    where: { code: "AWC" },
    update: {},
    create: { name: "Asrat Weldyes Campus", code: "AWC", type: "COLLEGE", facultyId: facultyBranch.id },
  });

  // Admin Units
  await prisma.organizationalUnit.upsert({
    where: { code: "PRES" },
    update: {},
    create: { name: "President Office", code: "PRES", type: "ADMINISTRATIVE_OFFICE" },
  });

  await prisma.organizationalUnit.upsert({
    where: { code: "ICT_DIR" },
    update: {},
    create: { name: "ICT Directorate", code: "ICT_DIR", type: "DIRECTORATE" },
  });

  // 4. Hash passwords
  const passwordHash = await bcrypt.hash("Password123", 10);

  // 5. Seed Users
  console.log("Seeding users...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@dbu.edu.et" },
    update: {
      roleId: roles[RoleName.SYSTEM_ADMINISTRATOR].id,
      deletedAt: null,
    },
    create: {
      name: "System Admin",
      email: "admin@dbu.edu.et",
      passwordHash,
      roleId: roles[RoleName.SYSTEM_ADMINISTRATOR].id,
      departmentId: deptSE.id,
    },
  });

  const paoUser = await prisma.user.upsert({
    where: { email: "pao@dbu.edu.et" },
    update: {
      roleId: roles[RoleName.PROPERTY_ADMINISTRATION_OFFICER].id,
      deletedAt: null,
    },
    create: {
      name: "Property Admin Officer",
      email: "pao@dbu.edu.et",
      passwordHash,
      roleId: roles[RoleName.PROPERTY_ADMINISTRATION_OFFICER].id,
      departmentId: deptSE.id,
    },
  });

  const headUser = await prisma.user.upsert({
    where: { email: "head@dbu.edu.et" },
    update: {},
    create: {
      name: "Abebe Kebede (Dept Head)",
      email: "head@dbu.edu.et",
      passwordHash,
      roleId: roles[RoleName.DEPARTMENT_HEAD].id,
      departmentId: deptSE.id,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: "staff@dbu.edu.et" },
    update: {},
    create: {
      name: "Abreham Kebede",
      email: "staff@dbu.edu.et",
      passwordHash,
      roleId: roles[RoleName.STAFF_MEMBER].id,
      departmentId: deptSE.id,
    },
  });

  const techUser = await prisma.user.upsert({
    where: { email: "tech@dbu.edu.et" },
    update: {},
    create: {
      name: "Tadesse Tech",
      email: "tech@dbu.edu.et",
      passwordHash,
      roleId: roles[RoleName.MAINTENANCE_TECHNICIAN].id,
      departmentId: deptSE.id,
    },
  });

  const auditorUser = await prisma.user.upsert({
    where: { email: "auditor@dbu.edu.et" },
    update: {},
    create: {
      name: "Almaz Auditor",
      email: "auditor@dbu.edu.et",
      passwordHash,
      roleId: roles[RoleName.INTERNAL_AUDITOR].id,
      departmentId: deptSE.id,
    },
  });

  const inventoryUser = await prisma.user.upsert({
    where: { email: "inventory@dbu.edu.et" },
    update: {},
    create: {
      name: "Isaac Inventory",
      email: "inventory@dbu.edu.et",
      passwordHash,
      roleId: roles[RoleName.INVENTORY_PERSON].id,
      departmentId: deptSE.id,
    },
  });

  // 6. Seed Asset Categories
  console.log("Seeding asset categories...");
  const categoriesData = [
    { code: "ICT", name: "ICT Equipment", description: "Desktops, laptops, monitors, printers, scanners, routers, switches.", displayOrder: 1 },
    { code: "ELEC", name: "Electronics", description: "Television, projector, camera, audio system, refrigerator.", displayOrder: 2 },
    { code: "EL_EQ", name: "Electrical Equipment", description: "Generators, air conditioners, water heaters, pumps.", displayOrder: 3 },
    { code: "FURN", name: "Furniture", description: "Chairs, desks, tables, shelves, beds, wardrobes.", displayOrder: 4 },
    { code: "VEH", name: "Vehicle", description: "Cars, buses, motorcycles, trucks.", displayOrder: 5 },
    { code: "LAB", name: "Laboratory Equipment", description: "Microscopes, centrifuges, oscilloscopes.", displayOrder: 6 },
    { code: "MED", name: "Medical Equipment", description: "Ventilators, ECG machines, patient monitors.", displayOrder: 7 },
    { code: "BUILD", name: "Building Equipment", description: "Doors, windows, water tanks, sockets, pipes.", displayOrder: 8 },
    { code: "OTHER", name: "Other", description: "General items not classified elsewhere.", displayOrder: 9 }
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const dbCat = await prisma.assetCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description, displayOrder: cat.displayOrder, isActive: true },
      create: { code: cat.code, name: cat.name, description: cat.description, displayOrder: cat.displayOrder, isActive: true },
    });
    categories[cat.code] = dbCat;
  }

  // 7. Seed Asset Types per Category
  console.log("Seeding asset types...");
  const typesData = [
    // ICT Equipment
    { name: "Laptop", categoryCode: "ICT", displayOrder: 1 },
    { name: "Desktop Computer", categoryCode: "ICT", displayOrder: 2 },
    { name: "Server", categoryCode: "ICT", displayOrder: 3 },
    { name: "Router", categoryCode: "ICT", displayOrder: 4 },
    { name: "Switch", categoryCode: "ICT", displayOrder: 5 },
    { name: "Printer", categoryCode: "ICT", displayOrder: 6 },
    { name: "Scanner", categoryCode: "ICT", displayOrder: 7 },

    // Electronics
    { name: "Television", categoryCode: "ELEC", displayOrder: 1 },
    { name: "Projector", categoryCode: "ELEC", displayOrder: 2 },
    { name: "Camera", categoryCode: "ELEC", displayOrder: 3 },
    { name: "Audio System", categoryCode: "ELEC", displayOrder: 4 },
    { name: "Refrigerator", categoryCode: "ELEC", displayOrder: 5 },

    // Electrical Equipment
    { name: "Generator", categoryCode: "EL_EQ", displayOrder: 1 },
    { name: "Air Conditioner", categoryCode: "EL_EQ", displayOrder: 2 },
    { name: "Water Heater", categoryCode: "EL_EQ", displayOrder: 3 },

    // Furniture
    { name: "Chair", categoryCode: "FURN", displayOrder: 1 },
    { name: "Desk", categoryCode: "FURN", displayOrder: 2 },
    { name: "Table", categoryCode: "FURN", displayOrder: 3 },
    { name: "Cabinet", categoryCode: "FURN", displayOrder: 4 },
    { name: "Bed", categoryCode: "FURN", displayOrder: 5 },

    // Vehicle
    { name: "Car", categoryCode: "VEH", displayOrder: 1 },
    { name: "Bus", categoryCode: "VEH", displayOrder: 2 },
    { name: "Motorcycle", categoryCode: "VEH", displayOrder: 3 },
    { name: "Truck", categoryCode: "VEH", displayOrder: 4 },

    // Laboratory Equipment
    { name: "Microscope", categoryCode: "LAB", displayOrder: 1 },
    { name: "Centrifuge", categoryCode: "LAB", displayOrder: 2 },
    { name: "Oscilloscope", categoryCode: "LAB", displayOrder: 3 },

    // Medical Equipment
    { name: "Ventilator", categoryCode: "MED", displayOrder: 1 },
    { name: "ECG Machine", categoryCode: "MED", displayOrder: 2 },

    // Building Equipment
    { name: "Door", categoryCode: "BUILD", displayOrder: 1 },
    { name: "Window", categoryCode: "BUILD", displayOrder: 2 },
    { name: "Water Tank", categoryCode: "BUILD", displayOrder: 3 },
    { name: "Electrical Socket", categoryCode: "BUILD", displayOrder: 4 },

    // Other
    { name: "General Equipment", categoryCode: "OTHER", displayOrder: 1 }
  ];

  const assetTypes: Record<string, any> = {};
  for (const t of typesData) {
    const cat = categories[t.categoryCode];
    let dbType = await prisma.assetType.findFirst({
      where: { name: t.name, categoryId: cat.id }
    });
    if (!dbType) {
      dbType = await prisma.assetType.create({
        data: {
          name: t.name,
          categoryId: cat.id,
          isActive: true,
          displayOrder: t.displayOrder,
          description: `Standard ${t.name} type`
        }
      });
    }
    assetTypes[t.name] = dbType;
  }

  // 8. Seed Suppliers
  console.log("Seeding suppliers...");
  const supplierIT = await prisma.supplier.upsert({
    where: { name: "IT Technology PLC" },
    update: {},
    create: { name: "IT Technology PLC", contactPerson: "Yohannes Abera", email: "yohannes@it-tech.com", phone: "+251911223344", address: "Addis Ababa" }
  });
  const supplierABC = await prisma.supplier.upsert({
    where: { name: "ABC Computer Supplier" },
    update: {},
    create: { name: "ABC Computer Supplier", contactPerson: "Sintayehu Kebede", email: "info@abccomputers.com", phone: "+251911334455", address: "Addis Ababa" }
  });
  const supplierModern = await prisma.supplier.upsert({
    where: { name: "Modern Furniture PLC" },
    update: {},
    create: { name: "Modern Furniture PLC", contactPerson: "Lensa Tolosa", email: "contact@modernfurniture.com", phone: "+251911445566", address: "Adama" }
  });
  const supplierToyota = await prisma.supplier.upsert({
    where: { name: "Toyota Ethiopia" },
    update: {},
    create: { name: "Toyota Ethiopia", contactPerson: "Bekele Megersa", email: "sales@toyota-ethiopia.com", phone: "+251911556677", address: "Addis Ababa" }
  });
  const supplierElectronics = await prisma.supplier.upsert({
    where: { name: "Electronics Supplier A" },
    update: {},
    create: { name: "Electronics Supplier A", contactPerson: "Martha Gebru", email: "martha@elecsupplier.com", phone: "+251911667788", address: "Hawassa" }
  });

  // Seed Supplier Assignments (Section 9)
  console.log("Seeding supplier assignments...");
  const assignmentsList = [
    { supplierId: supplierIT.id, categoryId: categories["ICT"].id },
    { supplierId: supplierABC.id, categoryId: categories["ICT"].id },
    { supplierId: supplierModern.id, categoryId: categories["FURN"].id },
    { supplierId: supplierToyota.id, categoryId: categories["VEH"].id },
    { supplierId: supplierElectronics.id, categoryId: categories["ELEC"].id },
  ];

  for (const assign of assignmentsList) {
    const existing = await prisma.supplierAssignment.findFirst({
      where: { supplierId: assign.supplierId, categoryId: assign.categoryId }
    });
    if (!existing) {
      await prisma.supplierAssignment.create({ data: assign });
    }
  }

  // 9. Seed dynamic RegistrationFields (Section 5)
  console.log("Seeding dynamic registration fields...");
  const fieldsData = [
    // Built-in properties (Standard columns on Asset table)
    { name: "name", label: "Asset Name", fieldType: "TEXT", placeholder: "e.g. Dell Latitude 5420" },
    { name: "serialNumber", label: "Serial Number", fieldType: "TEXT", placeholder: "e.g. SN-8273498" },
    { name: "purchaseCost", label: "Purchase Cost", fieldType: "DECIMAL", placeholder: "e.g. 45000.00" },
    { name: "purchaseDate", label: "Purchase Date", fieldType: "DATE", placeholder: "" },
    { name: "usefulLife", label: "Useful Life (Years)", fieldType: "NUMBER", placeholder: "e.g. 5" },
    { name: "salvageValue", label: "Salvage Value", fieldType: "DECIMAL", placeholder: "e.g. 1000.00" },
    { name: "fundingSource", label: "Funding Source", fieldType: "DROPDOWN", options: "GOVERNMENT_BUDGET,UNIVERSITY_INTERNAL_BUDGET,RESEARCH_GRANT,DONATION,PROJECT_FUND,OTHER" },
    { name: "warrantyStartDate", label: "Warranty Start Date", fieldType: "DATE", placeholder: "" },
    { name: "warrantyEndDate", label: "Warranty End Date", fieldType: "DATE", placeholder: "" },
    { name: "expiryDate", label: "Expiry Date", fieldType: "DATE", placeholder: "" },

    // Custom Dynamic Fields
    { name: "brand", label: "Brand", fieldType: "TEXT", placeholder: "e.g. Dell, HP, Toyota" },
    { name: "model", label: "Model", fieldType: "TEXT", placeholder: "e.g. Hilux, Catalyst" },
    { name: "manufacturer", label: "Manufacturer", fieldType: "TEXT", placeholder: "e.g. Dell Inc." },
    { name: "processor", label: "Processor", fieldType: "TEXT", placeholder: "e.g. Intel Core i7 11th Gen" },
    { name: "ram", label: "RAM Size", fieldType: "DROPDOWN", options: "4 GB,8 GB,16 GB,32 GB,64 GB" },
    { name: "storage_type", label: "Storage Type", fieldType: "DROPDOWN", options: "SSD,HDD,eMMC" },
    { name: "storage_cap", label: "Storage Capacity", fieldType: "DROPDOWN", options: "256 GB,512 GB,1 TB,2 TB" },
    { name: "os", label: "Operating System", fieldType: "TEXT", placeholder: "e.g. Windows 11 Pro, Ubuntu 22.04" },
    { name: "screen_size", label: "Screen Size", fieldType: "TEXT", placeholder: "e.g. 14 inch, 55 inch" },
    { name: "monitor_info", label: "Monitor Information", fieldType: "TEXT", placeholder: "e.g. 24 inch Dell Monitor" },
    
    // Printer additions
    { name: "printer_type", label: "Printer Type", fieldType: "TEXT", placeholder: "e.g. Multi-function" },
    { name: "print_tech", label: "Printing Technology", fieldType: "DROPDOWN", options: "Laser,Inkjet,Thermal" },
    { name: "color_mono", label: "Color/Monochrome", fieldType: "DROPDOWN", options: "Color,Monochrome" },
    { name: "print_speed", label: "Print Speed", fieldType: "TEXT", placeholder: "e.g. 35 ppm" },
    
    // TV additions
    { name: "display_tech", label: "Display Technology", fieldType: "TEXT", placeholder: "e.g. LED, OLED, QLED" },
    { name: "resolution", label: "Resolution", fieldType: "TEXT", placeholder: "e.g. 4K UHD, Full HD" },
    { name: "smart_tv", label: "Smart TV", fieldType: "BOOLEAN", placeholder: "" },
    
    // Shared specs
    { name: "connectivity", label: "Connectivity", fieldType: "TEXT", placeholder: "e.g. WiFi, Bluetooth, HDMI, USB" },

    // Vehicle additions
    { name: "make", label: "Make", fieldType: "TEXT", placeholder: "e.g. Toyota" },
    { name: "year", label: "Year", fieldType: "NUMBER", placeholder: "e.g. 2022" },
    { name: "plate_number", label: "Plate Number", fieldType: "TEXT", placeholder: "e.g. Code 3-02432 AA" },
    { name: "chassis_number", label: "Chassis Number", fieldType: "TEXT", placeholder: "e.g. CHS-8273" },
    { name: "engine_number", label: "Engine Number", fieldType: "TEXT", placeholder: "e.g. ENG-098234" },
    { name: "fuel_type", label: "Fuel Type", fieldType: "DROPDOWN", options: "Diesel,Petrol,Electric,Hybrid" },
    { name: "transmission", label: "Transmission", fieldType: "DROPDOWN", options: "Manual,Automatic" },
    { name: "mileage", label: "Mileage (km)", fieldType: "NUMBER", placeholder: "e.g. 45000" },

    // Furniture additions
    { name: "furniture_type", label: "Furniture Type", fieldType: "TEXT", placeholder: "e.g. Office Chair" },
    { name: "material", label: "Material", fieldType: "TEXT", placeholder: "e.g. Wood, Steel, Fabric" },
    { name: "dimensions", label: "Dimensions", fieldType: "TEXT", placeholder: "e.g. 60x60x100 cm" },
    { name: "color", label: "Color", fieldType: "TEXT", placeholder: "e.g. Black" },

    // Medical additions
    { name: "equipment_type", label: "Equipment Type", fieldType: "TEXT", placeholder: "e.g. Life Support" },
    { name: "technical_specs", label: "Technical Specifications", fieldType: "TEXTAREA", placeholder: "Detailed parameters..." },
    { name: "calibration_req", label: "Calibration Required", fieldType: "BOOLEAN", placeholder: "" },
    { name: "calibration_date", label: "Calibration Date", fieldType: "DATE", placeholder: "" },
    { name: "next_calibration_date", label: "Next Calibration Date", fieldType: "DATE", placeholder: "" }
  ];

  const fields: Record<string, any> = {};
  for (const fd of fieldsData) {
    const dbField = await prisma.registrationField.upsert({
      where: { name: fd.name },
      update: { label: fd.label, fieldType: fd.fieldType, placeholder: fd.placeholder || null, options: fd.options || null, isActive: true },
      create: { name: fd.name, label: fd.label, fieldType: fd.fieldType, placeholder: fd.placeholder || null, options: fd.options || null, isActive: true },
    });
    fields[fd.name] = dbField;
  }

  // 10. Configure default dynamic field bindings per Asset Type (Section 4, 6)
  console.log("Configuring field bindings per asset type...");
  
  // Standard list of core fields that are enabled by default for almost all types
  const coreFieldsNames = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate"];

  const bindings: { typeName: string; fieldName: string; isRequired: boolean; displayOrder: number }[] = [];

  // Default Laptop Setup
  let order = 1;
  for (const core of coreFieldsNames) {
    bindings.push({ typeName: "Laptop", fieldName: core, isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(core), displayOrder: order++ });
  }
  bindings.push({ typeName: "Laptop", fieldName: "brand", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Laptop", fieldName: "model", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Laptop", fieldName: "processor", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Laptop", fieldName: "ram", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Laptop", fieldName: "storage_type", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Laptop", fieldName: "storage_cap", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Laptop", fieldName: "os", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Laptop", fieldName: "screen_size", isRequired: false, displayOrder: order++ });

  // Default Desktop Setup
  order = 1;
  for (const core of coreFieldsNames) {
    bindings.push({ typeName: "Desktop Computer", fieldName: core, isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(core), displayOrder: order++ });
  }
  bindings.push({ typeName: "Desktop Computer", fieldName: "brand", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Desktop Computer", fieldName: "model", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Desktop Computer", fieldName: "processor", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Desktop Computer", fieldName: "ram", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Desktop Computer", fieldName: "storage_type", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Desktop Computer", fieldName: "storage_cap", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Desktop Computer", fieldName: "os", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Desktop Computer", fieldName: "monitor_info", isRequired: false, displayOrder: order++ });

  // Default Printer Setup
  order = 1;
  for (const core of coreFieldsNames) {
    bindings.push({ typeName: "Printer", fieldName: core, isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(core), displayOrder: order++ });
  }
  bindings.push({ typeName: "Printer", fieldName: "brand", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Printer", fieldName: "model", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Printer", fieldName: "printer_type", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Printer", fieldName: "print_tech", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Printer", fieldName: "color_mono", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Printer", fieldName: "print_speed", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Printer", fieldName: "connectivity", isRequired: false, displayOrder: order++ });

  // Default Television Setup
  order = 1;
  for (const core of coreFieldsNames) {
    bindings.push({ typeName: "Television", fieldName: core, isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(core), displayOrder: order++ });
  }
  bindings.push({ typeName: "Television", fieldName: "brand", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Television", fieldName: "model", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Television", fieldName: "screen_size", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Television", fieldName: "display_tech", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Television", fieldName: "resolution", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Television", fieldName: "smart_tv", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Television", fieldName: "connectivity", isRequired: false, displayOrder: order++ });

  // Default Vehicle Setup (Plate, chassis, engine, fuel, transmission, mileage)
  order = 1;
  for (const core of coreFieldsNames) {
    bindings.push({ typeName: "Car", fieldName: core, isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(core), displayOrder: order++ });
  }
  bindings.push({ typeName: "Car", fieldName: "make", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "model", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "year", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "plate_number", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "chassis_number", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "engine_number", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "fuel_type", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "transmission", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Car", fieldName: "mileage", isRequired: false, displayOrder: order++ });

  // Default Chair Setup (Furniture type, material, dimensions, color)
  order = 1;
  const chairCore = coreFieldsNames.filter(c => !["warrantyStartDate", "warrantyEndDate"].includes(c)); // chairs don't usually have warranties
  for (const core of chairCore) {
    bindings.push({ typeName: "Chair", fieldName: core, isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(core), displayOrder: order++ });
  }
  bindings.push({ typeName: "Chair", fieldName: "furniture_type", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Chair", fieldName: "material", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Chair", fieldName: "dimensions", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Chair", fieldName: "color", isRequired: false, displayOrder: order++ });

  // Default Ventilator Setup (Medical, with warranty and expiry option enabled)
  order = 1;
  for (const core of coreFieldsNames) {
    bindings.push({ typeName: "Ventilator", fieldName: core, isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(core), displayOrder: order++ });
  }
  bindings.push({ typeName: "Ventilator", fieldName: "expiryDate", isRequired: true, displayOrder: order++ }); // Medical equipment has expiration
  bindings.push({ typeName: "Ventilator", fieldName: "manufacturer", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Ventilator", fieldName: "model", isRequired: true, displayOrder: order++ });
  bindings.push({ typeName: "Ventilator", fieldName: "equipment_type", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Ventilator", fieldName: "technical_specs", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Ventilator", fieldName: "calibration_req", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Ventilator", fieldName: "calibration_date", isRequired: false, displayOrder: order++ });
  bindings.push({ typeName: "Ventilator", fieldName: "next_calibration_date", isRequired: false, displayOrder: order++ });

  // Apply default configurations to the database
  for (const bind of bindings) {
    const aType = assetTypes[bind.typeName];
    const field = fields[bind.fieldName];
    if (aType && field) {
      await prisma.assetTypeField.upsert({
        where: { assetTypeId_fieldId: { assetTypeId: aType.id, fieldId: field.id } },
        update: { isEnabled: true, isRequired: bind.isRequired, displayOrder: bind.displayOrder },
        create: { assetTypeId: aType.id, fieldId: field.id, isEnabled: true, isRequired: bind.isRequired, displayOrder: bind.displayOrder }
      });
    }
  }

  // Bind core fields for other non-configured asset types so they are not blank
  console.log("Setting default core bindings for other asset types...");
  const allDbTypes = await prisma.assetType.findMany();
  for (const type of allDbTypes) {
    const existingCount = await prisma.assetTypeField.count({ where: { assetTypeId: type.id } });
    if (existingCount === 0) {
      let coreOrder = 1;
      for (const coreName of coreFieldsNames) {
        const field = fields[coreName];
        if (field) {
          await prisma.assetTypeField.create({
            data: {
              assetTypeId: type.id,
              fieldId: field.id,
              isEnabled: true,
              isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(coreName),
              displayOrder: coreOrder++
            }
          });
        }
      }
    }
  }

  // 11. Seed Sample Assets & Assignments
  console.log("Seeding sample assets, assignments, and maintenance...");
  
  const laptopAsset = await prisma.asset.upsert({
    where: { assetCode: "DBU-ICT-001" },
    update: {},
    create: {
      name: "Dell Latitude 5420 Laptop",
      assetCode: "DBU-ICT-001",
      serialNumber: "SN-DELL-5420-01",
      description: "Core i7 11th Gen, 16GB RAM, 512GB SSD for Software Engineering lab",
      status: "ACTIVE",
      categoryId: categories["ICT"].id,
      assetTypeId: assetTypes["Laptop"]?.id,
      departmentId: deptSE.id,
      purchaseCost: 45000,
      procurementCost: 45000,
      purchaseDate: new Date(),
    }
  });

  const desktopAsset = await prisma.asset.upsert({
    where: { assetCode: "DBU-ICT-002" },
    update: {},
    create: {
      name: "HP EliteDesk 800 G6",
      assetCode: "DBU-ICT-002",
      serialNumber: "SN-HP-800G6-01",
      description: "Workstation for Software Development",
      status: "PENDING_ASSIGNMENT",
      categoryId: categories["ICT"].id,
      assetTypeId: assetTypes["Desktop Computer"]?.id,
      departmentId: deptSE.id,
      purchaseCost: 52000,
      procurementCost: 52000,
      purchaseDate: new Date(),
    }
  });

  const vehicleAsset = await prisma.asset.upsert({
    where: { assetCode: "DBU-VEH-001" },
    update: {},
    create: {
      name: "Toyota Hilux Double Cab",
      assetCode: "DBU-VEH-001",
      serialNumber: "SN-TOYOTA-HLX-01",
      description: "Department Field Service Vehicle",
      status: "ASSIGNED",
      categoryId: categories["VEH"].id,
      assetTypeId: assetTypes["Car"]?.id,
      departmentId: deptSE.id,
      purchaseCost: 3500000,
      procurementCost: 3500000,
      purchaseDate: new Date(),
    }
  });

  const chairAsset = await prisma.asset.upsert({
    where: { assetCode: "DBU-FURN-001" },
    update: {},
    create: {
      name: "Ergonomic High-Back Executive Chair",
      assetCode: "DBU-FURN-001",
      serialNumber: "SN-FURN-CHAIR-01",
      description: "Office Chair for Department Office",
      status: "ACTIVE",
      categoryId: categories["FURN"].id,
      assetTypeId: assetTypes["Chair"]?.id,
      departmentId: deptSE.id,
      purchaseCost: 12000,
      procurementCost: 12000,
      purchaseDate: new Date(),
    }
  });

  const projectorAsset = await prisma.asset.upsert({
    where: { assetCode: "DBU-ELEC-001" },
    update: {},
    create: {
      name: "Epson EB-X41 3600-Lumen Projector",
      assetCode: "DBU-ELEC-001",
      serialNumber: "SN-EPSON-X41-01",
      description: "Classroom Presentation Projector",
      status: "UNDER_MAINTENANCE",
      categoryId: categories["ELEC"].id,
      assetTypeId: assetTypes["Projector"]?.id,
      departmentId: deptSE.id,
      purchaseCost: 38000,
      procurementCost: 38000,
      purchaseDate: new Date(),
    }
  });

  // Seed Pending Assignment for staff member
  const pendingAssign = await prisma.assignment.findFirst({
    where: { assetId: desktopAsset.id, assignedToUserId: staffUser.id, status: "PENDING_ACCEPTANCE" }
  });
  if (!pendingAssign) {
    await prisma.assignment.create({
      data: {
        assetId: desktopAsset.id,
        assignedToUserId: staffUser.id,
        assignedByUserId: paoUser.id,
        departmentId: deptSE.id,
        status: "PENDING_ACCEPTANCE",
        notes: "Pending confirmation by staff member",
      }
    });
  }

  // Seed Accepted Assignment for department head
  const acceptedAssign = await prisma.assignment.findFirst({
    where: { assetId: vehicleAsset.id, assignedToUserId: headUser.id, status: "ACCEPTED" }
  });
  if (!acceptedAssign) {
    await prisma.assignment.create({
      data: {
        assetId: vehicleAsset.id,
        assignedToUserId: headUser.id,
        assignedByUserId: paoUser.id,
        departmentId: deptSE.id,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedById: headUser.id,
        notes: "Official department head transport allocation",
      }
    });
  }

  // Seed Maintenance Record
  const existingMaint = await prisma.maintenance.findFirst({
    where: { assetId: projectorAsset.id }
  });
  if (!existingMaint) {
    await prisma.maintenance.create({
      data: {
        assetId: projectorAsset.id,
        reportedById: staffUser.id,
        assignedToId: techUser.id,
        description: "Projector lamp flickers and overheats after 10 minutes.",
        status: "PENDING",
        priority: "HIGH",
      }
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
