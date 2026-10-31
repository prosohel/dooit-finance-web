'use client'

import { stepType, STEP_TYPE_ORDER } from '../../lib/stepTypes'

/**
 * Step Palette: lists all available step types with icon, label, and hint.
 * Clicking a row calls onAdd(type) to add that step to the canvas.
 * Below the list is a help panel with canvas instructions.
 */
export default function StepPalette({ onAdd }) {
  return (
    <div className="flex flex-col h-full bg-card border-r border-border p-4 overflow-y-auto">
      <div className="font-mono text-xs uppercase tracking-wider text-foreground mb-3 px-1">
        Add step
      </div>

      {/* Step list */}
      <div className="space-y-1 flex-1">
        {STEP_TYPE_ORDER.map((typeKey) => {
          const t = stepType(typeKey)
          return (
            <button
              key={typeKey}
              onClick={() => onAdd(typeKey)}
              className="w-full flex items-center gap-3 p-2 rounded-lg border border-transparent hover:bg-muted hover:border-border transition-colors text-left"
            >
              {/* Icon badge */}
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: `var(${t.colorVar})` }}
              >
                {t.iconLetter}
              </div>

              {/* Label and hint */}
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {t.paletteName || t.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.hint}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Help panel */}
      <div className="mt-4 p-3 rounded-lg bg-[var(--sidebar-bg)] text-xs text-foreground leading-relaxed space-y-1">
        <p>
          <strong>Drag</strong> a step to reposition it, or <strong>click</strong> to open its settings.
        </p>
        <p>
          <strong>Drag</strong> from the circle on a step to another step to connect them.
        </p>
        <p>
          <strong>Click</strong> a connector to remove it, or press <strong>Delete</strong> to remove the selected step.
        </p>
        <p>
          <strong>Scroll</strong> to zoom, <strong>drag</strong> the canvas to pan.
        </p>
      </div>
    </div>
  )
}
