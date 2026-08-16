import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = [
  "/Users/sunggat/Downloads/anketa_metaprogrammy_dlya_shkolnikov_36_voprosov (1).xlsx",
  "/Users/sunggat/Downloads/vesovye_profili_professiy_744 (1).xlsx",
];

for (const file of files) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
  const overview = await workbook.inspect({
    kind: "workbook,sheet,table,region",
    maxChars: 24000,
    tableMaxRows: 16,
    tableMaxCols: 24,
    tableMaxCellChars: 160,
  });
  console.log(`\nFILE: ${file}\n${overview.ndjson}`);

  const sheets = await workbook.inspect({
    kind: "sheet",
    include: "id,name",
    maxChars: 8000,
  });
  console.log(`\nSHEETS:\n${sheets.ndjson}`);

  for (const line of sheets.ndjson.split("\n").filter(Boolean)) {
    const item = JSON.parse(line);
    const name = item.name;
    if (!name) continue;
    const sheet = workbook.worksheets.getItem(name);
    const used = sheet.getUsedRange(true);
    console.log(`\nUSED ${name}: ${used?.address ?? "none"}`);
    if (used) {
      const preview = await workbook.render({
        sheetName: name,
        autoCrop: "all",
        scale: 1,
        format: "png",
      });
      const safe = name.replaceAll(/[^A-Za-z0-9А-Яа-я_-]/g, "_");
      await fs.writeFile(
        `/Users/sunggat/Documents/ADAM/.source-preview-${files.indexOf(file)}-${safe}.png`,
        new Uint8Array(await preview.arrayBuffer()),
      );
    }
  }
}
