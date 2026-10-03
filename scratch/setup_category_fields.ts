import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Setting up category-specific fields and configurations...");

  // 1. Definition of all needed RegistrationField items
  const newFieldsData = [
    // Core & common
    { name: "brand", label: "Brand", fieldType: "TEXT", placeholder: "e.g. Dell, HP, Sony" },
    { name: "manufacturer", label: "Manufacturer", fieldType: "TEXT", placeholder: "e.g. Dell Inc., Bosch" },
    { name: "model", label: "Model", fieldType: "TEXT", placeholder: "e.g. Latitude 5420, PowerMax 500" },
    
    // Building Equipment fields
    { name: "floor", label: "Floor Level", fieldType: "TEXT", placeholder: "e.g. Ground Floor, 2nd Floor" },
    { name: "room_area", label: "Room / Area", fieldType: "TEXT", placeholder: "e.g. Lab 101, East Wing Hallway" },
    { name: "material", label: "Material", fieldType: "TEXT", placeholder: "e.g. Stainless Steel, Hardwood, PVC" },
    { name: "dimensions", label: "Dimensions", fieldType: "TEXT", placeholder: "e.g. 200 x 90 x 4 cm" },

    // Electrical Equipment fields
    { name: "power_rating", label: "Power Rating", fieldType: "TEXT", placeholder: "e.g. 50 kVA, 2500 Watts" },
    { name: "voltage", label: "Voltage", fieldType: "TEXT", placeholder: "e.g. 220V, 380V Three-Phase" },
    { name: "capacity", label: "Capacity", fieldType: "TEXT", placeholder: "e.g. 1000 Liters, 5000 BTU, 200kg" },
    { name: "energy_fuel_type", label: "Energy / Fuel Type", fieldType: "DROPDOWN", options: "Diesel,Petrol,Electric,Solar,Gas,Hydraulic,Other" },
    { name: "installation_date", label: "Installation Date", fieldType: "DATE", placeholder: "" },

    // Electronics fields
    { name: "brightness", label: "Brightness", fieldType: "TEXT", placeholder: "e.g. 4000 ANSI Lumens" },
    { name: "projection_tech", label: "Projection Technology", fieldType: "TEXT", placeholder: "e.g. DLP, 3LCD, Laser" },
    { name: "camera_type", label: "Camera Type", fieldType: "TEXT", placeholder: "e.g. DSLR, Mirrorless, PTZ, Camcorder" },
    { name: "lens_spec", label: "Lens / Specification", fieldType: "TEXT", placeholder: "e.g. 18-55mm f/3.5-5.6 IS STM" },
    { name: "energy_rating", label: "Energy Rating", fieldType: "TEXT", placeholder: "e.g. A+++, 4-Star, Energy Star" },
    { name: "cooling_type", label: "Cooling Type", fieldType: "TEXT", placeholder: "e.g. Frost Free, Direct Cool, Inverter" },

    // ICT fields
    { name: "processor", label: "Processor / CPU", fieldType: "TEXT", placeholder: "e.g. Intel Core i7-12700H, AMD Ryzen 7" },
    { name: "ram", label: "RAM Size", fieldType: "DROPDOWN", options: "4 GB,8 GB,16 GB,32 GB,64 GB,128 GB" },
    { name: "storage_type", label: "Storage Type", fieldType: "DROPDOWN", options: "NVMe SSD,SATA SSD,HDD,Hybrid" },
    { name: "storage_cap", label: "Storage Capacity", fieldType: "DROPDOWN", options: "256 GB,512 GB,1 TB,2 TB,4 TB" },
    { name: "os", label: "Operating System", fieldType: "TEXT", placeholder: "e.g. Windows 11 Pro, Ubuntu 22.04 LTS" },
    { name: "screen_size", label: "Screen Size", fieldType: "TEXT", placeholder: "e.g. 14 inch, 27 inch, 65 inch" },
    { name: "resolution", label: "Resolution", fieldType: "TEXT", placeholder: "e.g. 1920x1080 Full HD, 3840x2160 4K" },
    { name: "mac_address", label: "MAC Address", fieldType: "TEXT", placeholder: "e.g. 00:1A:2B:3C:4D:5E" },
    { name: "ip_address", label: "IP Address", fieldType: "TEXT", placeholder: "e.g. 10.10.4.52" },
    { name: "panel_type", label: "Panel Type", fieldType: "TEXT", placeholder: "e.g. IPS, VA, OLED, TN" },
    { name: "ports", label: "Ports", fieldType: "TEXT", placeholder: "e.g. 2x HDMI, 1x DP, 4x USB 3.0, Type-C" },
    { name: "printer_type", label: "Printer Type", fieldType: "TEXT", placeholder: "e.g. Multi-function All-in-One, Workgroup" },
    { name: "print_tech", label: "Printing Technology", fieldType: "DROPDOWN", options: "Laser,Inkjet,Thermal,Dot Matrix" },
    { name: "color_mono", label: "Color / Monochrome", fieldType: "DROPDOWN", options: "Color,Monochrome" },
    { name: "print_speed", label: "Print Speed", fieldType: "TEXT", placeholder: "e.g. 35 ppm, 50 ppm" },
    { name: "network_capability", label: "Network Capability", fieldType: "DROPDOWN", options: "Ethernet & Wi-Fi,Ethernet Only,Wi-Fi Only,USB Only" },
    { name: "num_ports", label: "Number of Ports", fieldType: "NUMBER", placeholder: "e.g. 24, 48" },
    { name: "network_type", label: "Network Type", fieldType: "TEXT", placeholder: "e.g. Managed Gigabit PoE+, Layer 3 Switch" },

    // Furniture fields
    { name: "furniture_type", label: "Furniture Type", fieldType: "TEXT", placeholder: "e.g. Executive Chair, Conference Desk" },
    { name: "color", label: "Color", fieldType: "TEXT", placeholder: "e.g. Black, Walnut, Grey" },

    // Laboratory fields
    { name: "equipment_type", label: "Equipment Type", fieldType: "TEXT", placeholder: "e.g. Optical Microscope, High-Speed Centrifuge" },
    { name: "measurement_range", label: "Measurement Range", fieldType: "TEXT", placeholder: "e.g. 0.001g - 500g, 100MHz - 1GHz" },
    { name: "accuracy", label: "Accuracy", fieldType: "TEXT", placeholder: "e.g. ±0.1%, ±0.001g, 0.01 pH" },
    { name: "calibration_req", label: "Calibration Required", fieldType: "BOOLEAN", placeholder: "" },
    { name: "calibration_date", label: "Last Calibration Date", fieldType: "DATE", placeholder: "" },
    { name: "next_calibration_date", label: "Next Calibration Date", fieldType: "DATE", placeholder: "" },
  ];

  // Upsert all fields
  const fieldRecords: Record<string, any> = {};
  for (const f of newFieldsData) {
    const record = await prisma.registrationField.upsert({
      where: { name: f.name },
      update: {
        label: f.label,
        fieldType: f.fieldType,
        placeholder: f.placeholder || null,
        options: f.options || null,
        isActive: true
      },
      create: {
        name: f.name,
        label: f.label,
        fieldType: f.fieldType,
        placeholder: f.placeholder || null,
        options: f.options || null,
        isActive: true
      }
    });
    fieldRecords[f.name] = record;
  }
  console.log(`✓ Ensured ${Object.keys(fieldRecords).length} dynamic registration fields.`);

  // Core fields that every movable asset typically has
  const coreFields = await prisma.registrationField.findMany({
    where: {
      name: {
        in: ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate"]
      }
    }
  });
  for (const cf of coreFields) {
    fieldRecords[cf.name] = cf;
  }

  // Helper to reconfigure an asset type's fields
  async function configureTypeFields(
    typeName: string,
    specificFieldNames: { name: string; isRequired: boolean; label?: string }[]
  ) {
    const assetType = await prisma.assetType.findFirst({
      where: { name: typeName }
    });
    if (!assetType) {
      console.log(`Type not found: ${typeName}`);
      return;
    }

    // Combine core fields with specific fields
    const allConfig: { name: string; isRequired: boolean; label?: string }[] = [
      { name: "name", isRequired: true, label: "Asset Name" },
      { name: "serialNumber", isRequired: true, label: "Serial Number" },
      ...specificFieldNames,
      { name: "purchaseCost", isRequired: true, label: "Purchase Cost" },
      { name: "purchaseDate", isRequired: true, label: "Purchase Date" },
      { name: "usefulLife", isRequired: false, label: "Useful Life (Years)" },
      { name: "salvageValue", isRequired: false, label: "Salvage Value" },
      { name: "fundingSource", isRequired: false, label: "Funding Source" },
      { name: "warrantyStartDate", isRequired: false, label: "Warranty Start Date" },
      { name: "warrantyEndDate", isRequired: false, label: "Warranty End Date" },
    ];

    // Remove any existing mappings for this type to have clean relevant-only fields
    await prisma.assetTypeField.deleteMany({
      where: { assetTypeId: assetType.id }
    });

    let order = 1;
    for (const item of allConfig) {
      const fRecord = fieldRecords[item.name];
      if (!fRecord) continue;
      await prisma.assetTypeField.create({
        data: {
          assetTypeId: assetType.id,
          fieldId: fRecord.id,
          isEnabled: true,
          isRequired: item.isRequired,
          displayOrder: order++,
          labelOverride: item.label || null
        }
      });
    }
    console.log(`  ✓ Configured fields for ${typeName} (${allConfig.length} fields)`);
  }

  // Configure ICT Equipment
  console.log("Configuring ICT Equipment fields...");
  await configureTypeFields("Laptop", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "processor", isRequired: false, label: "Processor (CPU)" },
    { name: "ram", isRequired: true, label: "RAM Size" },
    { name: "storage_type", isRequired: true, label: "Storage Type" },
    { name: "storage_cap", isRequired: true, label: "Storage Capacity" },
    { name: "os", isRequired: false, label: "Operating System" },
    { name: "screen_size", isRequired: false, label: "Screen Size" },
    { name: "mac_address", isRequired: false, label: "MAC Address" },
    { name: "ip_address", isRequired: false, label: "IP Address" }
  ]);

  await configureTypeFields("Desktop Computer", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "processor", isRequired: false, label: "Processor (CPU)" },
    { name: "ram", isRequired: true, label: "RAM Size" },
    { name: "storage_type", isRequired: true, label: "Storage Type" },
    { name: "storage_cap", isRequired: true, label: "Storage Capacity" },
    { name: "os", isRequired: false, label: "Operating System" },
    { name: "mac_address", isRequired: false, label: "MAC Address" },
    { name: "ip_address", isRequired: false, label: "IP Address" }
  ]);

  await configureTypeFields("Printer", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "printer_type", isRequired: false, label: "Printer Type" },
    { name: "print_tech", isRequired: false, label: "Printing Technology" },
    { name: "color_mono", isRequired: true, label: "Color / Monochrome" },
    { name: "print_speed", isRequired: false, label: "Print Speed" },
    { name: "network_capability", isRequired: false, label: "Network Capability" }
  ]);

  await configureTypeFields("Scanner", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "resolution", isRequired: false, label: "Optical Resolution" },
    { name: "network_capability", isRequired: false, label: "Connectivity" }
  ]);

  await configureTypeFields("Router", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "num_ports", isRequired: false, label: "Number of Ports" },
    { name: "network_type", isRequired: false, label: "Network Type" },
    { name: "mac_address", isRequired: false, label: "MAC Address" },
    { name: "ip_address", isRequired: false, label: "IP Address" }
  ]);

  await configureTypeFields("Switch", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "num_ports", isRequired: true, label: "Number of Ports" },
    { name: "network_type", isRequired: false, label: "Network / Switch Type" },
    { name: "mac_address", isRequired: false, label: "MAC Address" },
    { name: "ip_address", isRequired: false, label: "IP Address" }
  ]);

  // Configure Electronics
  console.log("Configuring Electronics fields...");
  await configureTypeFields("Television", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "screen_size", isRequired: true, label: "Screen Size" },
    { name: "resolution", isRequired: false, label: "Resolution" },
    { name: "connectivity", isRequired: false, label: "Connectivity (HDMI, WiFi, etc.)" }
  ]);

  await configureTypeFields("Projector", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "resolution", isRequired: false, label: "Native Resolution" },
    { name: "brightness", isRequired: false, label: "Brightness (Lumens)" },
    { name: "projection_tech", isRequired: false, label: "Projection Technology" }
  ]);

  await configureTypeFields("Camera", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "camera_type", isRequired: false, label: "Camera Type" },
    { name: "resolution", isRequired: false, label: "Resolution (Megapixels)" },
    { name: "lens_spec", isRequired: false, label: "Lens / Specification" }
  ]);

  await configureTypeFields("Refrigerator", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "capacity", isRequired: false, label: "Capacity (Liters / Cu.Ft)" },
    { name: "energy_rating", isRequired: false, label: "Energy Rating" },
    { name: "cooling_type", isRequired: false, label: "Cooling Type" }
  ]);

  await configureTypeFields("Audio System", [
    { name: "brand", isRequired: true, label: "Brand / Manufacturer" },
    { name: "model", isRequired: true, label: "Model" },
    { name: "power_rating", isRequired: false, label: "Output Power Rating" },
    { name: "connectivity", isRequired: false, label: "Connectivity" }
  ]);

  // Configure Electrical Equipment
  console.log("Configuring Electrical Equipment fields...");
  await configureTypeFields("Generator", [
    { name: "brand", isRequired: false, label: "Manufacturer / Brand" },
    { name: "model", isRequired: false, label: "Model" },
    { name: "power_rating", isRequired: false, label: "Power Rating (kVA / kW)" },
    { name: "voltage", isRequired: false, label: "Output Voltage" },
    { name: "capacity", isRequired: false, label: "Fuel Tank Capacity" },
    { name: "energy_fuel_type", isRequired: false, label: "Fuel Type" },
    { name: "installation_date", isRequired: false, label: "Installation Date" }
  ]);

  await configureTypeFields("Air Conditioner", [
    { name: "brand", isRequired: false, label: "Manufacturer / Brand" },
    { name: "model", isRequired: false, label: "Model" },
    { name: "capacity", isRequired: false, label: "Cooling Capacity (BTU / Ton)" },
    { name: "power_rating", isRequired: false, label: "Power Rating (Watts)" },
    { name: "voltage", isRequired: false, label: "Voltage" },
    { name: "installation_date", isRequired: false, label: "Installation Date" }
  ]);

  await configureTypeFields("Water Heater", [
    { name: "brand", isRequired: false, label: "Manufacturer / Brand" },
    { name: "model", isRequired: false, label: "Model" },
    { name: "capacity", isRequired: false, label: "Tank Capacity (Liters)" },
    { name: "power_rating", isRequired: false, label: "Power Rating" },
    { name: "voltage", isRequired: false, label: "Voltage" },
    { name: "installation_date", isRequired: false, label: "Installation Date" }
  ]);

  // Configure Furniture
  console.log("Configuring Furniture fields...");
  for (const fType of ["Chair", "Desk", "Table", "Cabinet", "Bed"]) {
    await configureTypeFields(fType, [
      { name: "furniture_type", isRequired: false, label: "Furniture Type" },
      { name: "material", isRequired: true, label: "Material" },
      { name: "dimensions", isRequired: false, label: "Dimensions (W x D x H)" },
      { name: "color", isRequired: false, label: "Color" }
    ]);
  }

  // Configure Laboratory Equipment
  console.log("Configuring Laboratory Equipment fields...");
  await configureTypeFields("Microscope", [
    { name: "brand", isRequired: false, label: "Manufacturer / Brand" },
    { name: "model", isRequired: false, label: "Model" },
    { name: "equipment_type", isRequired: false, label: "Optical / Equipment Type" },
    { name: "measurement_range", isRequired: false, label: "Magnification Range" },
    { name: "accuracy", isRequired: false, label: "Resolution / Optics" },
    { name: "calibration_req", isRequired: false, label: "Calibration Required" },
    { name: "calibration_date", isRequired: false, label: "Last Calibration Date" },
    { name: "next_calibration_date", isRequired: false, label: "Next Calibration Date" }
  ]);

  await configureTypeFields("Centrifuge", [
    { name: "brand", isRequired: false, label: "Manufacturer / Brand" },
    { name: "model", isRequired: false, label: "Model" },
    { name: "capacity", isRequired: false, label: "Rotor Capacity" },
    { name: "power_rating", isRequired: false, label: "Maximum Speed (RPM)" },
    { name: "calibration_req", isRequired: false, label: "Calibration Required" },
    { name: "calibration_date", isRequired: false, label: "Last Calibration Date" },
    { name: "next_calibration_date", isRequired: false, label: "Next Calibration Date" }
  ]);

  await configureTypeFields("Oscilloscope", [
    { name: "brand", isRequired: false, label: "Manufacturer / Brand" },
    { name: "model", isRequired: false, label: "Model" },
    { name: "measurement_range", isRequired: false, label: "Bandwidth / Frequency Range" },
    { name: "accuracy", isRequired: false, label: "Sampling Rate / Accuracy" },
    { name: "calibration_req", isRequired: false, label: "Calibration Required" },
    { name: "calibration_date", isRequired: false, label: "Last Calibration Date" },
    { name: "next_calibration_date", isRequired: false, label: "Next Calibration Date" }
  ]);

  // Configure Building Equipment
  console.log("Configuring Building Equipment fields...");
  for (const bType of ["Door", "Window", "Water Tank", "Electrical Socket"]) {
    await configureTypeFields(bType, [
      { name: "material", isRequired: false, label: "Material" },
      { name: "dimensions", isRequired: false, label: "Dimensions" },
      { name: "floor", isRequired: false, label: "Floor Level" },
      { name: "room_area", isRequired: false, label: "Room / Area Location" }
    ]);
  }

  // Also ensure actual "Building" type exists under Building Equipment category so user can register buildings directly!
  const buildCat = await prisma.assetCategory.findFirst({
    where: { code: "BUILD" }
  });
  if (buildCat) {
    let buildingType = await prisma.assetType.findFirst({
      where: { name: "Building", categoryId: buildCat.id }
    });
    if (!buildingType) {
      buildingType = await prisma.assetType.create({
        data: {
          name: "Building",
          categoryId: buildCat.id,
          displayOrder: 0,
          description: "Whole campus building structure",
          includeAssetImage: true
        }
      });
      console.log("✓ Created 'Building' asset type under Building Equipment category.");
    }
    await configureTypeFields("Building", [
      { name: "floor", isRequired: false, label: "Total Floors" },
      { name: "dimensions", isRequired: false, label: "Gross Floor Area" }
    ]);
  }

  console.log("✓ All category-specific fields successfully created and bound.");
}

main()
  .catch((err) => {
    console.error("Setup error:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
