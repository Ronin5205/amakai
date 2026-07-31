/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@amakai/shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tests/tsconfig.json",
      },
    ],
  },
  clearMocks: true,
}

export default config
