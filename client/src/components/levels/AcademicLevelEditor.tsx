import { useEffect, useState, type FormEvent } from "react";
import { Archive, ArrowDown, ArrowUp, Plus, RotateCcw, Save } from "lucide-react";

import { CustomButton } from "@/components/ui/button";
import { levelCode, sortByJourneyOrder } from "@/lib/levels";
import type { AcademicLevel } from "@/types/api";

const normalizeLevelCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

interface AcademicLevelEditorProps {
  levels: AcademicLevel[];
  isMutating: boolean;
  onCreate: (data: { code: string; name: string }) => Promise<boolean>;
  onRename: (level: AcademicLevel, name: string) => void;
  onArchiveRequest: (level: AcademicLevel) => void;
  onRestore: (level: AcademicLevel) => void;
  onMove: (level: AcademicLevel, direction: -1 | 1) => void;
}

export function AcademicLevelEditor({
  levels,
  isMutating,
  onCreate,
  onRename,
  onArchiveRequest,
  onRestore,
  onMove,
}: AcademicLevelEditorProps) {
  const orderedLevels = sortByJourneyOrder(levels);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    setNames(Object.fromEntries(levels.map((level) => [level.id, level.name])));
  }, [levels]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    const code = normalizeLevelCode(newCode || newName);
    if (!name || code.length < 2) return;
    if (await onCreate({ code, name })) {
      setNewName("");
      setNewCode("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="create-level-heading">
        <h2 id="create-level-heading" className="text-lg font-semibold text-foreground">Create a level</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Add a reusable definition to the end of the learning journey.</p>
        <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.65fr)_auto] md:items-end">
          <div>
            <label htmlFor="new-level-name" className="mb-2 block text-sm font-medium text-foreground">Name</label>
            <input id="new-level-name" value={newName} onChange={(event) => setNewName(event.target.value)} required className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Primary C" />
          </div>
          <div>
            <label htmlFor="new-level-code" className="mb-2 block text-sm font-medium text-foreground">Code</label>
            <input id="new-level-code" value={newCode} onChange={(event) => setNewCode(event.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 font-mono text-base uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder={normalizeLevelCode(newName) || "PRIMARY_C"} />
            <p className="mt-1 text-xs text-muted-foreground">Preview: {normalizeLevelCode(newCode || newName) || "LEVEL_CODE"}. Code cannot be changed after creation.</p>
          </div>
          <CustomButton type="submit" isLoading={isMutating} loadingMessage="Creating..." className="min-h-11 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />Create level
          </CustomButton>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-labelledby="level-journey-heading">
        <div className="border-b border-border p-5 sm:p-6">
          <h2 id="level-journey-heading" className="text-lg font-semibold text-foreground">Learning journey</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">The order here is used wherever levels are selected or displayed.</p>
        </div>
        <ol className="divide-y divide-border">
          {orderedLevels.map((level, index) => (
            <li key={level.id} className="grid gap-4 p-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold tabular-nums text-muted-foreground" aria-label={`Journey position ${index + 1}`}>{index + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{levelCode(level)}</span>
                  {!level.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>}
                </div>
                <label htmlFor={`level-name-${level.id}`} className="sr-only">Name for {level.name}</label>
                <input id={`level-name-${level.id}`} value={names[level.id] ?? level.name} onChange={(event) => setNames((current) => ({ ...current, [level.id]: event.target.value }))} disabled={isMutating} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-base font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button type="button" aria-label={`Move ${level.name} up`} title="Move up" disabled={index === 0 || isMutating} onClick={() => onMove(level, -1)} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-input text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" aria-label={`Move ${level.name} down`} title="Move down" disabled={index === orderedLevels.length - 1 || isMutating} onClick={() => onMove(level, 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-input text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" aria-label={`Rename ${level.name}`} disabled={isMutating || !(names[level.id] ?? "").trim() || names[level.id]?.trim() === level.name} onClick={() => onRename(level, names[level.id].trim())} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><Save className="h-4 w-4" aria-hidden="true" />Rename</button>
                {level.isActive ? (
                  <button type="button" aria-label={`Archive ${level.name}`} disabled={isMutating} onClick={() => onArchiveRequest(level)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-40"><Archive className="h-4 w-4" aria-hidden="true" />Archive</button>
                ) : (
                  <button type="button" aria-label={`Restore ${level.name}`} disabled={isMutating} onClick={() => onRestore(level)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><RotateCcw className="h-4 w-4" aria-hidden="true" />Restore</button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}