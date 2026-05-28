package com.scoreassistant.application.service.parser;

import org.apache.poi.ss.usermodel.*;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

public class ExcelTableParser implements TableParser {
    @Override
    public List<String[]> parse(byte[] fileBytes) throws Exception {
        List<String[]> rows = new ArrayList<>();
        try (var is = new ByteArrayInputStream(fileBytes);
             var workbook = WorkbookFactory.create(is)) {
            
            if (workbook.getNumberOfSheets() == 0) {
                return rows;
            }

            var sheet = workbook.getSheetAt(0);
            var formatter = new DataFormatter();
            
            // Find header row (first non-empty row)
            Row headerRow = null;
            int headerRowIdx = 0;
            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                var row = sheet.getRow(r);
                if (!isRowEmpty(row)) {
                    headerRow = row;
                    headerRowIdx = r;
                    break;
                }
            }

            if (headerRow == null) {
                return rows;
            }

            int headerCellsCount = headerRow.getLastCellNum();
            if (headerCellsCount <= 0) {
                return rows;
            }

            // Parse header row
            String[] headerCells = new String[headerCellsCount];
            for (int c = 0; c < headerCellsCount; c++) {
                headerCells[c] = formatter.formatCellValue(headerRow.getCell(c)).trim();
            }
            rows.add(headerCells);

            // Parse subsequent rows
            for (int r = headerRowIdx + 1; r <= sheet.getLastRowNum(); r++) {
                var row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }

                String[] cells = new String[headerCellsCount];
                boolean hasValue = false;
                for (int c = 0; c < headerCellsCount; c++) {
                    var cell = row.getCell(c);
                    String val = formatter.formatCellValue(cell).trim();
                    if (!val.isEmpty()) {
                        hasValue = true;
                    }
                    cells[c] = val;
                }

                if (hasValue) {
                    rows.add(cells);
                }
            }
        }
        return rows;
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = new DataFormatter().formatCellValue(cell).trim();
                if (!val.isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }
}
