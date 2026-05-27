-- ============================================================
-- Score Assistant — DDL Schema for H2 R2DBC
-- ============================================================

CREATE TYPE IF NOT EXISTS grade_item_type AS ENUM (
    'ATTENDANCE', 'CLASSROOM_PERFORMANCE', 'ASSIGNMENT', 'REPORT', 'OTHER'
);

CREATE TABLE IF NOT EXISTS semester (
    id            UUID        PRIMARY KEY,
    semester_name VARCHAR(255) NOT NULL,
    start_date    DATE        NOT NULL,
    end_date      DATE        NOT NULL,
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP,
    deleted       BOOLEAN     DEFAULT FALSE NOT NULL,
    deleted_at    TIMESTAMP,
    active_status VARCHAR(36) AS (CASE WHEN deleted = FALSE THEN 'ACTIVE' ELSE CAST(id AS VARCHAR(36)) END)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_semester_name_active ON semester(semester_name, active_status);

CREATE TABLE IF NOT EXISTS class (
    id                UUID          PRIMARY KEY,
    semester_id       UUID          NOT NULL,
    class_name        VARCHAR(255)  NOT NULL,
    class_group       VARCHAR(255),
    passing_threshold DECIMAL(10,2) DEFAULT 60.0,
    created_at        TIMESTAMP,
    updated_at        TIMESTAMP,
    deleted           BOOLEAN       DEFAULT FALSE NOT NULL,
    deleted_at        TIMESTAMP,
    active_status     VARCHAR(36)   AS (CASE WHEN deleted = FALSE THEN 'ACTIVE' ELSE CAST(id AS VARCHAR(36)) END),
    FOREIGN KEY (semester_id) REFERENCES semester(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_semester_name_active ON class(semester_id, class_name, active_status);

CREATE TABLE IF NOT EXISTS student (
    id             UUID         PRIMARY KEY,
    class_id       UUID         NOT NULL,
    student_id     VARCHAR(255) NOT NULL,
    student_number INT          NOT NULL,
    student_name   VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP,
    deleted        BOOLEAN      DEFAULT FALSE NOT NULL,
    deleted_at     TIMESTAMP,
    active_status  VARCHAR(36)  AS (CASE WHEN deleted = FALSE THEN 'ACTIVE' ELSE CAST(id AS VARCHAR(36)) END),
    FOREIGN KEY (class_id) REFERENCES class(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_class_number_active ON student(class_id, student_number, active_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_id_active ON student(student_id, active_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_email_active ON student(email, active_status);

CREATE TABLE IF NOT EXISTS grade_item (
    id               UUID          PRIMARY KEY,
    class_id         UUID          NOT NULL,
    item_name        VARCHAR(255)  NOT NULL,
    item_type        VARCHAR(50)   NOT NULL,
    item_date        DATE,
    item_description VARCHAR(1000),
    max_score        DECIMAL(10,2) DEFAULT 100.0 NOT NULL,
    weight           DECIMAL(5,4)  DEFAULT 0.0   NOT NULL,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    deleted          BOOLEAN       DEFAULT FALSE NOT NULL,
    deleted_at       TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES class(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grade_record (
    id               UUID          PRIMARY KEY,
    grade_item_id    UUID          NOT NULL,
    student_id       UUID          NOT NULL,
    score            DECIMAL(10,2),
    last_modified_at TIMESTAMP,
    version          INT           DEFAULT 1 NOT NULL,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    deleted          BOOLEAN       DEFAULT FALSE NOT NULL,
    deleted_at       TIMESTAMP,
    active_status    VARCHAR(36)   AS (CASE WHEN deleted = FALSE THEN 'ACTIVE' ELSE CAST(id AS VARCHAR(36)) END),
    FOREIGN KEY (grade_item_id) REFERENCES grade_item(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)    REFERENCES student(id)    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_grade_record_item_student_active ON grade_record(grade_item_id, student_id, active_status);

CREATE TABLE IF NOT EXISTS attachment (
    id              UUID         PRIMARY KEY,
    grade_record_id UUID         NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INT          NOT NULL,
    file_data       BYTEA        NOT NULL,
    uploaded_at     TIMESTAMP,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    deleted         BOOLEAN      DEFAULT FALSE NOT NULL,
    deleted_at      TIMESTAMP,
    FOREIGN KEY (grade_record_id) REFERENCES grade_record(id) ON DELETE CASCADE
);
