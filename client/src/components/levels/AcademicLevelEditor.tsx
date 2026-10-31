import { useState, type FormEvent } from "react";
import { Archive, ArrowDown, ArrowUp, Layers, Pencil, Plus, RotateCcw } from "lucide-react";

import { CustomButton } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { FormField, FormSection } from "@/components/workspace/FormParts";
import { EmptyState } from "@/components/workspace/PageState";
import { buttonVariants } from "@/lib/button-variants";
import { levelCode, sortByJourneyOrder } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { AcademicLevel } from "@/types/api";

const normalizeLevelCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const iconButtonClassName =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none";

interface AcademicLevelEditorProps {
  levels: AcademicLevel[];
  isMutating: boolean;
  onCreate: (data: { code: string; name: string }) => Promise<boolean>;
  onRename: (level: AcademicLevel, name: string) => Promise<boolean>;
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
  const activeLevels = orderedLevels.filter((level) => level.isActive);
  const archivedLevels = orderedLevels.filter((level) => !level.isActive);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const codePreview = normalizeLevelCode(newCode || newName);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || codePreview.length < 2) return;
    if (await onCreate({ code: codePreview, name })) {
      setNewName("");
      setNewCode("");
    }
  };

  // The row stays open when saving fails, so the typed name is not lost.
  const handleRename = async (event: FormEvent<HTMLFormElement>, level: AcademicLevel) => {
    event.preventDefault();
    const name = editing?.name.trim();
    if (!name) return;
    if (name === level.name || (await onRename(level, name))) setEditing(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
      <div className="min-w-0 space-y-6">
        <section aria-labelledby="level-journey-heading" className="space-y-3">
          <h2 id="level-journey-heading" className="text-lg font-semibold text-foreground">
            Learning journey{" "}
            <span className="font-normal tabular-nums text-muted-foreground">{activeLevels.length}</span>
          </h2>

          {activeLevels.length > 0 ? (
            <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {activeLevels.map((level, index) =>
                editing?.id === level.id ? (
                  <li key={level.id}>
                    <form onSubmit={(event) => void handleRename(event, level)} className="space-y-4 bg-accent/40 p-3 sm:p-4">
                      <FormField
                        htmlFor={`level-name-${level.id}`}
                        label="Name"
                        hint={`The code ${levelCode(level)} stays the same.`}
                      >
                        <Input
                          id={`level-name-${level.id}`}
                          value={editing.name}
                          onChange={(event) => setEditing({ id: level.id, name: event.target.value })}
                          aria-describedby={`level-name-${level.id}-hint`}
                          disabled={isMutating}
                          required
                          autoFocus
                        />
                      </FormField>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null);
                            onArchiveRequest(level);
                          }}
                          disabled={isMutating}
                          className="mr-auto inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-40 motion-reduce:transition-none"
                        >
                          <Archive className="h-4 w-4" aria-hidden="true" />
                          Archive
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className={cn(buttonVariants({ variant: "ghost" }), "min-h-11")}
                        >
                          Cancel
                        </button>
                        <CustomButton type="submit" isLoading={isMutating} loadingMessage="Saving..." className="min-h-11">
                          Save
                        </CustomButton>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li key={level.id} className="flex min-h-[4.5rem] items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
                    {/* The list is ordered, so the number is only visual. */}
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold tabular-nums text-primary"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-foreground">{level.name}</p>
                      <p className="truncate font-mono text-sm text-muted-foreground">{levelCode(level)}</p>
                    </div>
                    <div className="-mr-1 flex shrink-0">
                      <button
                        type="button"
                        aria-label={`Move ${level.name} up`}
                        title="Move up"
                        disabled={index === 0 || isMutating}
                        onClick={() => onMove(level, -1)}
                        className={iconButtonClassName}
                      >
                        <ArrowUp className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${level.name} down`}
                        title="Move down"
                        disabled={index === activeLevels.length - 1 || isMutating}
                        onClick={() => onMove(level, 1)}
                        className={iconButtonClassName}
                      >
                        <ArrowDown className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit ${level.name}`}
                        title="Edit"
                        disabled={isMutating}
                        onClick={() => setEditing({ id: level.id, name: level.name })}
                        className={iconButtonClassName}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ol>
          ) : (
            <EmptyState
              icon={Layers}
              title="No academic levels yet"
              description="Add the first level to start the learning journey."
            />
          )}
        </section>

        {archivedLevels.length > 0 && (
          <section aria-labelledby="archived-levels-heading" className="space-y-3">
            <h2 id="archived-levels-heading" className="text-lg font-semibold text-foreground">
              Archived{" "}
              <span className="font-normal tabular-nums text-muted-foreground">{archivedLevels.length}</span>
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {archivedLevels.map((level) => (
                <li key={level.id} className="flex min-h-[4.5rem] items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-muted-foreground">{level.name}</p>
                    <p className="truncate font-mono text-sm text-muted-foreground">{levelCode(level)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Restore ${level.name}`}
                    disabled={isMutating}
                    onClick={() => onRestore(level)}
                    className={cn(buttonVariants({ variant: "outline" }), "min-h-11 shrink-0 gap-2")}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="lg:sticky lg:top-4">
        <FormSection id="create-level-heading" title="Add a level">
          <form onSubmit={handleCreate} className="space-y-5">
            <FormField htmlFor="new-level-name" label="Name" required>
              <Input
                id="new-level-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Primary C"
                required
              />
            </FormField>
            <FormField
              htmlFor="new-level-code"
              label="Code"
              hint={`Saved as ${codePreview || "LEVEL_CODE"}. Code cannot be changed after creation.`}
            >
              <Input
                id="new-level-code"
                value={newCode}
                onChange={(event) => setNewCode(event.target.value)}
                placeholder={normalizeLevelCode(newName) || "PRIMARY_C"}
                aria-describedby="new-level-code-hint"
                className="font-mono uppercase"
              />
            </FormField>
            <CustomButton type="submit" isLoading={isMutating} loadingMessage="Adding..." className="min-h-12 w-full gap-2 text-base">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Add level
            </CustomButton>
          </form>
        </FormSection>
      </div>
    </div>
  );
}
