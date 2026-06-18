/**
 * Unit tests for the membership picker dialog.
 *
 * Focused on the buffered selection behaviour and, in particular, the maximum
 * selection limit that each editor relies on (zones = 16, scan lists = 31,
 * group lists = 32).
 *
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { showMembershipPicker, type MembershipPickerItem } from "./dialog";

function makeItems(count: number): MembershipPickerItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    label: `#${index + 1} Item ${index + 1}`,
  }));
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function getCard(): HTMLElement {
  const card = document.body.querySelector<HTMLElement>(".picker-card");
  if (!card) {
    throw new Error("picker card not rendered");
  }
  return card;
}

function checkbox(id: number): HTMLInputElement {
  const input = getCard().querySelector<HTMLInputElement>(`input[data-picker-id="${id}"]`);
  if (!input) {
    throw new Error(`checkbox ${id} not found`);
  }
  return input;
}

function setChecked(id: number, checked: boolean): void {
  const input = checkbox(id);
  input.checked = checked;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("showMembershipPicker", () => {
  it("returns the buffered selection on Apply", async () => {
    const promise = showMembershipPicker({
      title: "Pick",
      items: makeItems(5),
      selectedIds: [1],
      maxSelection: 5,
      itemNoun: "channels",
    });

    setChecked(3, true);
    getCard().querySelector<HTMLButtonElement>(".picker-apply")?.click();

    const result = await promise;
    expect(result).toEqual([1, 3]);
  });

  it("returns null on Cancel and keeps the original selection untouched", async () => {
    const promise = showMembershipPicker({
      title: "Pick",
      items: makeItems(5),
      selectedIds: [1, 2],
      maxSelection: 5,
      itemNoun: "channels",
    });

    setChecked(4, true);
    getCard().querySelector<HTMLButtonElement>(".picker-cancel")?.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it("preserves prior order and appends new ids in item order", async () => {
    const promise = showMembershipPicker({
      title: "Pick",
      items: makeItems(6),
      selectedIds: [5, 2],
      maxSelection: 6,
      itemNoun: "channels",
    });

    // Add #1 then #4; existing [5, 2] keep their order, new ones appended in item order.
    setChecked(4, true);
    setChecked(1, true);
    getCard().querySelector<HTMLButtonElement>(".picker-apply")?.click();

    const result = await promise;
    expect(result).toEqual([5, 2, 1, 4]);
  });

  it("filters items via the search box", async () => {
    const promise = showMembershipPicker({
      title: "Pick",
      items: [
        { id: 1, label: "Alpha" },
        { id: 2, label: "Bravo" },
        { id: 3, label: "Alpine" },
      ],
      selectedIds: [],
      maxSelection: 5,
      itemNoun: "channels",
    });

    const search = getCard().querySelector<HTMLInputElement>(".picker-search");
    search!.value = "alp";
    search!.dispatchEvent(new Event("input", { bubbles: true }));

    const visibleIds = [...getCard().querySelectorAll<HTMLInputElement>("input[data-picker-id]")].map(
      (input) => input.dataset.pickerId,
    );
    expect(visibleIds).toEqual(["1", "3"]);

    getCard().querySelector<HTMLButtonElement>(".picker-cancel")?.click();
    await promise;
  });

  describe("maximum selection limit", () => {
    const cases = [
      { label: "zones", max: 16, itemNoun: "channels" },
      { label: "scan lists", max: 31, itemNoun: "channels" },
      { label: "group lists", max: 32, itemNoun: "contacts" },
    ];

    for (const { label, max, itemNoun } of cases) {
      it(`enforces the ${label} maximum of ${max}`, async () => {
        const promise = showMembershipPicker({
          title: `Edit ${label}`,
          items: makeItems(max + 5),
          selectedIds: range(1, max),
          maxSelection: max,
          itemNoun,
        });

        const card = getCard();
        const counter = card.querySelector<HTMLElement>(".picker-counter");

        // Already at the limit: counter is full and unchecked rows are disabled.
        expect(counter?.textContent).toContain(`${max}/${max} ${itemNoun} selected`);
        expect(counter?.classList.contains("picker-counter-full")).toBe(true);
        expect(checkbox(max + 1).disabled).toBe(true);
        expect(checkbox(max + 3).disabled).toBe(true);

        // Trying to add one more beyond the limit is rejected.
        setChecked(max + 1, true);
        expect(checkbox(max + 1).checked).toBe(false);
        expect(counter?.textContent).toContain(`${max}/${max} ${itemNoun} selected`);

        // Removing one frees a slot and re-enables the previously disabled rows.
        setChecked(max, false);
        expect(counter?.textContent).toContain(`${max - 1}/${max} ${itemNoun} selected`);
        expect(checkbox(max + 1).disabled).toBe(false);

        // Now a new item can be added, keeping the count exactly at the limit.
        setChecked(max + 1, true);
        expect(checkbox(max + 1).checked).toBe(true);
        expect(counter?.textContent).toContain(`${max}/${max} ${itemNoun} selected`);

        card.querySelector<HTMLButtonElement>(".picker-apply")?.click();
        const result = await promise;
        expect(result).toHaveLength(max);
        // Kept ids 1..max-1 in order, then newly added id max+1 appended.
        expect(result).toEqual([...range(1, max - 1), max + 1]);
      });
    }
  });
});
