// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ExpandableText } from "@/components/workspace/ExpandableText";

afterEach(cleanup);

describe("ExpandableText", () => {
  it("expands and collapses long copy accessibly", () => {
    const text =
      "A long project description that explains the history, community, volunteers, learners, locations, and goals in enough detail to need a compact dashboard treatment.";

    render(<ExpandableText text={text} collapseAfter={80} />);

    const content = screen.getByText(text);
    const toggle = screen.getByRole("button", { name: "Read more" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe(content.id);
    expect(content.className).toContain("line-clamp-3");

    fireEvent.click(toggle);
    expect(toggle.textContent).toBe("Show less");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(content.className).not.toContain("line-clamp-3");
  });

  it("does not add a toggle for short copy", () => {
    render(<ExpandableText text="Short address" collapseAfter={80} />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
