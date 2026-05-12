"use client";

import { Badge } from "@/components/retroui/Badge";
import { Input } from "@/components/retroui/Input";
import { Card } from "@/components/retroui/Card";
import { Button } from "@/components/retroui/Button";
import type { ReactNode } from "react";

type FilterToolbarProps = {
  action?: string;
  onFilter?: (formData: FormData) => void;
  onReset?: () => void;
  searchPlaceholder?: string;
  searchName?: string;
  searchValue?: string;
  showSearch?: boolean;
  showDateRange?: boolean;
  fromValue?: string;
  toValue?: string;
  extraControls?: ReactNode;
  chips?: string[];
};

export function FilterToolbar({
  action,
  onFilter,
  onReset,
  searchPlaceholder = "Search posts, provinces, hashtags...",
  searchName = "q",
  searchValue,
  showSearch = true,
  showDateRange = false,
  fromValue,
  toValue,
  extraControls,
  chips = [],
}: FilterToolbarProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (onFilter) {
      e.preventDefault();
      onFilter(new FormData(e.currentTarget));
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else if (onFilter) {
      const emptyForm = new FormData();
      onFilter(emptyForm);
    } else if (action) {
      window.location.href = action;
    }
  };

  return (
    <Card className="w-full">
      <Card.Content className="space-y-3">
        <form action={action} method="GET" onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
          {showSearch ? (
            <Input name={searchName} placeholder={searchPlaceholder} defaultValue={searchValue} />
          ) : null}
          {showDateRange ? (
            <>
              <Input type="date" name="from" defaultValue={fromValue} />
              <Input type="date" name="to" defaultValue={toValue} />
            </>
          ) : null}
          {extraControls}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">Apply</Button>
            {(action || onFilter) ? (
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            ) : null}
          </div>
        </form>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Badge key={chip} variant="outline" size="sm">
              {chip}
            </Badge>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
