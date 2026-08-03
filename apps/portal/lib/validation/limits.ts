/** Shared length and count limits for portal validation. */

export const RESOURCE_NAME_MAX_LENGTH = 30
export const RESOURCE_NAME_MIN_LENGTH = 1

export const RESOURCE_DESCRIPTION_MAX_LENGTH = 500

export const TABLE_COLUMN_MAX_COUNT = 50
export const TABLE_COLUMN_MIN_COUNT = 1
export const TABLE_COLUMN_LABEL_MAX_LENGTH = 64
export const TABLE_COLUMN_KEY_MAX_LENGTH = 64

export const OUTPUT_FIELD_NAME_MAX_LENGTH = 64
export const OUTPUT_FIELD_MAX_COUNT = 20
export const OUTPUT_FIELD_MIN_COUNT = 1

export const NODE_LABEL_MAX_LENGTH = 80

export const FIELD_EDIT_OUTPUT_NAME_MAX_LENGTH = 64
export const FIELD_RENAME_NAME_MAX_LENGTH = 64

export const COMPARE_VALUE_MAX_LENGTH = 2000
export const ERROR_MESSAGE_MAX_LENGTH = 500
export const CODE_MAX_LENGTH = 50_000

export const APPROVER_EMAIL_MAX_LENGTH = 254
export const APPROVER_ROLE_MAX_LENGTH = 64

export const MERGE_INPUT_MIN = 2
export const MERGE_INPUT_MAX = 8

export const SWITCH_CASE_MIN = 2
export const SWITCH_CASE_MAX = 12

export const EDIT_FIELD_COUNT_MIN = 1
export const EDIT_FIELD_COUNT_MAX = 12

export const WAIT_DURATION_MS_MIN = 0
export const WAIT_DURATION_MS_MAX = 86_400_000

/** Letters, numbers, spaces, and common punctuation for display names. */
export const RESOURCE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s.\-_()&]*$/

/** Snake-case column keys used in table schemas and mappings. */
export const TABLE_COLUMN_KEY_PATTERN = /^[a-z][a-z0-9_]*$/

/** JSON-style field names for trigger output and edit-field mappings. */
export const FIELD_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/
