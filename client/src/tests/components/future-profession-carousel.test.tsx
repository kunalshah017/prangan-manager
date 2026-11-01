// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import FutureProfessionCarousel from "@/components/FutureProfessionCarousel";
import { displayImageUrl, fallBackToOriginal } from "@/lib/cloudinary";
import type { Student } from "@/types/api";

const photo = (name: string) => `https://res.cloudinary.com/demo/image/upload/v1700000000/prangan-manager/${name}.jpg`;
const student = (id: string, name: string, futureProfession?: string): Student =>
  ({
    id,
    name,
    futureProfession,
    profileImageUrl: photo(`${id}-today`),
    futureProfessionImageUrl: photo(`${id}-future`),
  }) as Student;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("display-size photos", () => {
  it("asks Cloudinary for the named smaller copy, and leaves other URLs alone", () => {
    expect(displayImageUrl(photo("asha"))).toBe(
      "https://res.cloudinary.com/demo/image/upload/t_pm_display/v1700000000/prangan-manager/asha.jpg",
    );
    expect(displayImageUrl("https://example.com/asha.jpg")).toBe("https://example.com/asha.jpg");
  });

  it("falls back to the original when the copy is refused, then keeps using originals", () => {
    const image = document.createElement("img");
    image.src = displayImageUrl(photo("ravi"));
    fallBackToOriginal(image, photo("ravi"));
    expect(image.src).toBe(photo("ravi"));
    expect(displayImageUrl(photo("mira"))).toBe(photo("mira"));
  });
});

describe("future professions carousel", () => {
  it("shows students with both photos, with pause and a larger view", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    render(
      <FutureProfessionCarousel
        students={[
          student("1", "Asha Shah", "Doctor"),
          { ...student("2", "No Photo"), futureProfessionImageUrl: undefined } as Student,
          student("3", "Ravi Kumar", "Pilot"),
        ]}
      />,
    );
    expect(screen.getByText("Asha Shah")).toBeTruthy();
    expect(screen.getByText("Future Doctor")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Asha Shah today" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pause slideshow" }));
    expect(screen.getByRole("button", { name: "Play slideshow" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View larger" }));
    expect(screen.getByRole("dialog", { name: "Asha Shah" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
