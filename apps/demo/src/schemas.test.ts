import { describe, expect, it } from "vitest";
import { productHuntSchema, demoFillers } from "./schemas.js";

describe("demo schemas", () => {
  it("keeps the Product Hunt tagline within maxLength", () => {
    const values = demoFillers.productHunt();
    expect(values.tagline.length).toBeLessThanOrEqual(
      productHuntSchema.properties?.tagline?.maxLength ?? 60,
    );
  });
});
