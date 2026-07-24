import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("DoodleBackground", () => {
  it("restores floating educational icons over a subtle grid", async () => {
    const source = await readFile(
      new URL("../../components/DoodleBackground.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("EDUCATIONAL_ICONS");
    expect(source).toContain("Math.random");
    expect(source).toContain("doodle-grid");
    expect(source).toContain("doodle-plus-pattern");
    expect(source).toContain("motion.div");
  });

  it("supports deterministic static doodles for operational pages", async () => {
    const background = await readFile(
      new URL("../../components/DoodleBackground.tsx", import.meta.url),
      "utf8",
    );
    const styles = await readFile(
      new URL("../../index.css", import.meta.url),
      "utf8",
    );
    const operationalSources = await Promise.all(
      [
        "../../pages/projects/Projects.tsx",
        "../../pages/centers/Centers.tsx",
        "../../components/projects/ProjectFormLayout.tsx",
        "../../components/centers/CenterFormLayout.tsx",
      ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
    );

    expect(background).toContain("animated?: boolean");
    expect(background).toContain("animated = true");
    expect(background).toContain("doodle-plus-pattern-static");
    expect(background).toContain("staticRotation");
    expect(styles).toContain(".doodle-plus-pattern-static");
    for (const source of operationalSources) {
      expect(source).toContain(
        "<DoodleBackground animated={false} numElements={6} />",
      );
      expect(source).not.toContain(
        'className="doodle-grid pointer-events-none fixed inset-0"',
      );
    }
  });
});
