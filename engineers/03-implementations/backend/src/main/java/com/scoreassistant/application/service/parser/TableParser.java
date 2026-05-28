package com.scoreassistant.application.service.parser;

import java.util.List;

public interface TableParser {
    List<String[]> parse(byte[] fileBytes) throws Exception;
}
