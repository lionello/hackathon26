"use client";

import type { ComponentPropsWithoutRef, KeyboardEvent } from "react";

export function SubmitOnEnterInput(props: ComponentPropsWithoutRef<"input">) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return <input {...props} onKeyDown={handleKeyDown} />;
}
