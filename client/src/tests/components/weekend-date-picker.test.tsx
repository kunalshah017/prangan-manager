// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WeekendDatePicker } from "@/components/students/WeekendDatePicker";

afterEach(cleanup);

describe("WeekendDatePicker", () => {
  it.each([
    ["2026-04-11", "2026-04-05", "2026-04-11"],
    ["2026-04-11T00:00:00.000Z", "2026-04-05T00:00:00.000Z", "2026-04-11T23:59:59.999Z"],
  ])("opens with date-only or API timestamp values (%s)", (value, min, max) => {
    const onChange = vi.fn();
    render(<WeekendDatePicker label="Exam date" value={value} min={min} max={max} onChange={onChange} />);

    expect(screen.getByText("Saturday, 11 April 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Exam date" }));

    expect(screen.getByText("April 2026")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Saturday, April 4th/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Monday, April 6th/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Sunday, April 12th/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Sunday, April 5th/ }));

    expect(onChange).toHaveBeenCalledWith("2026-04-05");
    expect(screen.queryByText("April 2026")).toBeNull();
  });

  it("opens an empty exam date with API semester bounds", () => {
    render(<WeekendDatePicker label="Exam date" value="" min="2026-04-02T00:00:00.000Z" max="2026-04-11T23:59:59.999Z" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Exam date" }));
    expect(screen.getByText("April 2026")).toBeTruthy();
  });

  it("does not pass invalid dates to the calendar", () => {
    render(<WeekendDatePicker label="Exam date" value="invalid" min="invalid" max="invalid" onChange={() => {}} />);
    expect(screen.getByText("Choose a weekend")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Exam date" }));
    expect(screen.getByRole("grid")).toBeTruthy();
  });

  it("allows only weekends without semester bounds for pre-assessments", () => {
    const onChange = vi.fn();
    render(<WeekendDatePicker label="Exam date" value="2026-04-05" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Exam date" }));

    for (const name of [/Monday, April 6th/, /Tuesday, April 7th/, /Wednesday, April 8th/, /Thursday, April 9th/, /Friday, April 10th/]) {
      const weekday = screen.getByRole("button", { name }) as HTMLButtonElement;
      expect(weekday.disabled).toBe(true);
      fireEvent.click(weekday);
    }
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Saturday, April 11th/ }));
    expect(onChange).toHaveBeenCalledWith("2026-04-11");
  });

  it("keeps the attendance calendar closed when date selection is disabled", () => {
    const onChange = vi.fn();
    render(<WeekendDatePicker label="Attendance date" value="2026-04-05" onChange={onChange} disabled />);
    const button = screen.getByRole("button", { name: "Attendance date" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(screen.queryByRole("grid")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
