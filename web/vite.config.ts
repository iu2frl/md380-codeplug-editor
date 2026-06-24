import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  test: {
    projects: [
      {
        test: {
          include: ["src/ui/**/*.test.ts"],
          environment: "happy-dom",
        },
      },
      {
        test: {
          include: ["src/i18n/**/*.test.ts"],
          environment: "happy-dom",
        },
      },
      {
        test: {
          include: ["src/domain/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          include: ["src/state/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          include: ["src/transport/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
