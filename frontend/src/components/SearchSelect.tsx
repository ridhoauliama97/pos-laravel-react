import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, X, Check } from "./icons";

interface SearchSelectProps {
  options: Record<string, any>[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  valueKey?: string;
  labelKey?: string;
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Pilih\u2026",
  label,
  required = false,
  valueKey = "id",
  labelKey = "name",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = options.find((o) => String(o[valueKey]) === String(value));

  const filtered = useMemo(
    () =>
      query
        ? options.filter((o) =>
            String(o[labelKey]).toLowerCase().includes(query.toLowerCase()),
          )
        : options,
    [options, query, labelKey],
  );

  useEffect(() => {
    if (open) {
      setHighlightIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectOption = (opt: Record<string, any>) => {
    onChange(String(opt[valueKey]));
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) {
          selectOption(filtered[highlightIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  const displayLabel = selected ? String(selected[labelKey]) : "";

  return (
    <div className="form-group" ref={containerRef} style={{ position: "relative" }}>
      {label && <label className="form-label">{label}{required ? " *" : ""}</label>}
      <div
        className="form-input"
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".5rem",
          cursor: "text",
          padding: ".5625rem .75rem",
          overflow: "visible",
          position: "relative",
        }}
        onClick={() => setOpen(true)}
      >
        <Search
          className="w-4 h-4"
          style={{
            color: "var(--text-muted)",
            flexShrink: 0,
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : displayLabel}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={open ? query : displayLabel || placeholder}
          style={{
            border: "none",
            background: "transparent",
            padding: "0",
            boxShadow: "none",
            outline: "none",
            flex: 1,
            minWidth: 0,
            fontSize: "inherit",
            color: "inherit",
            width: "100%",
          }}
        />
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setQuery("");
            }}
            aria-label="Clear selection"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: ".125rem",
              flexShrink: 0,
              display: "flex",
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown
            className="w-4 h-4"
            style={{
              color: "var(--text-muted)",
              flexShrink: 0,
              transition: "transform .15s",
              transform: open ? "rotate(180deg)" : "",
            }}
          />
        )}
      </div>
      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: ".5rem",
            boxShadow: "var(--shadow-md)",
            marginTop: ".25rem",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: ".75rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: ".8125rem",
              }}
            >
              Tidak ada hasil
            </div>
          ) : (
            filtered.map((opt, i) => {
              const isSelected = String(value) === String(opt[valueKey]);
              const isHighlighted = i === highlightIndex;
              return (
                <div
                  key={opt[valueKey]}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  style={{
                    padding: ".5rem .75rem",
                    cursor: "pointer",
                    fontSize: ".875rem",
                    color: isSelected ? "var(--accent)" : "var(--text-primary)",
                    background: isHighlighted
                      ? "var(--bg-hover)"
                      : isSelected
                        ? "var(--accent-light)"
                        : "transparent",
                    fontWeight: isSelected ? 600 : 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "background .1s",
                  }}
                >
                  {opt[labelKey]}
                  {isSelected && (
                    <Check className="w-4 h-4" style={{ color: "var(--accent)", flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
