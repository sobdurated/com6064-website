import { Table } from "@/components/retroui/Table";

type DataTableProps = {
  headers: string[];
  rows: string[][];
  caption?: string;
  className?: string;
};

export function DataTable({ headers, rows, caption, className }: DataTableProps) {
  return (
    <Table className={className}>
      {caption ? <Table.Caption>{caption}</Table.Caption> : null}
      <Table.Header>
        <Table.Row>
          {headers.map((header) => (
            <Table.Head key={header}>{header}</Table.Head>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row, rowIndex) => (
          <Table.Row key={rowIndex}>
            {row.map((cell, colIndex) => (
              <Table.Cell key={`${rowIndex}-${colIndex}`}>{cell}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
