"use client";

import FormFieldInput from "./FormFieldInput";

/**
 * A titled card of form fields — one "part" of a structured narrative
 * (ECDD/GFS) or SMR form. `heading` is optional (SMR parts C–H render a
 * single unheaded note + field grid).
 */
export default function FormSection({ heading, note, fields }) {
  return (
    <div className={heading ? "rounded-xl border border-dashed border-black/[0.12] p-5" : ""}>
      {heading && <div className="mb-4 text-[15px] font-bold text-heading">{heading}</div>}
      {note && <div className="mb-3.5 text-xs italic text-muted-foreground">{note}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <FormFieldInput key={f.label} field={f} />
        ))}
      </div>
    </div>
  );
}
