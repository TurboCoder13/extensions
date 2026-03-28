import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  getPresets,
  savePreset,
  updatePreset,
  deletePreset,
  getPresetById,
  DEFAULT_PRESETS,
  type RenamePreset,
} from "../lib/presets";

const mockStorage = LocalStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPresets", () => {
  it("returns empty array when no data stored", async () => {
    mockStorage.getItem.mockResolvedValue(null);
    const result = await getPresets();
    expect(result).toEqual([]);
  });

  it("parses stored JSON data", async () => {
    const presets = [{ id: "p1", name: "Test", createdAt: 1000, config: {} }];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(presets));
    const result = await getPresets();
    expect(result).toEqual(presets);
  });

  it("returns empty array on invalid JSON", async () => {
    mockStorage.getItem.mockResolvedValue("bad json");
    const result = await getPresets();
    expect(result).toEqual([]);
  });

  it("returns empty array on corrupted data and backs it up", async () => {
    mockStorage.getItem.mockResolvedValue("{corrupted[data");
    const result = await getPresets();
    expect(result).toEqual([]);
    // Should attempt to back up corrupted data
    expect(mockStorage.setItem).toHaveBeenCalledWith(expect.stringContaining("corrupted-backup"), "{corrupted[data");
  });
});

describe("savePreset", () => {
  it("generates id and createdAt, stores in LocalStorage", async () => {
    mockStorage.getItem.mockResolvedValue("[]");

    const result = await savePreset({ name: "My Preset", config: {} });

    expect(result.id).toMatch(/^preset_/);
    expect(result.createdAt).toBeGreaterThan(0);
    expect(result.name).toBe("My Preset");
    expect(mockStorage.setItem).toHaveBeenCalledOnce();
  });

  it("appends to existing presets", async () => {
    const existing = [{ id: "p1", name: "Existing", createdAt: 1000, config: {} }];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));

    await savePreset({ name: "New Preset", config: {} });

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(2);
    expect(stored[0].name).toBe("Existing");
    expect(stored[1].name).toBe("New Preset");
  });

  it("preserves description and type fields", async () => {
    mockStorage.getItem.mockResolvedValue("[]");

    const result = await savePreset({
      name: "Replace Spaces",
      description: "Replace spaces with underscores",
      type: "replace",
      config: { replacePattern: " ", replacement: "_" },
    });

    expect(result.description).toBe("Replace spaces with underscores");
    expect(result.type).toBe("replace");
    expect(result.config.replacePattern).toBe(" ");
  });
});

describe("updatePreset", () => {
  const existing: RenamePreset[] = [{ id: "p1", name: "Old", createdAt: 1000, config: {} }];

  it("updates existing preset and returns true", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await updatePreset("p1", { name: "New" });
    expect(result).toBe(true);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].name).toBe("New");
  });

  it("returns false for non-existent preset", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await updatePreset("nonexistent", { name: "New" });
    expect(result).toBe(false);
  });

  it("preserves fields not included in update", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    await updatePreset("p1", { name: "Updated" });
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].id).toBe("p1");
    expect(stored[0].createdAt).toBe(1000);
  });
});

describe("deletePreset", () => {
  const existing: RenamePreset[] = [
    { id: "p1", name: "One", createdAt: 1000, config: {} },
    { id: "p2", name: "Two", createdAt: 2000, config: {} },
  ];

  it("removes preset and returns true", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await deletePreset("p1");
    expect(result).toBe(true);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("p2");
  });

  it("returns false for non-existent preset", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await deletePreset("nonexistent");
    expect(result).toBe(false);
  });
});

describe("getPresetById", () => {
  const existing: RenamePreset[] = [{ id: "p1", name: "Test", createdAt: 1000, config: {} }];

  it("finds preset by id", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await getPresetById("p1");
    expect(result).toBeDefined();
    expect(result!.name).toBe("Test");
  });

  it("returns null for non-existent preset", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await getPresetById("nonexistent");
    expect(result).toBeNull();
  });
});

describe("DEFAULT_PRESETS", () => {
  it("is a non-empty array", () => {
    expect(DEFAULT_PRESETS.length).toBeGreaterThan(0);
  });

  it("contains presets with required fields", () => {
    for (const preset of DEFAULT_PRESETS) {
      expect(preset.name).toBeDefined();
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.config).toBeDefined();
    }
  });

  it("contains both rename and replace type presets", () => {
    const types = DEFAULT_PRESETS.map((p) => p.type);
    expect(types).toContain("rename");
    expect(types).toContain("replace");
  });

  it("includes Photo Sequence preset", () => {
    const photoPreset = DEFAULT_PRESETS.find((p) => p.name === "Photo Sequence");
    expect(photoPreset).toBeDefined();
    expect(photoPreset!.type).toBe("rename");
  });

  it("includes Clean Filenames preset", () => {
    const cleanPreset = DEFAULT_PRESETS.find((p) => p.name === "Clean Filenames");
    expect(cleanPreset).toBeDefined();
  });

  it("includes Remove Spaces preset", () => {
    const spacesPreset = DEFAULT_PRESETS.find((p) => p.name === "Remove Spaces");
    expect(spacesPreset).toBeDefined();
    expect(spacesPreset!.type).toBe("replace");
    expect(spacesPreset!.config.replacePattern).toBe(" ");
    expect(spacesPreset!.config.replacement).toBe("_");
  });

  it("includes Remove Special Characters preset", () => {
    const specialPreset = DEFAULT_PRESETS.find((p) => p.name === "Remove Special Characters");
    expect(specialPreset).toBeDefined();
    expect(specialPreset!.config.useRegex).toBe(true);
  });
});
