package com.scoreassistant.application.service.parser;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

public class CsvTableParser implements TableParser {
    @Override
    public List<String[]> parse(byte[] fileBytes) throws Exception {
        var csvStr = new String(fileBytes, StandardCharsets.UTF_8);
        if (csvStr.startsWith("\uFEFF")) {
            csvStr = csvStr.substring(1);
        }
        return csvStr.lines()
                .filter(l -> !l.isBlank())
                .map(l -> Arrays.stream(l.split(","))
                        .map(String::trim)
                        .toArray(String[]::new))
                .toList();
    }
}
